# AI Interviewer Agent

This agent uses the LiveKit Agents framework and Google Gemini Multimodal Live API to conduct interviews.

## Setup

1.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

2.  Ensure `.env` has the correct keys:
    *   `LIVEKIT_URL`
    *   `LIVEKIT_API_KEY`
    *   `LIVEKIT_API_SECRET`
    *   `GOOGLE_API_KEY`

## Running

To run the agent in development mode (connects to local LiveKit server):

```bash
python main.py dev
```

The agent will wait for a user to join the room and then start the interview.
