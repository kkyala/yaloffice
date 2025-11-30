/**
 * AI Service - Frontend Proxy
 *
 * ⚠️ SECURITY: This service proxies all AI calls to the backend.
 * NO direct Gemini API calls happen in the frontend.
 *
 * All requests go to: http://localhost:8000/api/ai/*
 *
 * Backend handles:
 * - Resume parsing (PDF, Word, Images)
 * - Resume screening and matching
 * - Interview scoring and analysis
 * - Video analysis
 * - Content generation
 */

import { Type as GoogleGenAIType, Modality as GoogleGenAIModality } from '@google/genai';

// Backend API URL - uses environment variable or defaults to localhost
const getApiBase = (): string => {
    // @ts-ignore - Vite env
    return import.meta.env?.VITE_API_URL || 'http://localhost:8000';
};

// ========================================================================================
// TYPES (kept for compatibility)
// ========================================================================================

export const AVAILABLE_VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'] as const;
export const AVAILABLE_CHAT_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'] as const;

export type VoiceName = typeof AVAILABLE_VOICES[number];
export type ChatModelName = typeof AVAILABLE_CHAT_MODELS[number];

export interface VoiceConfig {
    voiceName: VoiceName;
    languageCode: string;
    gender: 'MALE' | 'FEMALE' | 'NEUTRAL';
    pitch?: number;
    speakingRate?: number;
    audioEncoding?: 'MP3' | 'OGG_OPUS' | 'LINEAR16';
}

export interface ModelConfig {
    chatModel: ChatModelName;
}

export interface InterviewSettings {
    language: string;
    voice?: VoiceName;
    models?: ModelConfig;
    enableNativeAudio?: boolean;
}

export interface AssistantResponse {
    text: string;
}

// ========================================================================================
// VOICE SELECTION HELPERS (kept for compatibility)
// ========================================================================================

export function selectOptimalVoice(settings: Pick<InterviewSettings, 'language'>): VoiceName {
    const lang = settings.language.toLowerCase();
    if (lang.startsWith('en-gb')) return 'Charon';
    if (lang.startsWith('en')) return 'Zephyr';
    if (lang.startsWith('de') || lang.startsWith('fr') || lang.startsWith('es')) return 'Kore';
    if (lang.startsWith('ja') || lang.startsWith('ko') || lang.startsWith('zh')) return 'Puck';
    return 'Zephyr';
}

export function getVoiceConfigForLanguage(language: string, voice?: VoiceName): VoiceConfig {
    const voiceName = voice || selectOptimalVoice({ language });
    const gender = (voiceName === 'Charon' || voiceName === 'Fenrir') ? 'MALE' : 'FEMALE';

    return {
        voiceName,
        languageCode: language,
        gender: gender,
        speakingRate: 1.03,
        pitch: 0.0,
        audioEncoding: 'MP3'
    };
}

// ========================================================================================
// BACKEND PROXY FUNCTIONS
// ========================================================================================

/**
 * Parse resume document (PDF, Word, Image) - proxied to backend
 */
async function parseResumeDocument(fileBase64: string, mimeType: string): Promise<any> {
    const API_BASE = getApiBase();
    const response = await fetch(`${API_BASE}/api/ai/resume/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, mimeType })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to parse resume');
    }

    const result = await response.json();
    return result.data;
}

/**
 * Screen resume against job description - proxied to backend
 */
async function screenResume(resumeText: string, jobDescription: string): Promise<any> {
    const API_BASE = getApiBase();
    const response = await fetch(`${API_BASE}/api/ai/resume/screen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to screen resume');
    }

    const result = await response.json();
    return result.data;
}

/**
 * Score interview response - proxied to backend
 */
async function scoreResponse(question: string, response: string): Promise<{ score: number, feedback: string }> {
    const API_BASE = getApiBase();
    const res = await fetch(`${API_BASE}/api/ai/interview/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, response })
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to score response');
    }

    const result = await res.json();
    return result.data;
}

/**
 * Generate interview summary - proxied to backend
 */
async function generateInterviewSummary(transcript: string): Promise<string> {
    const API_BASE = getApiBase();
    const response = await fetch(`${API_BASE}/api/ai/interview/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate summary');
    }

    const result = await response.json();
    return result.data.summary;
}

/**
 * Analyze video - proxied to backend
 */
async function analyzeVideo(
    videoPart: { inlineData: { data: string; mimeType: string; } },
    prompt: string
): Promise<string> {
    const API_BASE = getApiBase();
    const response = await fetch(`${API_BASE}/api/ai/video/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            videoBase64: videoPart.inlineData.data,
            mimeType: videoPart.inlineData.mimeType,
            analysisPrompt: prompt
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to analyze video');
    }

    const result = await response.json();
    return result.data.analysis;
}

/**
 * Generate structured JSON content - proxied to backend
 */
async function generateJsonContent(prompt: string, responseSchema: any): Promise<any> {
    const API_BASE = getApiBase();

    // Extract expected fields from schema
    const expectedFields = responseSchema.properties ? Object.keys(responseSchema.properties) : [];

    const response = await fetch(`${API_BASE}/api/ai/generate/json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, expectedFields })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate JSON content');
    }

    const result = await response.json();
    return result.data;
}

/**
 * Generate speech - NOT IMPLEMENTED (use backend TTS or browser synthesis)
 */
async function generateSpeech(_text: string, _voice: VoiceName): Promise<string> {
    throw new Error('TTS not implemented in frontend - use backend API or browser synthesis');
}

/**
 * Browser-based speech synthesis (fallback)
 */
function synthesizeSpeech(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            return reject(new Error('Speech synthesis not supported.'));
        }

        const synth = window.speechSynthesis;
        if (!text.trim()) return resolve();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1;
        utterance.pitch = 1;

        utterance.onend = () => resolve();
        utterance.onerror = (event) => reject(event.error || 'Speech synthesis error');

        if (synth.speaking) {
            synth.cancel();
            setTimeout(() => synth.speak(utterance), 100);
        } else {
            synth.speak(utterance);
        }
    });
}

/**
 * Stub functions for compatibility (not used in LiveKit flow)
 */
function isInitialized(): boolean {
    return true; // Always return true since backend handles initialization
}

function createChatSession(_config: { systemInstruction: string, model?: string }): any {
    throw new Error('createChatSession not available in frontend - use backend API');
}

function generateText(_prompt: string, _useThinkingMode: boolean): Promise<string> {
    throw new Error('generateText not available in frontend - use backend API');
}

async function* generateTextStream(_prompt: string, _useThinkingMode: boolean): AsyncGenerator<string> {
    throw new Error('generateTextStream not available in frontend - use backend API');
}

// ========================================================================================
// EXPORT
// ========================================================================================

export const aiService = {
    // Status
    isInitialized,

    // Type exports for compatibility
    GoogleGenAIType,
    GoogleGenAIModality,

    // Backend-proxied functions
    parseResumeDocument,
    screenResume,
    scoreResponse,
    generateInterviewSummary,
    analyzeVideo,
    generateJsonContent,

    // Speech
    generateSpeech,
    synthesizeSpeech,

    // Voice helpers
    selectOptimalVoice,
    getVoiceConfigForLanguage,

    // Stub functions (throw errors - use backend instead)
    createChatSession,
    generateText,
    generateTextStream,

    // Screening
    startScreening,
    chatScreening,
};

/**
 * Start screening session - proxied to backend
 */
async function startScreening(resumeText: string, candidateName: string): Promise<{ greeting: string; firstQuestion: string }> {
    const API_BASE = getApiBase();
    const response = await fetch(`${API_BASE}/api/ai/screening/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, candidateName })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start screening');
    }

    const result = await response.json();
    return result.data;
}

/**
 * Chat screening - proxied to backend
 */
async function chatScreening(history: { role: string; content: string }[], userResponse: string): Promise<{ aiResponse: string; isComplete: boolean }> {
    const API_BASE = getApiBase();
    const response = await fetch(`${API_BASE}/api/ai/screening/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, userResponse })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to chat');
    }

    const result = await response.json();
    return result.data;
}
