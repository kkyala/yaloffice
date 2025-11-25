/**
 * In-memory interview session store
 *
 * For production, replace with Redis or database storage
 */

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
  private sessions: Map<string, InterviewSession> = new Map();

  set(sessionId: string, session: InterviewSession): void {
    this.sessions.set(sessionId, session);
  }

  get(sessionId: string): InterviewSession | undefined {
    return this.sessions.get(sessionId);
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  getAll(): InterviewSession[] {
    return Array.from(this.sessions.values());
  }

  getActive(): InterviewSession[] {
    return this.getAll().filter(s => s.status === 'active');
  }
}

export const interviewStore = new InterviewStore();
