
from livekit.agents import voice, RoomInputOptions

try:
    print("Attempt 1: options=")
    s = voice.AgentSession(
        vad=None, stt=None, llm=None, tts=None,
        options=RoomInputOptions(close_on_disconnect=False)
    )
    print("Success: options argument worked")
except TypeError as e:
    print(f"Failed: {e}")

try:
    print("Attempt 2: room_input=")
    s = voice.AgentSession(
        vad=None, stt=None, llm=None, tts=None,
        room_input=RoomInputOptions(close_on_disconnect=False)
    )
    print("Success: room_input argument worked")
except TypeError as e:
    print(f"Failed: {e}")

try:
    print("Attempt 3: room_options=")
    s = voice.AgentSession(
        vad=None, stt=None, llm=None, tts=None,
        room_options=RoomInputOptions(close_on_disconnect=False)
    )
    print("Success: room_options argument worked")
except TypeError as e:
    print(f"Failed: {e}")
