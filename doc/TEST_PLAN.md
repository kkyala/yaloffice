# Test Plan: Job Creation, Application, and Interview

This plan outlines the steps to verify the fix for the "Error saving job" issue and to test the full recruitment workflow.

## Prerequisites
1.  **Database Schema Update**: You MUST run the `backend/update_schema.sql` script in your Supabase Dashboard SQL Editor. This fixes the missing column errors.
    *   Go to [Supabase Dashboard](https://supabase.com/dashboard) -> SQL Editor.
    *   Copy content from `backend/update_schema.sql`.
    *   Paste and Run.

## Test Case 1: Create a Job (Employer)
1.  **Login** as an **Employer** (or sign up a new account with role 'Employer').
2.  Navigate to **Recruit** -> **Add Job**.
3.  Fill in the job details:
    *   **Job Title**: AI Architect (or any title)
    *   **Location**: Remote
    *   **Job Description**: Test description...
    *   **Required Skills**: Python, AI
    *   **Business Unit**: (Optional, verify default)
    *   **Client**: (Optional, verify default)
4.  Click **Save as Draft** or **Publish**.
5.  **Expected Result**: Success message or redirection to the jobs list. No "500 Internal Server Error" or "Could not find column" error.

## Test Case 2: Apply for a Job (Candidate)
1.  **Login** as a **Candidate** (different account).
2.  Navigate to **Find Jobs**.
3.  Click **Apply** on the "AI Architect" job created above.
4.  Fill in the application form (ensure Date of Birth is filled).
5.  Click **Submit Application**.
6.  **Expected Result**: Success message and redirection to Dashboard.

## Test Case 3: Schedule Interview (Employer)
1.  **Login** back as the **Employer**.
2.  Navigate to **Recruit** -> **Pipeline**.
3.  Find the candidate in the "Applied" or "Screening" stage.
4.  Move the candidate to **Interview** stage.
5.  Click **Schedule Interview**.
6.  Select **AI Interview (LiveKit)** or **AI Interview (Video)**.
7.  Configure questions and difficulty.
8.  Click **Schedule**.
9.  **Expected Result**: Interview scheduled successfully.

## Test Case 4: Attend Interview (Candidate)
1.  **Login** as the **Candidate**.
2.  Navigate to **Dashboard**.
3.  You should see the "Upcoming Interview" or "Action Required".
4.  Click **Start Interview**.
5.  **Expected Result**:
    *   Enters the Interview Room (LiveKit).
    *   Camera and Microphone permissions requested.
    *   AI Interviewer connects and greets you.
    *   Conversation flows naturally.
6.  Click **End Interview**.
7.  **Expected Result**: Interview ends, results are saved (transcript, score).

## Troubleshooting
*   If you see "Error saving job", verify you ran the SQL script.
*   If "LiveKit" fails to connect, ensure the local LiveKit server is running (`livekit-server --dev`).
*   If "AI" doesn't speak, check your OpenAI/Gemini API keys in `backend/.env`.
