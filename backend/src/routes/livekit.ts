import { Router } from 'express';
import { AccessToken } from 'livekit-server-sdk';

const router = Router();

/**
 * POST /api/livekit/token
 * Generate a LiveKit access token for a participant
 */
router.post('/token', async (req, res) => {
  try {
    const {
      identity = `user-${Math.random().toString(36).slice(2, 8)}`,
      roomName = 'interview-room',
      participantMetadata,
      enableRecording = true
    } = req.body;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({
        error: 'LiveKit credentials not configured'
      });
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      metadata: participantMetadata ? JSON.stringify(participantMetadata) : undefined,
      ttl: 3600 // 1 hour in seconds
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    console.log(`[LiveKit] Token generated for ${identity} in room ${roomName}`);
    console.log(`[LiveKit] URL: ${process.env.LIVEKIT_URL}`);

    res.json({
      token: jwt,
      identity,
      roomName,
      url: process.env.LIVEKIT_URL
    });
  } catch (error) {
    console.error('[LiveKit] Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

export default router;
