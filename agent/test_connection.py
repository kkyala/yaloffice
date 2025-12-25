import asyncio
import os
import logging
from livekit.agents import JobContext, WorkerOptions, cli, JobRequest
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test-connection")

async def entrypoint(ctx: JobContext):
    logger.info(f"Successfully connected to job in room: {ctx.room.name}")
    
    await ctx.connect()
    logger.info("Connected to room")
    
    participant = await ctx.wait_for_participant()
    logger.info(f"Participant joined: {participant.identity}")
    
    logger.info("Test successful! Closing in 3 seconds...")
    await asyncio.sleep(3)
    
def prewarm(proc: JobRequest):
    proc.userdata["test"] = True

if __name__ == "__main__":
    # Ensure URL is correct
    url = os.getenv("LIVEKIT_URL")
    logger.info(f"Starting worker connecting to: {url}")
    
    if not url:
        logger.error("LIVEKIT_URL is not set in .env")
        exit(1)

    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))
