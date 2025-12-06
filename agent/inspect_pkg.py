import livekit.agents.voice
import os
print(f"Path: {os.path.dirname(livekit.agents.voice.__file__)}")
print(f"Contents: {os.listdir(os.path.dirname(livekit.agents.voice.__file__))}")
