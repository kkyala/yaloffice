
from livekit.agents import voice, pipeline
import inspect

print("=== Checking Pipeline ===")
if hasattr(pipeline, 'VoicePipelineAgent'):
    print("VoicePipelineAgent FOUND in livekit.agents.pipeline")
else:
    print("VoicePipelineAgent NOT found in pipeline")

print("\n=== AgentSession Attributes ===")
try:
    s = voice.AgentSession(vad=None, stt=None, llm=None, tts=None) # Mock args
    print("Attributes:", dir(s))
    if hasattr(s, 'room_input'):
        print("s.room_input type:", type(s.room_input))
        print("s.room_input attrs:", dir(s.room_input))
    
    if hasattr(s, '_room_input'):
        print("s._room_input found")

except Exception as e:
    print(f"Error instantiating: {e}")
