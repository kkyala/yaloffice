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
    improvements: string[];
  };
}

class InterviewStore {
  async set(sessionId: string, session: InterviewSession): Promise<void> {
    const { error } = await supabase
      .from('interviews')
      .upsert({
        id: sessionId,
        room_name: session.roomName,
        job_title: session.jobTitle,
        candidate_id: session.candidateId,
        candidate_name: session.candidateName,
        status: session.status,
        question_count: session.questionCount,
        current_question_index: session.currentQuestionIndex,
        difficulty: session.difficulty,
        custom_questions: session.customQuestions,
        transcript: session.transcript,
        analysis: session.analysis,
        started_at: session.startedAt,
        ended_at: session.endedAt
      });

    if (error) {
      console.error('Error saving interview session:', error);
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
