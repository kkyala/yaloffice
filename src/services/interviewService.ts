/**
 * Interview Service
 *
 * Frontend service for managing AI interview sessions.
 * Communicates with backend API and Gemini Live WebSocket proxy.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export interface InterviewConfig {
  roomName: string;
  jobTitle: string;
  questionCount: number;
  difficulty: string;
  candidateId: string;
  candidateName: string;
  customQuestions?: string[];
}

export interface InterviewSession {
  sessionId: string;
  roomName: string;
  greeting: string;
  wsUrl: string;
}

export interface TranscriptEntry {
  speaker: 'interviewer' | 'candidate';
  text: string;
  timestamp: string;
  isFinal: boolean;
}

export interface InterviewAnalysis {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

class InterviewService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private sessionId: string | null = null;

  /**
   * Helper to construct API URL
   */
  private getApiUrl(endpoint: string): string {
    if (API_BASE.endsWith('/api')) {
      return `${API_BASE}${endpoint.replace(/^\/api/, '')}`;
    }
    return `${API_BASE}${endpoint}`;
  }

  /**
   * Start a new interview session
   */
  async startInterview(config: InterviewConfig): Promise<InterviewSession> {
    const response = await fetch(this.getApiUrl('/api/interview/start'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      throw new Error('Failed to start interview');
    }

    const data = await response.json();
    this.sessionId = data.sessionId;
    return data;
  }

  /**
   * Connect to Gemini Live WebSocket proxy
   */
  connectToGeminiProxy(
    sessionId: string,
    callbacks: {
      onTranscript: (entry: TranscriptEntry) => void;
      onAudio: (audioData: ArrayBuffer) => void;
      onError: (error: Error) => void;
      onClose: () => void;
    }
  ): void {
    const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    let wsUrl = '';
    if (wsBase.startsWith('ws')) {
      wsUrl = `${wsBase}/ws/gemini-proxy?sessionId=${sessionId}`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}${wsBase}/gemini-proxy?sessionId=${sessionId}`;
    }
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[InterviewService] Connected to Gemini proxy');
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'transcript') {
          callbacks.onTranscript({
            speaker: message.transcript.speaker === 'model' ? 'interviewer' : 'candidate',
            text: message.transcript.text,
            timestamp: new Date().toISOString(),
            isFinal: message.transcript.isFinal
          });
        } else if (message.type === 'audio' && message.audio?.data) {
          // Decode base64 audio and play
          const audioData = this.base64ToArrayBuffer(message.audio.data);
          callbacks.onAudio(audioData);
          this.playAudio(audioData);
        } else if (message.type === 'error') {
          callbacks.onError(new Error(message.error.message));
        }
      } catch (err) {
        console.error('[InterviewService] Error parsing message:', err);
      }
    };

    this.ws.onerror = (event) => {
      callbacks.onError(new Error('WebSocket error'));
    };

    this.ws.onclose = () => {
      callbacks.onClose();
    };
  }

  /**
   * Send audio data to Gemini
   */
  sendAudio(audioData: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Send as binary
      this.ws.send(audioData);
      console.log(`[InterviewService] Sent audio: ${audioData.byteLength} bytes`);
    } else {
      console.log(`[InterviewService] WS not open, state: ${this.ws?.readyState}`);
    }
  }

  /**
   * Send text message to Gemini
   */
  sendText(text: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'text', text }));
    }
  }

  /**
   * Signal end of user turn
   */
  endTurn(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'end_turn' }));
    }
  }

  /**
   * Stop the interview and get analysis
   */
  async stopInterview(): Promise<{
    transcript: TranscriptEntry[];
    analysis: InterviewAnalysis;
  }> {
    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (!this.sessionId) {
      throw new Error('No active session');
    }

    const response = await fetch(this.getApiUrl('/api/interview/stop'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.sessionId })
    });

    if (!response.ok) {
      throw new Error('Failed to stop interview');
    }

    const data = await response.json();
    this.sessionId = null;
    return data;
  }

  /**
   * Get interview status
   */
  async getStatus(sessionId: string): Promise<{
    status: string;
    currentQuestionIndex: number;
    questionCount: number;
  }> {
    const response = await fetch(this.getApiUrl(`/api/interview/status/${sessionId}`));

    if (!response.ok) {
      throw new Error('Failed to get status');
    }

    return response.json();
  }

  /**
   * Play audio data through speakers with proper queuing
   */
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying: boolean = false;
  private nextPlayTime: number = 0;

  private async playAudio(audioData: ArrayBuffer): Promise<void> {
    // Queue the audio
    this.audioQueue.push(audioData);
    console.log(`[InterviewService] Audio queued, queue size: ${this.audioQueue.length}`);

    // Start processing if not already playing
    if (!this.isPlaying) {
      this.processAudioQueue();
    }
  }

  private async processAudioQueue(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;

    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }

    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const audioData = this.audioQueue.shift()!;

    try {
      // Decode PCM audio (16-bit, mono, 24000 Hz from Gemini)
      const int16Array = new Int16Array(audioData);
      const float32Array = new Float32Array(int16Array.length);

      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      // Create buffer at 24000 Hz (Gemini's output rate)
      const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;

      // Slow down playback rate to 0.9 for clearer speech
      source.playbackRate.value = 0.9;

      source.connect(this.audioContext.destination);

      // Schedule playback to avoid gaps/overlaps
      const currentTime = this.audioContext.currentTime;
      const startTime = Math.max(currentTime, this.nextPlayTime);
      const duration = audioBuffer.duration / source.playbackRate.value;

      source.start(startTime);
      this.nextPlayTime = startTime + duration;

      console.log(`[InterviewService] Playing audio chunk, duration: ${duration.toFixed(2)}s`);

      // Process next chunk after this one finishes
      source.onended = () => {
        this.processAudioQueue();
      };
    } catch (err) {
      console.error('[InterviewService] Error playing audio:', err);
      this.isPlaying = false;
      // Try next chunk
      this.processAudioQueue();
    }
  }

  /**
   * Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    console.log('[InterviewService] Disconnecting...');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.sessionId = null;
    this.audioQueue = [];
    this.isPlaying = false;
    this.nextPlayTime = 0;
  }
}

export const interviewService = new InterviewService();
