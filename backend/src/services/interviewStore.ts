import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseService.js';
import { auditLogger } from './auditLogger.js';

export interface InterviewSession {
  id: string;
  roomName: string;
  jobTitle: string;
  questionCount: number;
  difficulty: string;
  candidateId?: string;
  candidateName?: string;
  customQuestions: string[];
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  startedAt: string;
  endedAt?: string;
  transcript: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
  currentQuestionIndex: number;
  analysis?: {
    score: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
  };
}

class InterviewStore {
  async set(sessionId: string, session: InterviewSession): Promise<void> {
    // Create a fresh admin client to ensure we bypass RLS
    // This is a safeguard against module initialization order issues
    const adminUrl = process.env.SUPABASE_URL;
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let client = supabase;

    if (adminUrl && adminKey) {
      client = createClient(adminUrl, adminKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    } else {
      console.warn('[InterviewStore] Service Role Key missing, using default client. RLS errors may occur.');
    }

    const { error } = await client
      .from('interviews')
      .upsert({
        id: sessionId,
        room_name: session.roomName,
        job_title: session.jobTitle,
        candidate_id: session.candidateId,
        candidate_name: session.candidateName,
        custom_questions: session.customQuestions,
        status: session.status,
        started_at: session.startedAt,
        ended_at: session.endedAt,
        transcript: session.transcript,
        current_question_index: session.currentQuestionIndex,
        analysis: session.analysis,
        question_count: session.questionCount, // Kept from original
        difficulty: session.difficulty // Kept from original
      });

    if (error) {
      console.error('Error saving interview session:', error);
      const keyPrefix = adminKey ? adminKey.substring(0, 5) + '...' : 'undefined';
      console.error(`[InterviewStore] Used key prefix: ${keyPrefix}`);
      throw error;
    }
  }

  async saveScreeningAssessment(data: {
    userId: string;
    jobTitle: string;
    jobId?: number;
    score: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    skillsAnalysis: any;
    transcript: string;
  }): Promise<void> {
    const adminUrl = process.env.SUPABASE_URL;
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let client = supabase;
    if (adminUrl && adminKey) {
      client = createClient(adminUrl, adminKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
    }

    const { error } = await client
      .from('screening_assessments')
      .insert({
        user_id: data.userId,
        job_title: data.jobTitle,
        job_id: data.jobId,
        overall_score: data.score,
        summary: data.summary,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        skills_analysis: data.skillsAnalysis,
        transcript: data.transcript
      });

    if (error) {
      console.error('Error saving screening assessment:', error);
      throw error;
    }
  }

  async get(sessionId: string): Promise<InterviewSession | undefined> {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !data) return undefined;

    return {
      id: data.id,
      roomName: data.room_name,
      jobTitle: data.job_title,
      candidateId: data.candidate_id,
      candidateName: data.candidate_name,
      status: data.status,
      questionCount: data.question_count,
      currentQuestionIndex: data.current_question_index,
      difficulty: data.difficulty,
      customQuestions: data.custom_questions,
      transcript: data.transcript,
      analysis: data.analysis,
      startedAt: data.started_at,
      endedAt: data.ended_at
    };
  }

  async delete(sessionId: string): Promise<boolean> {
    const { error } = await supabase
      .from('interviews')
      .delete()
      .eq('id', sessionId);

    return !error;
  }

  async getAll(): Promise<InterviewSession[]> {
    const { data, error } = await supabase
      .from('interviews')
      .select('*');

    if (error || !data) return [];

    return data.map(d => ({
      id: d.id,
      roomName: d.room_name,
      jobTitle: d.job_title,
      candidateId: d.candidate_id,
      candidateName: d.candidate_name,
      status: d.status,
      questionCount: d.question_count,
      currentQuestionIndex: d.current_question_index,
      difficulty: d.difficulty,
      customQuestions: d.custom_questions,
      transcript: d.transcript,
      analysis: d.analysis,
      startedAt: d.started_at,
      endedAt: d.ended_at
    }));
  }

  async getActive(): Promise<InterviewSession[]> {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('status', 'active');

    if (error || !data) return [];

    return data.map(d => ({
      id: d.id,
      roomName: d.room_name,
      jobTitle: d.job_title,
      candidateId: d.candidate_id,
      candidateName: d.candidate_name,
      status: d.status,
      questionCount: d.question_count,
      currentQuestionIndex: d.current_question_index,
      difficulty: d.difficulty,
      customQuestions: d.custom_questions,
      transcript: d.transcript,
      analysis: d.analysis,
      startedAt: d.started_at,
      endedAt: d.ended_at
    }));
  }
}

export const interviewStore = new InterviewStore();
