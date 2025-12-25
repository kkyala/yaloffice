import asyncio
import os
import logging
from livekit import rtc, api
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s: %(message)s')
logger = logging.getLogger("verify-audio")

LIVEKIT_URL = os.getenv("LIVEKIT_URL", "ws://127.0.0.1:7880")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "devkey")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "7b783c52a32944b2b1d4e76f59cb03ea")

EXIT_EVENT = asyncio.Event()

async def main():
    room = rtc.Room()

    @room.on("track_subscribed")
    def on_track_subscribed(track, publication, participant):
        logger.info(f"✅ Track Subscribed: {track.kind} from {participant.identity} ({participant.kind})")
        if track.kind == rtc.TrackKind.KIND_AUDIO:
             logger.info("🎉 SUCCESS: Received AUDIO track from Agent! Setup is working.")
             EXIT_EVENT.set()

    @room.on("participant_connected")
    def on_participant_connected(participant):
        logger.info(f"Participant Connected: {participant.identity}")

    # Connect to room "interview-999" (Test Room)
    room_name = "interview-999"
    token = (
        api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity("TestCandidate")
        .with_name("Test Candidate")
        .with_grants(api.VideoGrants(room_join=True, room=room_name))
        .to_jwt()
    )

    logger.info(f"Connecting to {LIVEKIT_URL} room: {room_name}")
    try:
        await room.connect(LIVEKIT_URL, token)
        logger.info("Connected to room.")
    except Exception as e:
        logger.error(f"Failed to connect: {e}")
        return

    # Wait for the agent to join and send audio
    logger.info("Waiting for Agent to ensure audio track...")
    
    # Timeout after 20 seconds
    try:
        await asyncio.wait_for(EXIT_EVENT.wait(), timeout=20)
    except asyncio.TimeoutError:
         logger.error("❌ TIMEOUT: Did not receive audio track from agent within 20s.")
    
    await room.disconnect()
    logger.info("Disconnected.")

if __name__ == "__main__":
    asyncio.run(main())
