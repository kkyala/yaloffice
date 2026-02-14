
import os
import asyncio
from dotenv import load_dotenv

# Try importing google.genai or google.generativeai
try:
    import google.genai as genai
    print("Using google.genai package")
    USING_NEW_SDK = True
except ImportError:
    import google.generativeai as genai
    print("Using google.generativeai package (older SDK)")
    USING_NEW_SDK = False

load_dotenv("agent/.env")
api_key = os.getenv("GOOGLE_API_KEY")

async def list_models():
    if USING_NEW_SDK:
        client = genai.Client(api_key=api_key)
        try:
            # According to new SDK docs, models.list returns an async iterator or list
            # It might need 'await' or async verification
            # Let's try standard async iteration first
            async for model in client.aio.models.list(config={"query_base": True}):
                print(f"Model: {model.name}")
        except Exception as e:
            print(f"Error listing (new SDK): {e}")
            try:
                # Fallback: maybe it's not async iterator but returns a list object you await?
                response = await client.aio.models.list(config={"query_base": True})
                for model in response:
                     print(f"Model: {model.name}")
            except Exception as e2:
                 print(f"Error listing fallback (new SDK): {e2}")

    else:
        genai.configure(api_key=api_key)
        try:
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    print(f"Model: {m.name}")
        except Exception as e:
             print(f"Error listing (old SDK): {e}")

if __name__ == "__main__":
    asyncio.run(list_models())
