import logging
import os
import asyncio
import aiohttp
import datetime
from dotenv import load_dotenv

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import deepgram, silero
from livekit.agents import llm as agents_llm
from livekit.agents.llm import ChatContext, ChatRole, ChatChunk, ChoiceDelta

# Compatibility shim for LiveKit Agents 1.3.x where Choice might not be exported directly
try:
    from livekit.agents.llm import Choice
except ImportError:
    try:
        from livekit.agents.llm.llm import Choice
    except ImportError:
        # Last resort fallback if completely hidden but supports duck typing or updated API 
        class Choice:
            def __init__(self, delta, index=0):
                self.delta = delta
                self.index = index

load_dotenv()
logger = logging.getLogger("yaloffice-interviewer")
logging.basicConfig(level=logging.INFO)


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
# Ollama LLM Adapter (FIXED for LiveKit 1.3+)
# =========================
class OllamaStream:
    def __init__(self, llm, chat_ctx: ChatContext):
        self.llm = llm
        self.chat_ctx = chat_ctx

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        pass

    async def __aiter__(self):
        try:


            messages = []

            # ChatContext is iterable (list of messages)
            for msg in self.chat_ctx:
                if msg.role == ChatRole.SYSTEM:
                    continue

                role = "assistant" if msg.role == ChatRole.ASSISTANT else "user"
                # Handle both string content and list content (newer API)
                content = msg.content if isinstance(msg.content, str) else str(msg.content)
                messages.append({"role": role, "content": content})

            payload = {
                "model": self.llm.model, # Use property
                "messages": messages,
                "stream": False,
                "options": {"temperature": 0.7}
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.llm.base_url}/api/chat", json=payload
                ) as resp:
                    if resp.status != 200:
                        logger.error(f"Ollama API Error: {resp.status}")
                        return

                    data = await resp.json()
                    text = data.get("message", {}).get("content", "")

                    if text:
                        yield ChatChunk(
                            choices=[Choice(
                                index=0,
                                delta=ChoiceDelta(
                                    role=ChatRole.ASSISTANT,
                                    content=text
                                )
                            )]
                        )
        except Exception as e:
            logger.exception("LLM inference failed")
            return


# FIX 1: Correct OllamaLLM implementation
class OllamaLLM(agents_llm.LLM):
    def __init__(self, base_url: str, model_name: str):
        super().__init__()
        self.base_url = base_url
        self._model_name = model_name  # ✅ private variable

    @property
    def model(self):
        return self._model_name

    def chat(self, chat_ctx: ChatContext, fnc_ctx=None, *args, **kwargs):
        return OllamaStream(self, chat_ctx)


# =========================
# Entry Point
# =========================
async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

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

    participant = await ctx.wait_for_participant()
    logger.info(f"Participant joined: {participant.identity}")

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
You are a professional AI interviewer at YalOffice.
You are interviewing {context['candidate_name']} for the position of {context['job_title']}.
Job Description Summary: {context['job_description']}
{resume_context_str}

INTERVIEW PROTOCOL:
You must ask questions one by one. Do not ask multiple questions at once.
Wait for the candidate to answer before moving to the next question.

If a resume is provided, prioritize asking about specific projects, skills, or experiences listed in the resume.
Otherwise, use the following standard questions as a guide:
{questions_text}

Rules:
- Greet the candidate professionally first.
- Ask the first question.
- Listen to the answer, acknowledge it briefly (e.g., "I see", "That's interesting"), then ask the next question.
- Dig deeper if the answer is vague.
- After 5-7 minutes or 5 questions, finalize the interview.
- Thank the candidate and say goodbye.
- Be polite and concise.
"""

    # Use environment variable for Ollama URL, default to docker internal name
    ollama_url = os.getenv("INTERVIEW_AI_URL", "http://ollama-gemma:11434")
    
    # Update usage: use model_name
    llm_provider = OllamaLLM(
        base_url=ollama_url,
        model_name="gemma2:9b-instruct-q8_0" 
    )

    if not os.getenv("DEEPGRAM_API_KEY"):
        logger.error("DEEPGRAM_API_KEY not found. Agent will fail.")
        return

    stt = deepgram.STT(language="en-US")
    tts = deepgram.TTS()
    vad = silero.VAD.load()

    session = AgentSession(
        vad=vad,
        stt=stt,
        llm=llm_provider,
        tts=tts,
    )

    agent = Interviewer(system_instruction)

    # FIX 2: Explicitly send opening audio
    await session.start(agent=agent, room=ctx.room)
    
    # Give LiveKit + TTS time to fully attach
    await asyncio.sleep(2.0)

    # FORCE audio output - greeting
    try:
        logger.info("FORCING GREETING AUDIO")
        greeting_text = f"Hello {context['candidate_name']}, I am Yal, your AI interviewer. Shall we begin?"
        
        if hasattr(session, 'say'):
            await session.say(greeting_text)
        else:
            logger.warning("session.say() method not found. Attempting fallback.")
            await session.generate_reply(instructions=f"Say exactly: {greeting_text}")

        # 🔥 ASK FIRST QUESTION IMMEDIATELY
        await asyncio.sleep(0.5)  # Brief pause for natural pacing
        
        first_question = tech_questions[0]
        logger.info(f"Asking first question: {first_question}")
        
        if hasattr(session, 'say'):
            await session.say(first_question)
        else:
            await session.generate_reply(instructions=f"Say exactly: {first_question}")

    except Exception as e:
        logger.error(f"Error during greeting/first question: {e}")

    try:
        await asyncio.sleep(20 * 60) 
    except asyncio.CancelledError:
        logger.info("Session cancelled")
    finally:
        logger.info("Closing session...")
        
        # PERSIST TRANSCRIPT
        try:
            # Extract transcript from chat context
            transcript_entries = []
            if agent.chat_ctx:
                for msg in agent.chat_ctx:
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

        await ctx.disconnect()


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))