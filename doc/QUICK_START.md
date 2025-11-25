# Quick Start Guide - Tavus & LiveKit Integration

This is a **5-minute quick start** to get your video interviews running.

## Prerequisites Checklist

- [ ] Tavus API key (from https://platform.tavus.io/)
- [ ] Tavus persona ID (created in Tavus dashboard)
- [ ] LiveKit API key & secret (from https://cloud.livekit.io/)
- [ ] LiveKit server URL (from your LiveKit project)
- [ ] Node.js installed (for backend server)

## Step 1: Configure Environment (2 minutes)

Edit `.env.local`:

```bash
VITE_TAVUS_API_KEY=tvs_your_key_here
VITE_LIVEKIT_API_KEY=your_key_here
VITE_LIVEKIT_API_SECRET=your_secret_here
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
```

Edit `src/config/appConfig.ts` (line 53):

```typescript
defaultPersonaId: 'your_persona_id_here',
```

## Step 2: Set Up Backend (2 minutes)

Create `backend/server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const { AccessToken } = require('livekit-server-sdk');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/livekit/token', async (req, res) => {
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

    res.json({ token: await token.toJwt() });
});

app.listen(3001, () => console.log('Token server on port 3001'));
```

Create `backend/.env`:

```bash
LIVEKIT_API_KEY=your_key_here
LIVEKIT_API_SECRET=your_secret_here
```

Install dependencies:

```bash
cd backend
npm init -y
npm install express cors dotenv livekit-server-sdk
```

## Step 3: Run Everything (1 minute)

Terminal 1 (Backend):
```bash
cd backend
node server.js
```

Terminal 2 (Frontend):
```bash
npm run dev
```

## Step 4: Test Interview

1. Log in as a candidate
2. Navigate to an interview invitation
3. Click "Start Interview"
4. Grant camera/microphone permissions
5. The AI interviewer should appear and greet you!

## Troubleshooting

### "Failed to get access token"
→ Backend server not running. Run `node backend/server.js`

### "Tavus is not configured"
→ Check `VITE_TAVUS_API_KEY` in `.env.local`

### "Failed to create conversation"
→ Check `defaultPersonaId` in `appConfig.ts`

### Camera not working
→ Allow permissions in browser settings

## What About Word Documents?

Good news! **Word document resume parsing already works**. Just upload a `.doc` or `.docx` file in the "My Resume" screen, and the AI will automatically parse it.

## Next Steps

- Read [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for detailed documentation
- Read [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for architecture details
- Customize your Tavus persona in the Tavus dashboard
- Configure interview questions in the app settings

## Need Help?

Check the [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for:
- Complete API reference
- Security best practices
- Serverless deployment options
- Advanced configuration

Happy interviewing! 🎉
