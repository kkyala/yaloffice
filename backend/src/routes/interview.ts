import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AccessToken } from 'livekit-server-sdk';
import { ollamaService } from '../services/ollamaService.js';
import { interviewStore, InterviewSession } from '../services/interviewStore.js';
import { supabase } from '../services/supabaseService.js';
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

    // Generate initial greeting from LLM (Gemma)
    const initialPrompt = `Begin: "role": "${jobTitle}", "questionCount":${questionCount}, "difficulty": "${difficulty}", "custom": ${JSON.stringify(customQuestions)}`;

    let greeting = "Hello, I am ready to begin the interview.";
    try {
      greeting = await ollamaService.generateInterviewResponse(
        initialPrompt,
        [],
        jobTitle
      );
    } catch (e) {
      console.warn("Failed to generate greeting via Ollama:", e);
    }

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
      // No more gemini-proxy ws needed? Assume frontend still uses WebSockets or direct API polling.
      // If frontend relied on gemini-proxy for *streaming*, that might be broken unless we implement an ollama-proxy.
      // For now, removing the wsUrl since gemini-proxy is deprecated.
      // wsUrl: `/ws/gemini-proxy?sessionId=${sessionId}`
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
    const { sessionId, transcript } = req.body;

    const session = await interviewStore.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // If external transcript provided (e.g. from Agent), update session
    if (transcript && typeof transcript === 'string') {
      const lines = transcript.split('\n');
      const structuredTranscript = lines.map(line => {
        const parts = line.split(': ');
        if (parts.length >= 2) {
          const role = parts[0].toLowerCase().includes('candidate') ? 'candidate' : 'interviewer';
          return { role, content: parts.slice(1).join(': '), timestamp: new Date().toISOString() };
        }
        return null;
      }).filter(t => t !== null) as any[];

      if (structuredTranscript.length > 0) {
        session.transcript = structuredTranscript;
      }
    }

    session.status = 'completed';
    session.endedAt = new Date().toISOString();

    // Generate interview analysis (DeepSeek)
    const transcriptText = session.transcript
      .map(t => `${t.role}: ${t.content}`)
      .join('\n');

    let analysis = { summary: 'Analysis pending', score: 0, strengths: [], weaknesses: [] };
    try {
      analysis = await ollamaService.analyzeInterview(
        transcriptText,
        session.jobTitle,
        session.resumeText
      );
    } catch (e) { console.error("Ollama Analysis failed", e); }


    session.analysis = analysis as any;

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

    // Generate interviewer response (Gemma)
    const interviewerResponse = await ollamaService.generateInterviewResponse(
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
 * GET /api/interview/context/:sessionId
 * Get interview context (job, resume) for the Agent
 */
router.get('/context/:sessionId', async (req, res) => {
  try {
    const session = await interviewStore.get(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.json({
      jobTitle: session.jobTitle,
      resumeText: session.resumeText || '',
      candidateName: session.candidateName || 'Candidate',
      jobId: session.jobTitle === 'Phone Screening' ? 'screening' : 'job'
    });
  } catch (error) {
    console.error('Error getting context:', error);
    res.status(500).json({ error: 'Failed to get context' });
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

/**
 * POST /api/interview/analyze-screening
 * Analyze a completed screening session (from client-side transcript)
 */
router.post('/analyze-screening', async (req, res) => {
  try {
    const { transcripts, candidateName, candidateId, jobTitle, jobId, resumeText } = req.body;

    if (!transcripts || !Array.isArray(transcripts)) {
      return res.status(400).json({ error: 'Invalid transcripts format' });
    }

    const effectiveJobTitle = jobTitle || 'Initial Resume Screening';

    // Format transcript for LLM
    const transcriptText = transcripts
      .map((t: any) => `${t.sender === 'user' ? 'Candidate' : 'Interviewer'}: ${t.text}`)
      .join('\n');

    // Analyze with Ollama (DeepSeek)
    const analysis = await ollamaService.analyzeInterview(transcriptText, effectiveJobTitle, resumeText);

    // Create a record in the database for this screening
    const sessionId = uuidv4();
    const session: InterviewSession = {
      id: sessionId,
      roomName: `screening-${candidateId || 'anon'}-${Date.now()}`,
      jobTitle: effectiveJobTitle,
      questionCount: 0,
      difficulty: 'screening',
      candidateId: candidateId,
      candidateName: candidateName,
      customQuestions: [],
      status: 'completed',
      startedAt: new Date().toISOString(), // Approximate
      endedAt: new Date().toISOString(),
      transcript: transcripts.map((t: any) => ({
        role: t.sender === 'user' ? 'candidate' : 'interviewer',
        content: t.text,
        timestamp: t.timestamp || new Date().toISOString()
      })),
      currentQuestionIndex: 0,
      analysis: analysis as any
    };

    await interviewStore.set(sessionId, session);

    // Save to the dedicated screening_assessments table
    try {
      await interviewStore.saveScreeningAssessment({
        userId: candidateId,
        jobTitle: effectiveJobTitle,
        jobId: jobId,
        score: analysis.score,
        summary: analysis.summary,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        skillsAnalysis: analysis.skills_analysis,
        transcript: transcriptText
      });
      console.log(`[Screening] Saved assessment for user ${candidateId}`);

      // Update candidate application status if jobId is provided
      if (jobId) {
        const { data: candidates } = await supabase
          .from('candidates')
          .select('id, interview_config')
          .eq('jobId', jobId)
          .eq('user_id', candidateId)
          .limit(1);

        if (candidates && candidates.length > 0) {
          const candidate = candidates[0];
          const newConfig = {
            ...(candidate.interview_config || {}),
            screeningStatus: 'completed',
            screeningReport: analysis,
            screeningScore: analysis.score
          };

          await supabase
            .from('candidates')
            .update({
              interview_config: newConfig,
              status: 'Screening' // Ensure status is set to Screening
            })
            .eq('id', candidate.id);
        }
      }
    } catch (dbError) {
      console.error('Failed to save to screening_assessments table (ensure table exists):', dbError);
      // Do not fail the request if this optional table write fails, 
      // as we still have the 'interviews' table record.
    }

    res.json({ success: true, analysis });
  } catch (error: any) {
    console.error('Error analyzing screening:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/interview/screening-status/:userId
 * Checks if the user has completed a screening assessment.
 */
router.get('/screening-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Check the dedicated table first
    const { data: screeningData, error: screeningError } = await supabase
      .from('screening_assessments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!screeningError && screeningData && screeningData.length > 0) {
      return res.json({
        completed: true,
        score: screeningData[0].overall_score,
        date: screeningData[0].created_at,
        summary: screeningData[0].summary,
        strengths: screeningData[0].strengths,
        weaknesses: screeningData[0].weaknesses,
        skillsAnalysis: screeningData[0].skills_analysis
      });
    }

    // Fallback: Check the interviews table for 'screening' difficulty/title
    const { data: interviewData, error: interviewError } = await supabase
      .from('interviews')
      .select('*')
      .eq('candidate_id', userId)
      .eq('job_title', 'Initial Resume Screening')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!interviewError && interviewData && interviewData.length > 0) {
      // Check if analysis exists (meaning it was completed)
      const interview = interviewData[0];
      if (interview.analysis && interview.analysis.score) {
        return res.json({
          completed: true,
          score: interview.analysis.score,
          date: interview.created_at,
          summary: interview.analysis.summary,
          strengths: interview.analysis.strengths,
          weaknesses: interview.analysis.weaknesses,
          skillsAnalysis: interview.analysis.skills_analysis
        });
      }
    }

    return res.json({ completed: false });

  } catch (err: any) {
    console.error('Error checking screening status:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/interview/upload-audio
 * Upload interview audio recording
 */
router.post('/upload-audio', async (req, res) => {
  try {
    const { sessionId, candidateId, audioData } = req.body;

    if (!audioData || !sessionId) {
      return res.status(400).json({ error: 'Missing audio data or session ID' });
    }

    // Decode base64
    const base64Data = audioData.replace(/^data:audio\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    // Path: interviews/audio/{candidateId}_{sessionId}.webm
    // Using a flat structure within the type folder for easier access
    const filePath = `interviews/audio/${candidateId || 'anon'}_${sessionId}.webm`;

    const { data, error } = await supabase.storage
      .from('resumes') // Reusing resumes bucket
      .upload(filePath, buffer, {
        contentType: 'audio/webm',
        upsert: true
      });

    if (error) {
      console.error('Supabase storage error:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('resumes')
      .getPublicUrl(filePath);

    res.json({ success: true, publicUrl });
  } catch (error: any) {
    console.error('Error uploading audio:', error);
    res.status(500).json({ error: 'Failed to upload audio recording' });
  }
});

/**
 * POST /api/interview/start-phone-screen
 * Initiates an outbound SIP call to the candidate's phone number via LiveKit SIP Trunking.
 */
router.post('/start-phone-screen', async (req, res) => {
  try {
    const { phoneNumber, resumeText, jobTitle } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const sessionId = uuidv4();
    const roomName = `phone-screen-${sessionId}`;

    console.log(`[PhoneScreen] Initiating call to ${phoneNumber} for room ${roomName}`);

    // --- REAL SIP CALL LOGIC ---
    // --- VOIP / WEB AUDIO LOGIC (SIP Removed) ---
    // Instead of dialing out, we generate a token for the user to join via browser audio.
    console.log(`[PhoneScreen] Generating user token for room ${roomName}`);

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: `candidate-${sessionId}`,
        name: "Candidate",
      }
    );

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    // Create session (as before)
    const session: InterviewSession = {
      id: sessionId,
      roomName: roomName,
      jobTitle: jobTitle || 'Phone Screening',
      questionCount: 5,
      difficulty: 'medium',
      candidateId: 'phone-candidate',
      candidateName: 'Phone Candidate',
      customQuestions: [],
      resumeText: resumeText,
      status: 'active',
      startedAt: new Date().toISOString(),
      transcript: [],
      currentQuestionIndex: 0
    };

    await interviewStore.set(sessionId, session);

    // Audit Log
    await auditLogger.log({
      userId: 'anonymous', // or req.user.id if available
      action: 'phone_screen_started',
      resourceType: 'interview',
      resourceId: sessionId,
      details: { jobTitle, roomName }
    });

    res.json({
      success: true,
      sessionId,
      roomName,
      token: token,
      wsUrl: process.env.LIVEKIT_URL // Helper for frontend if needed
    });

  } catch (error: any) {
    console.error('Error starting phone screen:', error);
    res.status(500).json({ error: 'Failed to initiate phone screening session' });
  }
});

export default router;
