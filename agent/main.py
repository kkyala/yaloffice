import logging
import os
import asyncio
import aiohttp
import datetime
from dotenv import load_dotenv

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit import rtc
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import deepgram, silero, openai
from livekit.agents.llm import ChatRole

# Load environment variables (try local .env, then backend .env)
import pathlib
current_dir = pathlib.Path(__file__).parent.absolute()
backend_env = current_dir.parent / "backend" / ".env"

if os.path.exists(".env"):
    load_dotenv(".env")
    print(f"Loaded .env from {current_dir}")
elif os.path.exists(backend_env):
    load_dotenv(backend_env)
    print(f"Loaded .env from {backend_env}")
else:
    print("Warning: No .env file found!")

logger = logging.getLogger("yaloffice-interviewer")
logging.basicConfig(level=logging.INFO)

# Debug: Show connection info
lk_url = os.getenv("LIVEKIT_URL")
lk_cloud = os.getenv("LIVEKIT_CLOUD_URL")
print(f"--------------------------------------------------")
print(f"LIVEKIT_URL (Local): {lk_url}")
print(f"LIVEKIT_CLOUD_URL:   {lk_cloud}")
print(f"--------------------------------------------------")



# =========================
# Interviewer Agent
# =========================
class Interviewer(Agent):
    def __init__(self, system_instruction: str):
        super().__init__(instructions=system_instruction)

        self.jobs = [
            {"id": "j1", "title": "Senior Software Engineer", "location": "Remote", "skills": ["React", "Node.js", "TypeScript"]},
            {"id": "j2", "title": "Product Manager", "location": "New York", "skills": ["Agile", "Roadmapping", "Communication"]},
            {"id": "j3", "title": "Data Scientist", "location": "San Francisco", "skills": ["Python", "Machine Learning", "SQL"]},
        ]

    @llm.function_tool
    async def search_jobs(self, query: str):
        query = query.lower()
        matches = [
            j for j in self.jobs
            if query in j["title"].lower()
            or any(query in s.lower() for s in j["skills"])
        ]

        if not matches:
            return "No matching jobs found at the moment."

        return "Relevant roles: " + ", ".join(
            f"{j['title']} ({j['location']})" for j in matches
        )


# =========================
# Backend helpers
# =========================
async def save_interview_results(application_id: str, transcript: str):
    api_url = os.getenv("VITE_API_URL", "http://localhost:8000")
    candidate_url = f"{api_url}/api/candidates/{application_id}"

    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(candidate_url) as resp:
                if resp.status != 200:
                    logger.error(f"Failed to fetch candidate: {resp.status}")
                    return
                candidate = await resp.json()

            updated_config = {
                **candidate.get("interview_config", {}),
                "transcript": transcript,
                "completedAt": datetime.datetime.utcnow().isoformat(),
                "interviewStatus": "finished",
            }

            async with session.put(
                candidate_url, json={"interview_config": updated_config}
            ) as resp:
                if resp.status == 200:
                    logger.info("Interview results saved")
        except Exception as e:
            logger.error(f"Error saving results: {e}")


async def save_phone_screen_results(session_id: str, transcript: str):
    api_url = os.getenv("VITE_API_URL", "http://localhost:8000")
    stop_url = f"{api_url}/api/interview/stop"

    async with aiohttp.ClientSession() as session:
        try:
            await session.post(stop_url, json={
                "sessionId": session_id,
                "transcript": transcript
            })
        except Exception as e:
            logger.error(f"Error saving phone screen results: {e}")


async def fetch_interview_context(application_id=None, session_id=None):
    api_url = os.getenv("VITE_API_URL", "http://localhost:8000")
    context = {
        "candidate_name": "Candidate",
        "job_title": "General Position",
        "job_description": "General interview",
        "type": "Technical Interview" if application_id else "Phone Screening"
    }

    try:
        async with aiohttp.ClientSession() as session:
            if application_id:
                async with session.get(f"{api_url}/api/candidates/{application_id}") as resp:
                    if resp.status == 200:
                        cand = await resp.json()
                        context["candidate_name"] = cand.get("name", "Candidate")
                        # Resume extraction if available in candidate object
                        context["resume_text"] = cand.get("interview_config", {}).get("resume_text", "")
                        job_id = cand.get("jobId")

                        if job_id:
                            async with session.get(f"{api_url}/api/jobs/{job_id}") as jresp:
                                if jresp.status == 200:
                                    job = await jresp.json()
                                    context["job_title"] = job.get("title", context["job_title"])
                                    context["job_description"] = job.get("description", context["job_description"])
            elif session_id:
                async with session.get(f"{api_url}/api/interview/context/{session_id}") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        context["candidate_name"] = data.get("candidateName", "Candidate")
                        context["job_title"] = data.get("jobTitle", "Phone Screening")
                        context["resume_text"] = data.get("resumeText", "")
                        # fetch job desc if needed, assuming generic for now or passed in context
            
    except Exception as e:
        logger.error(f"Error fetching context: {e}")

    return context



# =========================
# Entry Point
# =========================
async def entrypoint(ctx: JobContext):
    # Connect with auto-subscribe to audio only - LiveKit handles codec negotiation automatically
    await ctx.connect(
        auto_subscribe=AutoSubscribe.AUDIO_ONLY
    )

    # Robust Room ID Parsing
    room = ctx.room.name
    application_id = None
    session_id = None

    if "interview-" in room:
        parts = room.split("-")
        for part in parts:
            if part.isdigit():
                application_id = part
                break
    elif "phone-screen-" in room:
        session_id = room.replace("phone-screen-", "")

    context = await fetch_interview_context(application_id, session_id)

    # Check for existing participants or wait briefly (SIP participant might already be connected)
    try:
        # Give it 5 seconds to wait for participant if room is empty
        participant = await asyncio.wait_for(ctx.wait_for_participant(), timeout=5.0)
        logger.info(f"Participant joined: {participant.identity}")
    except asyncio.TimeoutError:
        # Check if there are already participants in the room (common for phone screening)
        if len(ctx.room.remote_participants) > 0:
            participant = list(ctx.room.remote_participants.values())[0]
            logger.info(f"Found existing participant: {participant.identity}")
        else:
            logger.warning("No participant found after 5 seconds, continuing anyway...")
            participant = None  # Continue without participant - they might join later

    # Generate Technical Questions based on context and resume
    tech_questions = []
    
    resume_excerpt = context.get("resume_text", "")[:2000] # Limit context size
    
    if resume_excerpt:
        logger.info("Generating questions based on resume...")
        # Simple generation prompt could use the LLM helper if available, or just hardcode for brevity + dynamic injection
        # check if we can generate dynamically here? 
        # For simplicity, we'll append a resume-specific question to standard ones
        try:
             # We can't easily call LLM here without initializing it, so we'll init earlier or just use a placeholder mechanism
             # But the user wants "screening based on the resume".
             # It's better to let the System Prompt handle it by feeding the resume.
             pass
        except:
             pass
    
    tech_questions = [
        f"Can you explain your experience with {context['job_title']} roles?",
        "What has been your most challenging technical project?",
        "How do you handle debugging complex systems?",
    ]
    
    # If resume is present, the System Prompt will be updated to instruct the AI to ask questions based on it.
    
    questions_text = "\n".join([f"{i+1}. {q}" for i, q in enumerate(tech_questions)])

    resume_context_str = ""
    if resume_excerpt:
        resume_context_str = f"\nCANDIDATE RESUME:\n{resume_excerpt}\n\nINSTRUCTION: Ask questions relevant to the projects and skills mentioned in the resume ABOVE, in addition to standard technical questions."

    system_instruction = f"""
You are a professional AI interviewer at YalOffice named Yal.
You are interviewing {context['candidate_name']} for the position of {context['job_title']}.
Job Description Summary: {context['job_description']}
{resume_context_str}

CRITICAL - YOU MUST SPEAK FIRST:
This is an OUTBOUND PHONE CALL. YOU called the candidate.
DO NOT wait for them to say hello. As your VERY FIRST action, immediately greet:
"Hello {context['candidate_name']}, I am Yal, AI recruiter from YalOffice. Thank you for taking this call. Are you ready to begin?"

Then ask the first question right away.

INTERVIEW PROTOCOL:
- Ask questions ONE at a time
- Wait for the candidate to answer before moving to next question
- Keep responses brief and professional
- Acknowledge answers briefly: "I see", "Good", "Interesting"
- Do NOT repeat or summarize - move to next question immediately

QUESTIONS TO ASK:
If a resume is provided, ask about specific projects, skills, or experiences from the resume.
Otherwise, use these standard questions:
{questions_text}

TIMING:
- After 5 questions or 7 minutes, wrap up
- Say: "Thank you for your time. We'll be in touch soon. Goodbye."
- Keep the entire interview under 10 minutes

Be professional, concise, and natural.
"""

    # Fetch config from backend
    try:
        async with aiohttp.ClientSession() as http_session:
            async with http_session.get('http://localhost:8000/api/admin/agent-config') as resp:
                if resp.status == 200:
                    remote_config = await resp.json()
                    for k, v in remote_config.items():
                        if v:
                            os.environ[k] = str(v)
                    logger.info("Updated agent config from Backend")
    except Exception as e:
        logger.warning(f"Could not fetch backend config: {e}")

    from livekit.plugins import google
    # Initialize Google Gemini
    llm_provider = google.LLM(
        api_key=os.environ.get("GOOGLE_API_KEY"),
        model="gemini-2.0-flash-exp",
        temperature=0.7,
    )

    stt = deepgram.STT(language="en-US")
    tts = deepgram.TTS()
    
    # Use VAD with settings optimized for phone calls
    # Lower thresholds make the agent more responsive  
    vad = silero.VAD.load(
        min_silence_duration=0.5,  # Reduced from 0.8 - faster turn detection
        activation_threshold=0.3,  # Lower threshold - more sensitive to speech
        min_speech_duration=0.2,   # Minimum speech length to process
    )

    # Standard AgentSession - retry logic is handled by LiveKit internally
    session = AgentSession(
        vad=vad,
        stt=stt,
        llm=llm_provider,
        tts=tts,
    )

    agent = Interviewer(system_instruction)

    # Start the session
    logger.info("Starting agent session...")
    session_task = asyncio.create_task(session.start(agent=agent, room=ctx.room))
    
    # Wait briefly for audio channels to initialize
    await asyncio.sleep(1.5)
    
    logger.info("Playing immediate greeting before LLM session...")
    
    # FORCE IMMEDIATE GREETING using TTS directly (bypasses LLM wait-for-user pattern)
    try:
        greeting_text = f"Hello {context['candidate_name']}, I am Yal, your AI recruiter from YalOffice. Thank you for taking this call. Are you ready to begin the interview?"
        
        # Synthesize and play greeting immediately
        greeting_stream = tts.synthesize(greeting_text)
        async for audio_chunk in greeting_stream:
            # Publish audio directly to room
            await ctx.room.local_participant.publish_data(
                audio_chunk.frame.data,
                kind="audio",
            )
        
        logger.info("Immediate greeting played successfully")
    except Exception as e:
        logger.warning(f"Could not play immediate greeting: {e}")
    
    # Now wait for the reactive session to continue
    logger.info("Agent session started successfully.")
    await session_task

    try:
        # Keep session alive for up to 20 minutes
        await asyncio.sleep(20 * 60) 
    except asyncio.CancelledError:
        logger.info("Session cancelled")
    finally:
        logger.info("Closing session...")
        
        # PERSIST TRANSCRIPT
        try:
            # Extract transcript from chat context
            transcript_entries = []
            if hasattr(agent.chat_ctx, 'messages'):
                for msg in agent.chat_ctx.messages:
                    role_str = "AI" if msg.role == ChatRole.ASSISTANT else "Candidate"
                    if msg.role == ChatRole.SYSTEM: continue
                    content = msg.content if isinstance(msg.content, str) else str(msg.content)
                    transcript_entries.append(f"{role_str}: {content}")
            
            full_transcript = "\n".join(transcript_entries)
            logger.info(f"Saving transcript ({len(full_transcript)} chars)...")
            
            if application_id:
                await save_interview_results(application_id, full_transcript)
            elif session_id:
                await save_phone_screen_results(session_id, full_transcript)
                
        except Exception as e:
            logger.error(f"Failed to save transcript: {e}")

        # Session cleanup is handled automatically by LiveKit


if __name__ == "__main__":
    # Check if running in cloud mode (identified by LiveKit Cloud URL)
    # The run_cloud_agent.bat sets LIVEKIT_URL to the cloud endpoint.
    import os
    
    lk_url = os.getenv("LIVEKIT_URL", "").lower()
    is_cloud = "livekit.cloud" in lk_url
    
    worker_options_kwargs = {}
    
    if is_cloud:
        worker_options_kwargs["agent_name"] = "phone_yal_agent"
        print(f"☁️  Running in CLOUD mode (Agent Name: phone_yal_agent)")
    else:
        print(f"💻 Running in LOCAL mode (Default Agent Name)")

    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        **worker_options_kwargs
    ))