import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { geminiLLMService } from '../services/geminiLLM.js';
import { interviewStore } from '../services/interviewStore.js';

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
    const session = {
      id: sessionId,
      roomName,
      jobTitle,
      questionCount,
      difficulty,
      candidateId,
      candidateName,
      customQuestions,
      status: 'active' as const,
      startedAt: new Date().toISOString(),
      transcript: [] as Array<{ role: string; content: string; timestamp: string }>,
      currentQuestionIndex: 0
    };

    interviewStore.set(sessionId, session);

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

    const session = interviewStore.get(sessionId);
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

    res.json({
      success: true,
      sessionId,
      transcript: session.transcript,
      analysis
    });

    // Clean up session after response (keep for a while for potential retries)
    setTimeout(() => interviewStore.delete(sessionId), 300000); // 5 minutes
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

    const session = interviewStore.get(sessionId);
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
router.get('/status/:sessionId', (req, res) => {
  const session = interviewStore.get(req.params.sessionId);

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
});

export default router;
