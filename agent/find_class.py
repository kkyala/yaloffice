import livekit.agents
import os

root = os.path.dirname(livekit.agents.__file__)
print(f"Searching in {root}")

for dirpath, dirnames, filenames in os.walk(root):
    for filename in filenames:
        if filename.endswith(".py"):
            path = os.path.join(dirpath, filename)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    if "class MultimodalAgent" in content:
                        print(f"Found MultimodalAgent in {path}")
            except Exception as e:
                pass
