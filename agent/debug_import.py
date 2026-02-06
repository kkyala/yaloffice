import sys
import livekit.agents.llm

print("Searching for Choice class...")

try:
    from livekit.agents.llm import Choice
    print("SUCCESS: from livekit.agents.llm import Choice")
except ImportError as e:
    print(f"FAIL: from livekit.agents.llm import Choice ({e})")

try:
    from livekit.agents.llm.llm import Choice
    print("SUCCESS: from livekit.agents.llm.llm import Choice")
except ImportError as e:
    print(f"FAIL: from livekit.agents.llm.llm import Choice ({e})")

try:
    choice_cls = getattr(livekit.agents.llm.llm, 'Choice', None)
    if choice_cls:
         print("SUCCESS: getattr(livekit.agents.llm.llm, 'Choice')")
    else:
         print("FAIL: getattr(livekit.agents.llm.llm, 'Choice') is None")
except Exception as e:
    print(f"FAIL: accessing livekit.agents.llm.llm ({e})")

# Check what ChatChunk expects
try:
    from livekit.agents.llm import ChatChunk
    import inspect
    print("ChatChunk signature:", inspect.signature(ChatChunk))
except Exception as e:
    print(f"FAIL: inspecting ChatChunk ({e})")
