from livekit.plugins import google
print(dir(google))
try:
    print(google.beta.GeminiRealtimePlugin)
    print("GeminiRealtimePlugin found")
except AttributeError:
    print("GeminiRealtimePlugin not found")
