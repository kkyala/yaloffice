# LiveKit AI Phone Screening Implementation Guide

This guide outlines the architecture and requirements to fully enable the **outbound phone screening** feature where the AI Agent triggers a real PSTN phone call to the candidate.

## 1. What We Have (Implemented)

*   **Frontend UI**: A dedicated `ResumeScreeningPhoneScreen` component that prompts the user for their phone number and initiates the call flow.
*   **Voice Agent**: A Python-based LiveKit Agent (`agent/main.py`) capable of conducting interviews via Voice.
*   **Backend API**: A `/api/interview/start-phone-screen` endpoint that creates the interview session and is ready to trigger the SIP outbound call.
*   **Resume integration**: The system parses the resume and can pass context to the Phone Screening session.

## 2. What Is Needed (For Real Telephony)

To bridge the gap between our Voice Agent and the Public Switched Telephone Network (PSTN), we need to configure **LiveKit SIP Trunking**.

### A. Infrastructure Requirements
**Crucial Note on Outbound Calls**: 
While LiveKit offers native **"LiveKit Phone Numbers"** for purchase in their cloud dashboard, these are currently optimized for **Inbound** calls (Candidate calls Agent). For **Outbound** calls (Agent calls Candidate), which is our use case, you currently need to use **"Bring Your Own Carrier" (BYOC)** integration.

Therefore, you need:
1.  **SIP Trunk Provider**: An account with a third-party SIP provider (e.g., **Twilio**, **Telnyx**, **Amazon Chime SDK**).
    *   Purchase a **Phone Number** from them.
    *   Create a **SIP Trunk** pointing to LiveKit's SIP Ingress/Egress URIs.
2.  **LiveKit Cloud Config**:
    *   Create a **SIP Trunk** object in your LiveKit project dashboard.
    *   Add your provider's credentials (username/password/IP).
    *   Define an **Outbound Logic** (SIP Trunk ID) to enable dialing out.

### B. Backend Implementation (SIP Outbound)
I have updated `backend/src/routes/interview.ts` to include the logic for dialing out. To enable it:

1.  **Environment Variables**:
    Add the following to your `backend/.env` file:
    ```env
    SIP_TRUNK_ID=ST_...  # Found in LiveKit Dashboard -> SIP
    ```

2.  **Code Logic**:
    The backend will check if `SIP_TRUNK_ID` is present. 
    *   **If Present**: It attempts to make a real call using `createSipParticipant`.
    *   **If Missing**: It mocks the event (Simulated Mode), allowing you to test the UI flow without paying for calls.

    ```typescript
    // automated logic in interview.ts
    if (process.env.SIP_TRUNK_ID) {
       await sipClient.createSipParticipant(...);
    }
    ```

## 3. How It Works

1.  **User Clicks "Call Me Now"**: The frontend calls the backend.
2.  **Backend Initiates Call**: The backend uses the LiveKit SIP Client to tell the SIP Provider to dial the candidate's phone.
3.  **Room Created**: A LiveKit room is created.
4.  **Agent Joins**: The active Python Agent (Worker) detects the new room (or is explicitly dispatched) and joins it.
5.  **User Answers Phone**: The SIP Provider connects the audio to the LiveKit Room.
6.  **Conversation Begins**: The Agent speaks to the User via the phone line.
