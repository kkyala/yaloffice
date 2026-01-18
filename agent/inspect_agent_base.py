
import inspect
from livekit.agents import voice

sig = inspect.signature(voice.Agent.__init__)
print("Parameters for Agent.__init__:")
for name, param in sig.parameters.items():
    print(f"- {name}")
