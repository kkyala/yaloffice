import logging
import os
import json
import asyncio
import aiohttp
import datetime 
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import deepgram, openai, google, silero

load_dotenv()
logger = logging.getLogger("gemini-interviewer")

class Interviewer(Agent):
    def __init__(self, system_instruction: str):
        super().__init__(
            instructions=system_instruction
        )
        # Mock Job Database
        self.jobs = [
            {"id": "j1", "title": "Senior Software Engineer", "location": "Remote", "skills": ["React", "Node.js", "TypeScript"]},
            {"id": "j2", "title": "Product Manager", "location": "New York", "skills": ["Agile", "Roadmapping", "Communication"]},
            {"id": "j3", "title": "Data Scientist", "location": "San Francisco", "skills": ["Python", "Machine Learning", "SQL"]},
        ]

    @llm.function_tool
    async def search_jobs(self, query: str):
        """Search for available job positions based on skills or title.
        
        Args:
            query: The job title or skill to search for.
        """
        logger.info(f"Searching jobs for: {query}")
        query = query.lower()
        matches = []
        for job in self.jobs:
            if query in job['title'].lower() or any(query in s.lower() for s in job['skills']):
                matches.append(job)
        
        if not matches:
            return "I couldn't find any specific jobs matching that description, but we are always looking for talented individuals."
        
        return f"I found {len(matches)} relevant positions: " + ", ".join([f"{j['title']} ({j['location']})" for j in matches])

async def save_interview_results(application_id: str, transcript: str):
    """Saves the interview transcript and status to the backend."""
    if not application_id:
        logger.warning("No application ID found, cannot save results.")
        return

    api_url = os.getenv("VITE_API_URL", "http://localhost:8000") # Backend URL
    candidate_url = f"{api_url}/api/candidates/{application_id}"
    
    logger.info(f"Saving interview results for {application_id} to {candidate_url}")

    async with aiohttp.ClientSession() as session:
        try:
            # 1. Fetch existing candidate to preserve config
            async with session.get(candidate_url) as resp:
                if resp.status != 200:
                    logger.error(f"Failed to fetch candidate: {resp.status} {await resp.text()}")
                    return
                candidate = await resp.json()

            current_config = candidate.get("interview_config", {})
            
            # 2. Prepare Update
            updated_config = {
                **current_config,
                "transcript": transcript,
                "completedAt": datetime.datetime.utcnow().isoformat(), 
                "interviewStatus": "finished",
                "aiScore": 8.5, # Mock score
                "analysis": {
                    "summary": "Interview completed via AI Voice Agent.",
                    "score": 8.5
                }
            }

            # 3. Send Update
            async with session.put(candidate_url, json={"interview_config": updated_config}) as resp:
                if resp.status == 200:
                    logger.info("Successfully saved interview results.")
                else:
                    logger.error(f"Failed to save results: {resp.status} {await resp.text()}")

        except Exception as e:
            logger.error(f"Error saving interview results: {e}")

async def entrypoint(ctx: JobContext):
    logger.info(f"connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Parse Application ID from Room Name (format: interview-{id})
    application_id = None
    try:
        if "interview-" in ctx.room.name:
            parts = ctx.room.name.split("-")
            for part in parts:
                if part.isdigit():
                    application_id = part
                    break 
    except Exception as e:
        logger.warning(f"Failed to parse application ID from room name: {e}")

    participant = await ctx.wait_for_participant()
    logger.info(f"starting voice assistant for participant {participant.identity}")

    # 1. Load System Instruction
    system_instruction = "You are a helpful AI interviewer. Conduct a professional technical interview. Start by introducing yourself."
    if participant.metadata:
        try:
            metadata = json.loads(participant.metadata)
            if "systemInstruction" in metadata:
                system_instruction = metadata["systemInstruction"]
        except Exception as e:
            logger.warning(f"Failed to parse metadata: {e}")

    # 2. Check Keys & Configure Plugins
    # STT
    if os.getenv("DEEPGRAM_API_KEY"):
        logger.info("Using Deepgram for STT")
        stt_provider = deepgram.STT()
    else:
        logger.warning("DEEPGRAM_API_KEY not found, falling back to Google STT")
        stt_provider = google.STT()

    # TTS
    if os.getenv("DEEPGRAM_API_KEY"):
        logger.info("Using Deepgram for TTS")
        tts_provider = deepgram.TTS()
    elif os.getenv("OPENAI_API_KEY"):
        logger.info("Using OpenAI for TTS")
        tts_provider = openai.TTS()
    else:
        logger.warning("No TTS key found, falling back to Google TTS")
        tts_provider = google.TTS()

    # LLM
    if os.getenv("GOOGLE_API_KEY"):
        logger.info("Using Google Gemini for LLM")
        llm_provider = google.LLM(model="gemini-2.0-flash-exp")
    elif os.getenv("OPENAI_API_KEY"):
        logger.info("Using OpenAI for LLM")
        llm_provider = openai.LLM(model="gpt-4o")
    else:
        logger.error("CRITICAL: No LLM API Key found!")
        return

    # 3. Initialize Session
    session = AgentSession(
        vad=silero.VAD.load(),
        stt=stt_provider,
        llm=llm_provider,
        tts=tts_provider,
    )

    agent = Interviewer(system_instruction)
    
    # 4. Run Session
    # 4. Run Session
    try:
        logger.info("Starting Agent Session...")
        await session.start(agent=agent, room=ctx.room)
        logger.info("Agent Session Started. Generating greeting...")
        await session.generate_reply(instructions="Greet the candidate by name and start the interview.")
        
        # Keep the task alive until the room is disconnected
        logger.info("Waiting for participant disconnect...")
        await ctx.wait_for_participant_disconnect() 
        logger.info("Participant disconnected.")
        
    except Exception as e:
        logger.error(f"CRITICAL ERROR in Agent Session: {e}", exc_info=True)
        # Don't re-raise immediately so we can save partial results if needed, 
        # but for now let's just log it.
        
    finally:
        # 5. Save Transcript on Exit
        logger.info("Session ended, saving transcript...")
        
        # Extract transcript from session history
        full_transcript = ""
        try:
            if hasattr(session, 'chat_ctx') and session.chat_ctx:
                 for msg in session.chat_ctx.messages:
                     # Check logic for message role - assuming simple enum or string
                     # livekit agents usually use "user" and "assistant"
                     role = getattr(msg, 'role', None) or 'unknown'
                     if role in ["user", "assistant"]:
                         role_label = "Interviewer" if role == "assistant" else "Candidate"
                         content = getattr(msg, 'content', "")
                         full_transcript += f"{role_label}: {content}\n"
            
            if full_transcript and application_id:
                 await save_interview_results(application_id, full_transcript)
            else:
                 logger.warning(f"Skipping save: ID={application_id}, TranscriptLen={len(full_transcript)}")
        except Exception as e:
             logger.error(f"Error saving transcript: {e}") 

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
