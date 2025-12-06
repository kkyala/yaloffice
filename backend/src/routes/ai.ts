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
import { auditLogger } from '../services/auditLogger.js';
import { supabase } from '../services/supabaseService.js';

const router = Router();
// ... (existing code)

/**
 * POST /api/ai/screening/report
 * Generate screening report
 */
router.post('/screening/report', async (req: Request, res: Response) => {
  try {
    const { transcript, candidateName, applicationId } = req.body;
    if (!transcript || !candidateName) return res.status(400).json({ error: 'Missing transcript or candidateName' });

    const report = await aiService.generateScreeningReport(transcript, candidateName);

    // If applicationId is provided, save the report to the candidate's application
    if (applicationId) {
      // Fetch existing config
      const { data: candidate, error: fetchError } = await supabase
        .from('candidates')
        .select('interview_config')
        .eq('id', applicationId)
        .single();

      if (!fetchError && candidate) {
        const newConfig = {
          ...(candidate.interview_config || {}),
          screeningStatus: 'completed',
          screeningReport: report
        };

        await supabase
          .from('candidates')
          .update({ interview_config: newConfig })
          .eq('id', applicationId);
      }
    } else if (req.body.userId) {
      // If userId is provided (initial screening), update the user profile
      const userId = req.body.userId;
      await supabase
        .from('users')
        .update({
          screening_status: 'completed',
          screening_report: report,
          screening_transcript: transcript
        })
        .eq('id', userId);
    }

    // Audit Log
    await auditLogger.log({
      action: 'screening_report_generated',
      resourceType: 'screening_report',
      details: { candidate: candidateName, score: report.score }
    });

    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('[AI Routes] Screening report error:', error);
    res.status(500).json({ error: 'Failed to generate report', message: error.message });
  }
});



// ========================================================================================
// RESUME ENDPOINTS
// ========================================================================================

/**
 * POST /api/ai/resume/parse
 * Parse resume document (PDF, Word, Image) into structured data
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

    // Audit Log
    await auditLogger.log({
      userId: resumeData.personalInfo?.email || 'anonymous',
      action: 'resume_parsed',
      resourceType: 'resume',
      details: {
        name: resumeData.personalInfo?.name,
        email: resumeData.personalInfo?.email,
        mimeType
      }
    });

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

    // Audit Log
    await auditLogger.log({
      action: 'resume_screened',
      resourceType: 'resume_screening',
      details: {
        matchScore: screeningResult.matchScore,
        summary: screeningResult.summary.substring(0, 100) + '...'
      }
    });

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

    // Audit Log
    await auditLogger.log({
      action: 'response_scored',
      resourceType: 'interview_response',
      details: {
        question: question.substring(0, 50) + '...',
        score: score.score
      }
    });

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

    // Audit Log
    await auditLogger.log({
      action: 'interview_summarized',
      resourceType: 'interview_summary',
      details: { summaryLength: summary.length }
    });

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

    // Audit Log
    await auditLogger.log({
      action: 'video_analyzed',
      resourceType: 'video',
      details: { mimeType, prompt: analysisPrompt }
    });

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

    // Audit Log
    await auditLogger.log({
      action: 'json_generated',
      resourceType: 'content_generation',
      details: { prompt: prompt.substring(0, 50) + '...', fields: expectedFields }
    });

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

// ========================================================================================
// SCREENING ENDPOINTS
// ========================================================================================

/**
 * POST /api/ai/screening/start
 * Start screening session
 */
router.post('/screening/start', async (req: Request, res: Response) => {
  try {
    const { resumeText, candidateName } = req.body;
    if (!resumeText || !candidateName) return res.status(400).json({ error: 'Missing resumeText or candidateName' });

    const result = await aiService.startScreening(resumeText, candidateName);

    // Audit Log
    await auditLogger.log({
      action: 'screening_started',
      resourceType: 'screening',
      details: { candidate: candidateName }
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[AI Routes] Screening start error:', error);
    res.status(500).json({ error: 'Failed to start screening', message: error.message });
  }
});

/**
 * POST /api/ai/screening/chat
 * Chat screening
 */
router.post('/screening/chat', async (req: Request, res: Response) => {
  try {
    const { history, userResponse } = req.body;
    if (!history || !userResponse) return res.status(400).json({ error: 'Missing history or userResponse' });

    const result = await aiService.chatScreening(history, userResponse);

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[AI Routes] Screening chat error:', error);
    res.status(500).json({ error: 'Failed to chat', message: error.message });
  }
});

/**
 * POST /api/ai/screening/finalize
 * Finalize screening session, generate report, and save to screening_assessments
 */
router.post('/screening/finalize', async (req: Request, res: Response) => {
  try {
    const { transcript, candidateName, userId, jobTitle, jobId } = req.body;
    if (!transcript || !candidateName || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate report
    const report = await aiService.generateScreeningReport(transcript, candidateName);

    // Save to screening_assessments table
    const { interviewStore } = await import('../services/interviewStore.js');
    await interviewStore.saveScreeningAssessment({
      userId,
      jobTitle: jobTitle || 'General Application',
      jobId,
      score: report.score,
      summary: report.summary,
      strengths: report.keyStrengths || report.strengths,
      weaknesses: report.areasForImprovement || report.weaknesses,
      skillsAnalysis: report.skillsAssessment || report.skillsAnalysis,
      transcript: transcript
    });

    // Audit Log
    await auditLogger.log({
      userId,
      action: 'screening_finalized',
      resourceType: 'screening_assessment',
      details: { candidate: candidateName, score: report.score }
    });

    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('[AI Routes] Screening finalize error:', error);
    res.status(500).json({ error: 'Failed to finalize screening', message: error.message });
  }
});

/**
 * POST /api/ai/resume/process-screening
 * Process resume through AI conversation and save to screening_assessments
 * This is called automatically after resume upload
 */
router.post('/resume/process-screening', async (req: Request, res: Response) => {
  try {
    const { resumeData, userId, candidateName, candidateEmail, jobTitle, jobId } = req.body;

    if (!resumeData || !userId || !candidateName || !candidateEmail) {
      return res.status(400).json({
        error: 'Missing required fields: resumeData, userId, candidateName, candidateEmail'
      });
    }

    // Process resume through AI screening
    const assessment = await aiService.processResumeScreening(
      resumeData,
      candidateName,
      candidateEmail,
      jobTitle,
      jobId
    );

    // Save to screening_assessments table
    const { interviewStore } = await import('../services/interviewStore.js');
    await interviewStore.saveScreeningAssessment({
      userId,
      jobTitle: jobTitle || 'General Application',
      jobId,
      score: assessment.score,
      summary: assessment.summary,
      strengths: assessment.strengths,
      weaknesses: assessment.weaknesses,
      skillsAnalysis: assessment.skillsAnalysis,
      transcript: assessment.transcript
    });

    // Audit Log
    await auditLogger.log({
      userId,
      action: 'resume_screening_processed',
      resourceType: 'screening_assessment',
      details: {
        candidateName,
        score: assessment.score,
        jobTitle: jobTitle || 'General Application'
      }
    });

    res.json({
      success: true,
      data: {
        assessment,
        message: 'Resume screening completed and saved'
      }
    });
  } catch (error: any) {
    console.error('[AI Routes] Process resume screening error:', error);
    res.status(500).json({
      error: 'Failed to process resume screening',
      message: error.message
    });
  }
});

export default router;
