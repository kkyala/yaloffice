/**
 * AI Service Routes
 *
 * REST API endpoints for all AI functionality:
 * - Resume parsing (PDF, Word, Images)
 * - Resume screening and matching
 * - Interview scoring and analysis
 * - Video analysis
 */

import { Router, Request, Response } from 'express';
import { aiService } from '../services/aiService.js';

const router = Router();

// ========================================================================================
// RESUME ENDPOINTS
// ========================================================================================

/**
 * POST /api/ai/resume/parse
 * Parse resume document (PDF, Word, Image) into structured data
 *
 * Body:
 * {
 *   fileBase64: string,  // Base64 encoded file
 *   mimeType: string     // MIME type (application/pdf, image/png, etc.)
 * }
 */
router.post('/resume/parse', async (req: Request, res: Response) => {
  try {
    const { fileBase64, mimeType } = req.body;

    if (!fileBase64 || !mimeType) {
      return res.status(400).json({
        error: 'Missing required fields: fileBase64, mimeType'
      });
    }

    const resumeData = await aiService.parseResumeDocument(fileBase64, mimeType);

    res.json({
      success: true,
      data: resumeData
    });
  } catch (error: any) {
    console.error('[AI Routes] Resume parse error:', error);
    res.status(500).json({
      error: 'Failed to parse resume',
      message: error.message
    });
  }
});

/**
 * POST /api/ai/resume/screen
 * Screen resume against job description
 *
 * Body:
 * {
 *   resumeText: string,
 *   jobDescription: string
 * }
 */
router.post('/resume/screen', async (req: Request, res: Response) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        error: 'Missing required fields: resumeText, jobDescription'
      });
    }

    const screeningResult = await aiService.screenResume(resumeText, jobDescription);

    res.json({
      success: true,
      data: screeningResult
    });
  } catch (error: any) {
    console.error('[AI Routes] Resume screen error:', error);
    res.status(500).json({
      error: 'Failed to screen resume',
      message: error.message
    });
  }
});

// ========================================================================================
// INTERVIEW ENDPOINTS
// ========================================================================================

/**
 * POST /api/ai/interview/score
 * Score interview response
 *
 * Body:
 * {
 *   question: string,
 *   response: string
 * }
 */
router.post('/interview/score', async (req: Request, res: Response) => {
  try {
    const { question, response } = req.body;

    if (!question || !response) {
      return res.status(400).json({
        error: 'Missing required fields: question, response'
      });
    }

    const score = await aiService.scoreResponse(question, response);

    res.json({
      success: true,
      data: score
    });
  } catch (error: any) {
    console.error('[AI Routes] Score response error:', error);
    res.status(500).json({
      error: 'Failed to score response',
      message: error.message
    });
  }
});

/**
 * POST /api/ai/interview/summary
 * Generate interview summary from transcript
 *
 * Body:
 * {
 *   transcript: string
 * }
 */
router.post('/interview/summary', async (req: Request, res: Response) => {
  try {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({
        error: 'Missing required field: transcript'
      });
    }

    const summary = await aiService.generateInterviewSummary(transcript);

    res.json({
      success: true,
      data: { summary }
    });
  } catch (error: any) {
    console.error('[AI Routes] Interview summary error:', error);
    res.status(500).json({
      error: 'Failed to generate summary',
      message: error.message
    });
  }
});

// ========================================================================================
// VIDEO ANALYSIS ENDPOINTS
// ========================================================================================

/**
 * POST /api/ai/video/analyze
 * Analyze video content
 *
 * Body:
 * {
 *   videoBase64: string,
 *   mimeType: string,
 *   analysisPrompt: string
 * }
 */
router.post('/video/analyze', async (req: Request, res: Response) => {
  try {
    const { videoBase64, mimeType, analysisPrompt } = req.body;

    if (!videoBase64 || !mimeType || !analysisPrompt) {
      return res.status(400).json({
        error: 'Missing required fields: videoBase64, mimeType, analysisPrompt'
      });
    }

    const analysis = await aiService.analyzeVideo(videoBase64, mimeType, analysisPrompt);

    res.json({
      success: true,
      data: { analysis }
    });
  } catch (error: any) {
    console.error('[AI Routes] Video analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze video',
      message: error.message
    });
  }
});

// ========================================================================================
// CONTENT GENERATION ENDPOINTS
// ========================================================================================

/**
 * POST /api/ai/generate/json
 * Generate structured JSON content
 *
 * Body:
 * {
 *   prompt: string,
 *   expectedFields: string[]
 * }
 */
router.post('/generate/json', async (req: Request, res: Response) => {
  try {
    const { prompt, expectedFields } = req.body;

    if (!prompt || !expectedFields) {
      return res.status(400).json({
        error: 'Missing required fields: prompt, expectedFields'
      });
    }

    const content = await aiService.generateJsonContent(prompt, expectedFields);

    res.json({
      success: true,
      data: content
    });
  } catch (error: any) {
    console.error('[AI Routes] JSON generation error:', error);
    res.status(500).json({
      error: 'Failed to generate JSON content',
      message: error.message
    });
  }
});

export default router;
