import logging
import os
import json
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

async def entrypoint(ctx: JobContext):
    logger.info(f"connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    participant = await ctx.wait_for_participant()
    logger.info(f"starting voice assistant for participant {participant.identity}")

    # 1. Load System Instruction
    system_instruction = "You are a helpful AI interviewer. Conduct a professional technical interview."
    if participant.metadata:
        try:
            metadata = json.loads(participant.metadata)
            if "systemInstruction" in metadata:
                system_instruction = metadata["systemInstruction"]
        except Exception as e:
            logger.warning(f"Failed to parse metadata: {e}")

    # 2. Check Keys & Configure Plugins
    # STT: Deepgram is preferred for speed/reliability
    if os.getenv("DEEPGRAM_API_KEY"):
        logger.info("Using Deepgram for STT")
        stt_provider = deepgram.STT()
    else:
        logger.warning("DEEPGRAM_API_KEY not found, falling back to Google STT")
        stt_provider = google.STT()

    # TTS: Deepgram is preferred for speed, OpenAI for quality. 
    # Using Deepgram for now to ensure low latency and avoid potential OpenAI rate limits/issues.
    if os.getenv("DEEPGRAM_API_KEY"):
        logger.info("Using Deepgram for TTS")
        tts_provider = deepgram.TTS()
    elif os.getenv("OPENAI_API_KEY"):
        logger.info("Using OpenAI for TTS")
        tts_provider = openai.TTS()
    else:
        logger.warning("No TTS key found, falling back to Google TTS")
        tts_provider = google.TTS()

    # LLM: Prefer Google Gemini (Free Tier available) over OpenAI (Paid) to avoid quota issues
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
    
    # Start the agent
    # Note: Removed 'participant' arg as it caused issues in previous versions
    await session.start(agent=agent, room=ctx.room)
    
    await session.generate_reply(instructions="Greet the candidate by name and start the interview.")

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
