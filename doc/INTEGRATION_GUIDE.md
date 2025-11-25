# Yaal Office - Tavus & LiveKit Integration Guide

This guide explains how to integrate Tavus PAL and LiveKit for video-enabled interviews in Yaal Office.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Configuration](#configuration)
4. [Backend Setup (Required)](#backend-setup-required)
5. [Features](#features)
6. [Usage](#usage)
7. [Troubleshooting](#troubleshooting)

## Overview

Yaal Office now integrates two powerful services for AI-powered video interviews:

- **Tavus PAL**: Provides realistic AI video avatars that act as interviewers
- **LiveKit**: Enables real-time video communication between candidates and the AI interviewer

### Architecture

```
┌─────────────────┐
│   Candidate     │ ◄──► LiveKit Room ◄──► Tavus AI Avatar
│   (Browser)     │                          (Interviewer)
└─────────────────┘
        │
        ▼
   Backend API
   (Token Gen)
        │
        ▼
    Supabase DB
   (Results)
```

## Prerequisites

### 1. Tavus Account

1. Sign up at [https://platform.tavus.io/](https://platform.tavus.io/)
2. Get your API key from the dashboard
3. Create an AI persona (interviewer avatar) in the Tavus dashboard
4. Note down the persona ID

### 2. LiveKit Account

1. Sign up at [https://cloud.livekit.io/](https://cloud.livekit.io/)
2. Create a new project
3. Get your API Key and API Secret
4. Note down your LiveKit server URL (e.g., `wss://your-project.livekit.cloud`)

### 3. Node.js Backend (for token generation)

LiveKit requires server-side token generation for security. You'll need to set up a backend API.

## Configuration

### Step 1: Update Environment Variables

Edit `.env.local` in the root directory:

```bash
# Existing Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Tavus API Configuration
VITE_TAVUS_API_KEY=tvs_your_tavus_api_key_here

# LiveKit Configuration
VITE_LIVEKIT_API_KEY=your_livekit_api_key_here
VITE_LIVEKIT_API_SECRET=your_livekit_api_secret_here
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
```

### Step 2: Update App Configuration

Edit `src/config/appConfig.ts` and update the Tavus persona ID:

```typescript
tavus: {
    // ...
    pal: {
        enabled: true,
        defaultPersonaId: 'your_persona_id_here', // Update this!
        // ...
    }
}
```

## Backend Setup (Required)

LiveKit tokens **must** be generated server-side to keep your API secret secure. Here's how to set up the backend:

### Option 1: Express.js Backend (Recommended)

Create a new directory for your backend API:

```bash
mkdir backend
cd backend
npm init -y
npm install express cors dotenv livekit-server-sdk
```

Create `backend/server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const { AccessToken } = require('livekit-server-sdk');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

// Generate LiveKit access token
app.post('/api/livekit/token', async (req, res) => {
    try {
        const { roomName, participantName, participantMetadata, enableRecording } = req.body;

        if (!roomName || !participantName) {
            return res.status(400).json({ error: 'roomName and participantName are required' });
        }

        // Create access token
        const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity: participantName,
            metadata: participantMetadata,
        });

        // Grant permissions
        token.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        // Generate JWT
        const jwt = await token.toJwt();

        res.json({ token: jwt });
    } catch (error) {
        console.error('Error generating token:', error);
        res.status(500).json({ error: 'Failed to generate token' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`LiveKit token server running on port ${PORT}`);
});
```

Create `backend/.env`:

```bash
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here
PORT=3001
```

Run the backend:

```bash
cd backend
node server.js
```

### Option 2: Serverless (Vercel/Netlify)

For serverless deployment, create an API function:

**Vercel** (`api/livekit/token.js`):

```javascript
const { AccessToken } = require('livekit-server-sdk');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { roomName, participantName, participantMetadata } = req.body;

    const token = new AccessToken(
        process.env.LIVEKIT_API_KEY,
        process.env.LIVEKIT_API_SECRET,
        { identity: participantName, metadata: participantMetadata }
    );

    token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
    });

    const jwt = await token.toJwt();
    res.json({ token: jwt });
};
```

### Step 3: Update Frontend Proxy (for development)

Update `vite.config.ts` to proxy API requests:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
        },
    },
});
```

## Features

### 1. Word Document Resume Upload

Candidates can now upload resumes in these formats:
- PDF (`.pdf`)
- Microsoft Word (`.doc`, `.docx`)
- Images (`.jpg`, `.png`)

The AI automatically parses the resume and extracts:
- Personal information
- Professional summary
- Work experience
- Education
- Skills

**Code location**: `src/pages/MyResumeScreen.tsx`

### 2. LiveKit Video Rooms

Real-time video communication with:
- High-quality video (720p @ 30fps)
- Automatic recording
- Screen sharing capability
- Audio/video controls

**Code location**: `src/services/livekitService.ts`

### 3. Tavus AI Interviewer

AI-powered video interviewer with:
- Realistic avatar
- Natural conversation
- Context-aware questions
- Custom interview scripts

**Code location**: `src/services/tavusService.ts`

### 4. Enhanced Video Interview Screen

New interview screen combining both technologies:
- AI avatar interviewer (Tavus)
- Live candidate video (LiveKit)
- Real-time transcript
- Post-interview analysis

**Code location**: `src/pages/LiveKitInterviewScreen.tsx`

## Usage

### For Candidates

1. **Upload Resume**:
   - Navigate to "My Resume" from the dashboard
   - Drag and drop a Word document, PDF, or image
   - AI will automatically parse and extract information
   - Review and save the parsed data

2. **Start Video Interview**:
   - Accept an interview invitation
   - Click "Start Interview"
   - Grant camera and microphone permissions
   - The AI interviewer will greet you and begin asking questions
   - Answer naturally - the AI can see and hear you
   - Click "End Interview" when finished

### For Employers

1. **Schedule Interview**:
   - Select a candidate from the pipeline
   - Click "Schedule Interview"
   - Choose "AI Video Interview" mode
   - Set interview parameters (question count, difficulty, custom questions)
   - Send invitation to candidate

2. **Review Interview**:
   - After completion, view the interview report
   - See AI-generated score and analysis
   - Review transcript
   - Watch recording (if enabled)

## Troubleshooting

### Common Issues

#### 1. "Failed to get access token"

**Cause**: Backend API is not running or not reachable.

**Solution**:
- Ensure your backend server is running (`node backend/server.js`)
- Check that Vite proxy is configured correctly
- Verify the API endpoint URL matches your backend

#### 2. "Tavus is not configured"

**Cause**: Missing Tavus API key or it's not properly set.

**Solution**:
- Check that `VITE_TAVUS_API_KEY` is set in `.env.local`
- Restart the development server after updating `.env.local`
- Verify the API key is valid in the Tavus dashboard

#### 3. "Failed to create Tavus conversation"

**Cause**: Invalid persona ID or API key.

**Solution**:
- Verify `defaultPersonaId` in `src/config/appConfig.ts`
- Check that the persona exists in your Tavus dashboard
- Ensure your Tavus account has sufficient credits

#### 4. Camera/Microphone not working

**Cause**: Browser permissions not granted.

**Solution**:
- Click the lock icon in the browser address bar
- Allow camera and microphone permissions
- Refresh the page and try again

#### 5. "Resume parsing failed"

**Cause**: Unsupported file format or corrupted file.

**Solution**:
- Ensure the file is a valid Word document, PDF, or image
- Try converting the document to a different format
- Check that the file size is under 10MB

### Debug Mode

To enable debug logging, add to `src/services/livekitService.ts`:

```typescript
import { setLogLevel } from 'livekit-client';
setLogLevel('debug');
```

## Architecture Details

### Data Flow

1. **Interview Initiation**:
   ```
   Frontend → onStartInterviewSession() → Supabase
   Frontend → livekitService.getAccessToken() → Backend API
   Frontend → tavusService.createInterviewConversation() → Tavus API
   ```

2. **During Interview**:
   ```
   Candidate ←→ LiveKit Room ←→ Recording
   Candidate ←→ Tavus AI Avatar ←→ Transcript
   ```

3. **Interview Completion**:
   ```
   Frontend → tavusService.endConversation() → Tavus API
   Frontend → tavusService.getConversationTranscript() → Tavus API
   Frontend → aiService.generateJsonContent() → Gemini AI (scoring)
   Frontend → onSaveInterviewResults() → Supabase
   ```

### Database Schema

The interview data is stored in the `candidates` table:

```sql
-- interview_config column (JSONB)
{
  "mode": "video",
  "interviewType": "video",
  "interviewStatus": "finished",
  "questionCount": 5,
  "difficulty": "Medium",
  "customQuestions": ["Tell me about your experience with React"],
  "tavusConversationId": "conv_123456",
  "livekitRoomName": "interview-job123-app456-1234567890"
}
```

## API Reference

### LiveKit Service

```typescript
// Create room configuration
const roomConfig = livekitService.createInterviewRoomConfig(
    applicationId,
    jobId,
    participantName,
    'candidate'
);

// Get access token
const { token, url } = await livekitService.getAccessToken(roomConfig);
```

### Tavus Service

```typescript
// Create conversation
const conversation = await tavusService.createInterviewConversation(
    jobTitle,
    candidateName,
    {
        questionCount: 5,
        difficulty: 'Medium',
        customQuestions: []
    }
);

// End conversation
await tavusService.endConversation(conversationId);

// Get transcript
const transcript = await tavusService.getConversationTranscript(conversationId);
```

## Security Best Practices

1. **Never expose API secrets in frontend code**
   - Always generate LiveKit tokens server-side
   - Use environment variables for all API keys
   - Add `.env.local` to `.gitignore`

2. **Validate tokens**
   - Set appropriate expiration times for tokens
   - Validate room names to prevent unauthorized access

3. **Protect endpoints**
   - Add authentication to your backend API
   - Validate user permissions before generating tokens

4. **Data privacy**
   - Ensure interview recordings are stored securely
   - Implement data retention policies
   - Comply with GDPR/privacy regulations

## Next Steps

1. **Customize AI Persona**: Update your Tavus persona's appearance and voice in the Tavus dashboard
2. **Add Analytics**: Track interview completion rates and candidate performance
3. **Enhance Scoring**: Customize the AI scoring algorithm in `aiService.ts`
4. **Add Webhooks**: Implement webhooks for real-time interview status updates

## Support

For issues or questions:
- Tavus: [https://docs.tavus.io/](https://docs.tavus.io/)
- LiveKit: [https://docs.livekit.io/](https://docs.livekit.io/)
- Supabase: [https://supabase.com/docs](https://supabase.com/docs)

## License

This integration is part of the Yaal Office platform. See the main README for license information.
