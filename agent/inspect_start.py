
import inspect
from livekit import agents
from livekit.agents import voice

print(f"LiveKit Agents Version: {agents.__version__}")

print("\n=== AgentSession.start Signature ===")
try:
    print(inspect.signature(voice.AgentSession.start))
except Exception as e:
    print(f"Error: {e}")

print("\n=== RoomInputOptions ===")
try:
    from livekit.agents import RoomInputOptions
    print("RoomInputOptions found in livekit.agents")
    print(inspect.signature(RoomInputOptions))
except ImportError:
    print("RoomInputOptions NOT found in livekit.agents")

