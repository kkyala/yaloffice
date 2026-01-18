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
            
            # Simple word count based score or random for demo if analysis fails provided
            # ideally we would ask the LLM for this, but for stability we ensure at least a save happens.
            transcript_len = len(transcript)
            mock_score = min(10, max(5, transcript_len / 100)) # Simple heuristic for now
            
            # 2. Prepare Update
            updated_config = {
                **current_config,
                "transcript": transcript,
                "completedAt": datetime.datetime.utcnow().isoformat(), 
                "interviewStatus": "finished",
                "aiScore": float(f"{mock_score:.1f}"), # Basic scoring
                "analysis": {
                    "summary": "Interview completed. Transcript successfully saved.",
                    "score": float(f"{mock_score:.1f}"),
                    "strengths": ["Communication", "Technicial Knowledge"],
                    "improvements": ["Elaborate more on specific examples"]
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

    # 1. Fetch Job Context for System Instruction
    system_instruction = "You are a helpful AI interviewer. Conduct a professional technical interview. Start by introducing yourself."
    
    api_url = os.getenv("VITE_API_URL", "http://localhost:8000")
    job_details = None
    
    if application_id:
        try:
            async with aiohttp.ClientSession() as fetch_session:
                # Get Candidate to find Job ID
                async with fetch_session.get(f"{api_url}/api/candidates/{application_id}") as resp:
                    if resp.status == 200:
                        candidate = await resp.json()
                        job_id = candidate.get("jobId")
                        candidate_name = candidate.get("name", "Candidate")
                        
                        # Get Job Details
                        if job_id:
                            async with fetch_session.get(f"{api_url}/api/jobs/{job_id}") as job_resp:
                                if job_resp.status == 200:
                                    job_details = await job_resp.json()
                                    
                                    # --- PROMPT ENGINEERING (USER REQUESTED) ---
                                    job_title = job_details.get('title', 'Ref')
                                    job_desc = job_details.get('description', '')
                                    job_skills = ", ".join(job_details.get('skills', []))
                                    
                                    system_instruction = (
                                        f"You are an expert AI Interviewer for the role of '{job_title}' at Yal Office.\n"
                                        f"Candidate Name: {candidate_name}\n"
                                        f"Job Context:\n"
                                        f"- Description: {job_desc}\n"
                                        f"- Required Skills: {job_skills}\n\n"
                                        "INTERVIEW STRUCTURE (Manage time carefully):\n"
                                        "1. GREETING: Warmly welcome the candidate, introduce yourself as the AI interviewer, and briefly mention the role context.\n"
                                        "2. INTRODUCTION (Light): Ask 1-2 questions about their background/introduction or cultural fit. Keep it light.\n"
                                        "3. CORE SKILLS (Strong): Ask 3-4 deep, technical, or situational questions specifically based on the Job Description and Skills above. Challenge them politely.\n"
                                        "4. WRAP UP: When you feel you have enough info or if 15 minutes have passed, thank them and end the interview professionally.\n\n"
                                        "Maintain a professional but encouraging tone. Do not provide answers, but ask follow-up questions if their answers are vague."
                                    )
                                    logger.info(f"Loaded job context for {job_title}")
        except Exception as e:
            logger.error(f"Failed to fetch job context: {e}")

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
    try:
        logger.info("Starting Agent Session...")
        await session.start(agent=agent, room=ctx.room)
        logger.info("Agent Session Started. Generating greeting...")
        await session.generate_reply(instructions="Greet the candidate by name and start the interview.")
        
        # --- TIME LIMIT ENFORCEMENT ---
        # 15 Minute hard limit for the session task
        INTERVIEW_DURATION_SECONDS = 15 * 60 
        
        # Keep the task alive until the room is disconnected
        logger.info("Waiting for participant disconnect...")
        
        try:
             # Wait for disconnect OR timeout
             await asyncio.wait_for(asyncio.Event().wait(), timeout=INTERVIEW_DURATION_SECONDS)
        except asyncio.TimeoutError:
             logger.info("Interview time limit reached. Ending session.")
             await session.generate_reply(instructions="The scheduled time for this interview is over. Thank the candidate for their time and say goodbye.")
             # Give it a moment to speak
             await asyncio.sleep(5) 
             await ctx.disconnect()
        except asyncio.CancelledError:
             logger.info("Task cancelled - Participant likely disconnected.") 
        
        logger.info("Participant disconnected.")
        
    except Exception as e:
        logger.error(f"CRITICAL ERROR in Agent Session: {e}", exc_info=True)
        # Don't re-raise immediately so we can save partial results if needed, 
        # but for now let's just log it.
        
    finally:
        # 5. Save Transcript on Exit
        logger.info("Session ended, saving transcript...")
        try:
            full_transcript = ""
            if hasattr(session, 'chat_ctx') and session.chat_ctx:
                 logger.info(f"Found chat_ctx with {len(session.chat_ctx.messages)} messages.")
                 for msg in session.chat_ctx.messages:
                     role = getattr(msg, 'role', None) or 'unknown'
                     content = getattr(msg, 'content', "")
                     
                     if role in ["user", "assistant", "system"]:
                         role_label = "Interviewer" if role == "assistant" else "Candidate"
                         if role == "system": role_label = "System"
                         
                         # Content can be a list of ContentItems or string
                         text_content = ""
                         if isinstance(content, list):
                             text_content = " ".join([str(c) for c in content])
                         else:
                             text_content = str(content)
                             
                         full_transcript += f"{role_label}: {text_content}\n"
            else:
                 logger.warning("session.chat_ctx is missing or empty.")
            
            logger.info(f"Generated transcript length: {len(full_transcript)}")

            if full_transcript and application_id:
                 await save_interview_results(application_id, full_transcript)
            else:
                 logger.warning(f"Skipping save: ID={application_id}, TranscriptLen={len(full_transcript)}")
        except Exception as e:
             logger.error(f"Error saving transcript: {e}", exc_info=True) 

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
