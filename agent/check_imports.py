try:
    from livekit.agents.voice import VoicePipelineAgent
    print("Found in livekit.agents.voice")
except ImportError:
    try:
        from livekit.agents.pipeline import VoicePipelineAgent
        print("Found in livekit.agents.pipeline")
    except ImportError:
        print("Not found")

try:
    from livekit.agents.voice import AgentSession
    print("AgentSession found")
except ImportError:
    print("AgentSession NOT found")
