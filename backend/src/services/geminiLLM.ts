/**
 * Gemini Flash 2.0 LLM Service
 *
 * Handles interview logic and question generation using Gemini Flash.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const INTERVIEW_SYSTEM_INSTRUCTION = `You are the AI Interviewer for Yāl Office. Conduct a professional, friendly, and encouraging technical interview for the role provided in the input. Behaviours:

- Always ask one question at a time. Keep spoken output short and natural (2–3 short sentences max).
- Begin with a warm greeting, then the first question.
- If the candidate asks for the answer, do NOT provide it. Instead say encouraging guidance (e.g., "Nice question — try your best and explain your thought process.").
- If the candidate's answer is partial/incorrect, ask a targeted follow-up that helps them explain their thought process (e.g., "Can you explain what happens if X occurs?").
- Avoid scoring or stating pass/fail during the conversation. Do not reveal internal logic or score.
- Use plain language; emphasize clarity. When switching topics, briefly signal the change (e.g., "Now, moving on to backend architecture…").
- When the interview completes, conclude with appreciation ("Thanks — that concludes this interview. We'll share next steps soon.").
- Output MUST be only the interviewer utterance text (no metadata, no JSON, no analysis).`;

class GeminiLLMService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private initialized: boolean = false;

  /**
   * Lazy initialization - call this before using the service
   */
  private initialize(): void {
    if (this.initialized) return;

    const apiKey = process.env.GEMINI_API_KEY;
    console.log('[GeminiLLM] Initializing with API key:', apiKey ? 'present' : 'missing');

    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Use the REST API model (not the Live WebSocket model)
      const restModel = 'gemini-2.0-flash-exp'; // REST API model
      this.model = this.genAI.getGenerativeModel({
        model: restModel,
        systemInstruction: INTERVIEW_SYSTEM_INSTRUCTION
      });
      console.log('[GeminiLLM] Initialized successfully with model:', restModel);
    } else {
      console.error('[GeminiLLM] GEMINI_API_KEY not found in environment');
    }

    this.initialized = true;
  }

  /**
   * Generate interviewer response based on conversation history
   */
  async generateInterviewResponse(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    jobTitle: string
  ): Promise<string> {
    this.initialize();

    if (!this.model) {
      throw new Error('Gemini LLM not initialized - check GEMINI_API_KEY in .env');
    }

    // Build chat history for context
    const history = conversationHistory.map(msg => ({
      role: msg.role === 'candidate' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const chat = this.model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.7
      }
    });

    const result = await chat.sendMessage(userMessage);
    const response = result.response.text();

    return response;
  }

  /**
   * Analyze completed interview and generate score
   */
  async analyzeInterview(
    transcript: string,
    jobTitle: string
  ): Promise<{
    score: number;
    summary: string;
    strengths: string[];
    improvements: string[];
  }> {
    this.initialize();

    if (!this.genAI) {
      throw new Error('Gemini LLM not initialized - check GEMINI_API_KEY in .env');
    }

    // Use REST API model for analysis
    const analysisModel = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp'
    });

    const prompt = `Analyze this interview transcript for a "${jobTitle}" position.

Transcript:
${transcript}

Provide a JSON response with:
- score: number from 1.0 to 10.0
- summary: 2-3 sentence overall assessment
- strengths: array of 2-3 strong points
- improvements: array of 2-3 areas to improve

Respond ONLY with valid JSON, no markdown.`;

    const result = await analysisModel.generateContent(prompt);
    const responseText = result.response.text();

    try {
      // Clean potential markdown code blocks
      const cleanJson = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      return JSON.parse(cleanJson);
    } catch (err) {
      console.error('Failed to parse analysis:', err);
      return {
        score: 5.0,
        summary: 'Analysis could not be completed.',
        strengths: [],
        improvements: []
      };
    }
  }

  /**
   * Generate TTS-friendly text for a response
   */
  async generateTTSText(text: string): Promise<string> {
    // For TTS, we want clean, speakable text
    // Remove any markdown, code blocks, etc.
    return text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]*`/g, '') // Remove inline code
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italics
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .trim();
  }
}

export const geminiLLMService = new GeminiLLMService();
