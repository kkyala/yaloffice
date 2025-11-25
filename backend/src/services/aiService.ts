/**
 * AI Service - Backend Implementation
 *
 * Handles all AI functionality including:
 * - Resume parsing (PDF, Word, Images)
 * - Resume screening and matching
 * - Interview scoring and analysis
 * - Video analysis
 * - Text-to-speech generation
 * - General content generation
 *
 * This service consolidates all Gemini API calls on the backend.
 */

import { GoogleGenerativeAI, GenerateContentResponse } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// ========================================================================================
// TYPES
// ========================================================================================

export type VoiceName = 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';
export type ChatModelName = 'gemini-2.0-flash-exp' | 'gemini-2.5-flash' | 'gemini-2.5-pro';

export interface ResumeData {
  personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    city?: string;
    state?: string;
  };
  summary: string;
  experience: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year: string;
  }>;
  skills: string[];
  certifications?: string[];
}

export interface ResumeScreeningResult {
  matchScore: number;
  summary: string;
  experience: string[];
  skills: string[];
  education: string[];
}

export interface InterviewScore {
  score: number;
  feedback: string;
}

// ========================================================================================
// AI SERVICE CLASS
// ========================================================================================

class AIService {
  private genAI: GoogleGenerativeAI | null = null;
  private initialized: boolean = false;

  /**
   * Initialize the Gemini AI client
   */
  private initialize(): void {
    if (this.initialized) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[AIService] GEMINI_API_KEY not found in environment');
      throw new Error('GEMINI_API_KEY not configured');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.initialized = true;
    console.log('[AIService] Initialized successfully');
  }

  /**
   * Normalize MIME types for document parsing
   */
  private normalizeMime(mime: string): string {
    if (!mime) return 'application/octet-stream';

    const lower = mime.toLowerCase();

    if (lower.includes('pdf')) return 'application/pdf';
    if (lower.includes('msword')) return 'application/msword';
    if (lower.includes('wordprocessingml')) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    if (lower.startsWith('image/')) return mime;

    // Fallback for renamed Word files
    if (lower.endsWith('.docx')) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    if (lower.endsWith('.doc')) {
      return 'application/msword';
    }

    return mime;
  }

  /**
   * Clean base64 data
   */
  private cleanBase64(data: string): string {
    return data.replace(/\s+/g, '');
  }

  /**
   * Parse resume document (PDF, Word, Image)
   */
  async parseResumeDocument(fileBase64: string, mimeType: string): Promise<ResumeData> {
    this.initialize();

    if (!this.genAI) {
      throw new Error('AI Service not initialized');
    }

    const safeMime = this.normalizeMime(mimeType);
    const safeData = this.cleanBase64(fileBase64);

    const isWord =
      safeMime === 'application/msword' ||
      safeMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const prompt = isWord
      ? `Parse this Word resume into structured JSON with: personalInfo, summary, experience[], education[], skills[].`
      : `Parse this resume (PDF/Image) into structured JSON with: personalInfo, summary, experience[], education[], skills[].`;

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp'
    });

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType: safeMime, data: safeData } }
    ]);

    const response = await result.response;
    let jsonText = response.text().trim();

    // Clean markdown code blocks
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json/, '').replace(/```$/, '').trim();
    }
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    try {
      return JSON.parse(jsonText);
    } catch (err) {
      // Try to extract JSON from response
      const fallback = jsonText.match(/\{[\s\S]*\}/);
      if (fallback) {
        return JSON.parse(fallback[0]);
      }
      throw new Error('Failed to parse resume JSON from AI response');
    }
  }

  /**
   * Screen resume against job description
   */
  async screenResume(resumeText: string, jobDescription: string): Promise<ResumeScreeningResult> {
    this.initialize();

    if (!this.genAI) {
      throw new Error('AI Service not initialized');
    }

    const prompt = `Match resume to job:\n\nResume:${resumeText}\n\nJob:${jobDescription}\n\nProvide JSON with: matchScore (0-100), summary, experience[], skills[], education[]`;

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp'
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text().trim();

    // Clean markdown
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json/, '').replace(/```$/, '').trim();
    }

    return JSON.parse(jsonText);
  }

  /**
   * Score interview response
   */
  async scoreResponse(question: string, response: string): Promise<InterviewScore> {
    this.initialize();

    if (!this.genAI) {
      throw new Error('AI Service not initialized');
    }

    const prompt = `Based on the interview question: "${question}", analyze the candidate's response: "${response}". Provide JSON with: score (1-10), feedback (string)`;

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp'
    });

    const result = await model.generateContent(prompt);
    const response_text = (await result.response).text().trim();

    let jsonText = response_text;
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json/, '').replace(/```$/, '').trim();
    }

    return JSON.parse(jsonText);
  }

  /**
   * Generate interview summary from transcript
   */
  async generateInterviewSummary(transcript: string): Promise<string> {
    this.initialize();

    if (!this.genAI) {
      throw new Error('AI Service not initialized');
    }

    const prompt = `Summarize this interview transcript in 2-3 paragraphs:\n\n${transcript}`;

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp'
    });

    const result = await model.generateContent(prompt);
    return (await result.response).text();
  }

  /**
   * Analyze video content
   */
  async analyzeVideo(
    videoBase64: string,
    mimeType: string,
    analysisPrompt: string
  ): Promise<string> {
    this.initialize();

    if (!this.genAI) {
      throw new Error('AI Service not initialized');
    }

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp'
    });

    const result = await model.generateContent([
      { text: analysisPrompt },
      { inlineData: { mimeType, data: videoBase64 } }
    ]);

    return (await result.response).text();
  }

  /**
   * Generate speech audio (Text-to-Speech)
   */
  async generateSpeech(text: string, voice: VoiceName = 'Puck'): Promise<string> {
    this.initialize();

    if (!this.genAI) {
      throw new Error('AI Service not initialized');
    }

    // Note: This requires gemini-2.5-flash-preview-tts model
    // Fallback to text if TTS not available
    throw new Error('TTS not implemented - use Gemini Live for audio');
  }

  /**
   * Generate JSON content with structured schema
   */
  async generateJsonContent(prompt: string, expectedFields: string[]): Promise<any> {
    this.initialize();

    if (!this.genAI) {
      throw new Error('AI Service not initialized');
    }

    const enhancedPrompt = `${prompt}\n\nRespond with ONLY valid JSON containing these fields: ${expectedFields.join(', ')}`;

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp'
    });

    const result = await model.generateContent(enhancedPrompt);
    let jsonText = (await result.response).text().trim();

    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json/, '').replace(/```$/, '').trim();
    }

    return JSON.parse(jsonText);
  }
}

export const aiService = new AIService();
