/**
 * Avatar API Routes
 *
 * Endpoints for generating lip-synced AI interviewer videos.
 */

import { Router } from 'express';
import { avatarService } from '../services/avatarService.js';
import path from 'path';
import fs from 'fs';

const router = Router();

/**
 * POST /api/avatar/generate
 * Generate lip-synced video from audio
 */
router.post('/generate', async (req, res) => {
  try {
    const { audioPath, audioBase64, faceImage } = req.body;

    if (!avatarService.isReady()) {
      return res.status(503).json({
        error: 'Avatar service not available',
        message: 'Wav2Lip/SadTalker not configured'
      });
    }

    let videoPath: string;

    if (audioBase64) {
      // Generate from base64 audio
      videoPath = await avatarService.generateFromBase64Audio(audioBase64);
    } else if (audioPath) {
      // Generate from audio file path
      videoPath = await avatarService.generateVideo(audioPath, { faceSource: faceImage });
    } else {
      return res.status(400).json({ error: 'audioPath or audioBase64 required' });
    }

    res.json({
      success: true,
      videoPath,
      videoUrl: `/api/avatar/video/${path.basename(videoPath)}`
    });
  } catch (err: any) {
    console.error('[Avatar] Generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/avatar/generate-from-pcm
 * Generate video from raw PCM audio data
 */
router.post('/generate-from-pcm', async (req, res) => {
  try {
    const { pcmBase64, sampleRate = 24000, channels = 1 } = req.body;

    if (!pcmBase64) {
      return res.status(400).json({ error: 'pcmBase64 required' });
    }

    if (!avatarService.isReady()) {
      return res.status(503).json({
        error: 'Avatar service not available'
      });
    }

    // Convert PCM to WAV
    const pcmBuffer = Buffer.from(pcmBase64, 'base64');
    const wavPath = await avatarService.convertPCMToWav(pcmBuffer, sampleRate, channels);

    // Generate video
    const videoPath = await avatarService.generateVideo(wavPath);

    // Clean up temp WAV
    fs.unlinkSync(wavPath);

    res.json({
      success: true,
      videoPath,
      videoUrl: `/api/avatar/video/${path.basename(videoPath)}`
    });
  } catch (err: any) {
    console.error('[Avatar] PCM generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/avatar/video/:filename
 * Serve generated avatar video
 */
router.get('/video/:filename', (req, res) => {
  const outputDir = process.env.AVATAR_OUTPUT_DIR || '/app/avatar_output';
  const videoPath = path.join(outputDir, req.params.filename);

  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: 'Video not found' });
  }

  res.sendFile(videoPath);
});

/**
 * GET /api/avatar/status
 * Check avatar service status
 */
router.get('/status', (req, res) => {
  res.json({
    available: avatarService.isReady(),
    renderer: process.env.AVATAR_RENDERER || 'wav2lip'
  });
});

/**
 * POST /api/avatar/cleanup
 * Clean up old avatar files
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { maxAgeMs = 3600000 } = req.body;
    await avatarService.cleanup(maxAgeMs);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
