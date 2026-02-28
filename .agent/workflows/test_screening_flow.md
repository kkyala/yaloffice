---
description: Testing the Job-Specific AI Screening Workflow
---

# Testing the AI Screening Workflow

1.  **Preparation**:
    *   Ensure the backend server is running (`npm run server` or your backend command).
    *   Ensure the LiveKit server is accessible (default `ws://127.0.0.1:7880`).
    *   Ensure you have a candidate profile created.

2.  **Navigation**:
    *   Log in as a **Candidate**.
    *   Navigate to the **Jobs** page.
    *   Click "Apply" on a job (e.g., "Senior Software Engineer").
    *   The "AI Screening" button should appear on the application success screen or in the "My Applications" list.

3.  **Execute Screening**:
    *   Click "Start Screening".
    *   Verify the **"Ready"** screen loads with the microphone check.
    *   Click "Start Interview".
    *   **Microphone Permission**: Allow browser microphone access.
    *   **Voice Interaction**: Speak clearly. Verify the visualizer responds.
    *   **Transcript**: Verify the real-time transcript appears on the right.
    *   **Completion**: Click "End Screening" or wait for the session to conclude.

4.  **Review Results**:
    *   After analysis completes, verify the **Report Card** appears.
    *   Check that the Score, Strengths, Weaknesses, and Skill Breakdown are populated.

5.  **Troubleshooting**:
    *   **Connection Error**: Check the LiveKit server logs and console for WebSocket connection failures.
    *   **No Audio**: Verify your system microphone input is selected in OS settings.
    *   **Empty Report**: Ensure the backend `analyze-screening` endpoint is mocking data or correctly calling the AI service.
