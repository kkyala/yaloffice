import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { geminiLLMService } from '../services/geminiLLM.js';
import { interviewStore, InterviewSession } from '../services/interviewStore.js';
import { auditLogger } from '../services/auditLogger.js';

const router = Router();

/**
 * POST /api/interview/start
 * Start a new interview session
 */
router.post('/start', async (req, res) => {
  try {
    const {
      roomName,
      jobTitle,
      questionCount = 10,
      difficulty = 'medium',
      candidateId,
      candidateName,
      customQuestions = []
    } = req.body;

    const sessionId = uuidv4();

    // Create interview session
    const session: InterviewSession = {
      id: sessionId,
      roomName,
      jobTitle,
      questionCount,
      difficulty,
      candidateId,
      candidateName,
      customQuestions,
      status: 'active',
      startedAt: new Date().toISOString(),
      transcript: [],
      currentQuestionIndex: 0
    };

    // Generate initial greeting from LLM
    const initialPrompt = `Begin: "role":"${jobTitle}", "questionCount":${questionCount}, "difficulty":"${difficulty}", "custom": ${JSON.stringify(customQuestions)}`;

    const greeting = await geminiLLMService.generateInterviewResponse(
      initialPrompt,
      [],
      jobTitle
    );

    // Store the greeting in transcript
    session.transcript.push({
      role: 'interviewer',
      content: greeting,
      timestamp: new Date().toISOString()
    });

    // Save to DB
    await interviewStore.set(sessionId, session);

    // Audit Log
    await auditLogger.log({
      userId: candidateId || 'anonymous',
      action: 'interview_started',
      resourceType: 'interview',
      resourceId: sessionId,
      details: { jobTitle, roomName, candidateName }
    });

    res.json({
      success: true,
      sessionId,
      roomName,
      greeting,
      wsUrl: `/ws/gemini-proxy?sessionId=${sessionId}`
    });
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({ error: 'Failed to start interview' });
  }
});

/**
 * POST /api/interview/stop
 * Stop an interview session and finalize results
 */
router.post('/stop', async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await interviewStore.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.status = 'completed';
    session.endedAt = new Date().toISOString();

    // Generate interview analysis
    const transcriptText = session.transcript
      .map(t => `${t.role}: ${t.content}`)
      .join('\n');

    const analysis = await geminiLLMService.analyzeInterview(
      transcriptText,
      session.jobTitle
    );

    session.analysis = analysis;

    // Save updates to DB
    await interviewStore.set(sessionId, session);

    // Audit Log
    await auditLogger.log({
      userId: session.candidateId || 'anonymous',
      action: 'interview_completed',
      resourceType: 'interview',
      resourceId: sessionId,
      details: { analysisSummary: analysis.summary }
    });

    res.json({
      success: true,
      sessionId,
      transcript: session.transcript,
      analysis
    });

    // Clean up session after response (keep for a while for potential retries)
    // In DB mode, we might want to keep it longer or archive it. 
    // For now, we won't delete it immediately to allow review.
    // setTimeout(async () => await interviewStore.delete(sessionId), 300000); 
  } catch (error) {
    console.error('Error stopping interview:', error);
    res.status(500).json({ error: 'Failed to stop interview' });
  }
});

/**
 * POST /api/interview/respond
 * Process candidate response and get next interviewer response
 */
router.post('/respond', async (req, res) => {
  try {
    const { sessionId, candidateResponse } = req.body;

    const session = await interviewStore.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Add candidate response to transcript
    session.transcript.push({
      role: 'candidate',
      content: candidateResponse,
      timestamp: new Date().toISOString()
    });

    // Generate interviewer response
    const interviewerResponse = await geminiLLMService.generateInterviewResponse(
      candidateResponse,
      session.transcript,
      session.jobTitle
    );

    // Add interviewer response to transcript
    session.transcript.push({
      role: 'interviewer',
      content: interviewerResponse,
      timestamp: new Date().toISOString()
    });

    session.currentQuestionIndex++;

    // Save updates to DB
    await interviewStore.set(sessionId, session);

    res.json({
      success: true,
      response: interviewerResponse,
      questionIndex: session.currentQuestionIndex,
      isComplete: session.currentQuestionIndex >= session.questionCount
    });
  } catch (error) {
    console.error('Error processing response:', error);
    res.status(500).json({ error: 'Failed to process response' });
  }
});

/**
 * GET /api/interview/status/:sessionId
 * Get current interview session status
 */
router.get('/status/:sessionId', async (req, res) => {
  try {
    const session = await interviewStore.get(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: session.id,
      status: session.status,
      currentQuestionIndex: session.currentQuestionIndex,
      questionCount: session.questionCount,
      startedAt: session.startedAt,
      transcriptLength: session.transcript.length
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;
