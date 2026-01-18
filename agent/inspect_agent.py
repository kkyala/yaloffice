
import inspect
from livekit.agents import voice, RoomInputOptions

print("=== AgentSession Init Signature ===")
try:
    print(inspect.signature(voice.AgentSession.__init__))
except Exception as e:
    print(f"Error inspecting AgentSession: {e}")

print("\n=== AgentSession Help ===")
# print(help(voice.AgentSession)) # Too verbose, skip

print("\n=== VoicePipelineAgent Check ===")
if hasattr(voice, 'VoicePipelineAgent'):
    print("VoicePipelineAgent exists.")
    print(inspect.signature(voice.VoicePipelineAgent.__init__))
else:
    print("VoicePipelineAgent NOT found.")
