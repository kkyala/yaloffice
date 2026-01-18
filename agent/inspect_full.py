
import inspect
from livekit.agents import voice

sig = inspect.signature(voice.AgentSession.__init__)
print("Parameters:")
for name, param in sig.parameters.items():
    print(f"- {name}: {param.annotation}")
