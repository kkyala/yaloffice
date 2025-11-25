/**
 * Room Management API Routes
 *
 * Endpoints for creating, managing, and monitoring LiveKit rooms
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AccessToken } from 'livekit-server-sdk';
import { roomRegistry } from '../services/roomRegistry.js';

const router = Router();

const LIVEKIT_REST_URL = process.env.LIVEKIT_REST_URL || 'http://localhost:7881';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';

/**
 * POST /api/rooms/create
 * Create a new LiveKit room and register it
 */
router.post('/create', async (req, res) => {
  try {
    const {
      roomName,
      candidateName,
      sessionId,
      jobId,
      applicationId,
      ttlSeconds = 3600, // 1 hour default
      metadata = {}
    } = req.body;

    // Generate room name if not provided
    const finalRoomName = roomName || `interview-${uuidv4()}`;

    console.log(`[Rooms] Creating room: ${finalRoomName}`);

    // Create room via LiveKit REST API
    const auth = Buffer.from(`${LIVEKIT_API_KEY}:${LIVEKIT_API_SECRET}`).toString('base64');

    const createResponse = await fetch(`${LIVEKIT_REST_URL}/twirp/livekit.RoomService/CreateRoom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        name: finalRoomName,
        emptyTimeout: ttlSeconds,
        maxParticipants: 10,
        metadata: JSON.stringify(metadata)
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[Rooms] LiveKit room creation failed:', errorText);
      return res.status(500).json({
        error: 'Failed to create LiveKit room',
        details: errorText
      });
    }

    const roomData = await createResponse.json();
    console.log('[Rooms] LiveKit room created:', roomData);

    // Register room in registry
    await roomRegistry.registerRoom({
      roomName: finalRoomName,
      createdBy: candidateName || 'system',
      sessionId,
      jobId,
      applicationId,
      candidateName,
      ttlSeconds
    });

    // Generate access token for the candidate
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: candidateName || `user-${uuidv4()}`,
      metadata: JSON.stringify({ sessionId, jobId, applicationId }),
      ttl: ttlSeconds
    });

    token.addGrant({
      roomJoin: true,
      room: finalRoomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    const jwt = await token.toJwt();

    res.json({
      success: true,
      roomName: finalRoomName,
      token: jwt,
      url: LIVEKIT_URL,
      sessionId,
      metadata: roomData
    });

  } catch (error: any) {
    console.error('[Rooms] Error creating room:', error);
    res.status(500).json({
      error: 'Failed to create room',
      message: error.message
    });
  }
});

/**
 * GET /api/rooms/list
 * List all active rooms
 */
router.get('/list', async (req, res) => {
  try {
    const rooms = await roomRegistry.getAllRooms();

    res.json({
      success: true,
      count: rooms.length,
      rooms
    });
  } catch (error: any) {
    console.error('[Rooms] Error listing rooms:', error);
    res.status(500).json({
      error: 'Failed to list rooms',
      message: error.message
    });
  }
});

/**
 * GET /api/rooms/:roomName
 * Get room details
 */
router.get('/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;
    const room = await roomRegistry.getRoom(roomName);

    if (!room) {
      return res.status(404).json({
        error: 'Room not found'
      });
    }

    res.json({
      success: true,
      room
    });
  } catch (error: any) {
    console.error('[Rooms] Error getting room:', error);
    res.status(500).json({
      error: 'Failed to get room',
      message: error.message
    });
  }
});

/**
 * POST /api/rooms/:roomName/heartbeat
 * Update room's last active time
 */
router.post('/:roomName/heartbeat', async (req, res) => {
  try {
    const { roomName } = req.params;

    await roomRegistry.updateLastActive(roomName);

    res.json({
      success: true,
      message: 'Heartbeat recorded'
    });
  } catch (error: any) {
    console.error('[Rooms] Error updating heartbeat:', error);
    res.status(500).json({
      error: 'Failed to update heartbeat',
      message: error.message
    });
  }
});

/**
 * DELETE /api/rooms/:roomName
 * Close and delete a room
 */
router.delete('/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;

    // Delete via LiveKit REST API
    const auth = Buffer.from(`${LIVEKIT_API_KEY}:${LIVEKIT_API_SECRET}`).toString('base64');

    const deleteResponse = await fetch(`${LIVEKIT_REST_URL}/twirp/livekit.RoomService/DeleteRoom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({ room: roomName })
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error('[Rooms] Failed to delete room:', errorText);
    }

    // Remove from registry
    await roomRegistry.deleteRoom(roomName);

    res.json({
      success: true,
      message: 'Room deleted'
    });
  } catch (error: any) {
    console.error('[Rooms] Error deleting room:', error);
    res.status(500).json({
      error: 'Failed to delete room',
      message: error.message
    });
  }
});

export default router;
