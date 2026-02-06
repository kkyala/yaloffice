/**
 * AI Service - Frontend Proxy
 * 
 * ⚠️ SECURITY: This service proxies all AI calls to the backend.
 * NO direct API calls to AI providers (Gemini, OpenAI, etc.) happen in the frontend.
 * 
 * All requests go to: /api/ai/* (prefixed by API_BASE)
 */

import { api } from './api';

// --- GENERIC AI TYPE DEFINITIONS ---
export const AISchemaType = {
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    INTEGER: 'INTEGER',
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
    OBJECT: 'OBJECT'
} as const;

export const AIModality = {
    TEXT: 'TEXT',
    IMAGE: 'IMAGE',
    AUDIO: 'AUDIO',
    VIDEO: 'VIDEO'
} as const;

// --- CONSTANTS & CONFIGURATION ---

export const AVAILABLE_LIVE_MODELS = ['voice-optimized', 'standard'] as const;
export const AVAILABLE_VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'] as const;

export type VoiceName = typeof AVAILABLE_VOICES[number];
export type LiveModelName = typeof AVAILABLE_LIVE_MODELS[number];

export interface VoiceConfig {
    voiceName: VoiceName;
    languageCode: string;
    gender: 'MALE' | 'FEMALE' | 'NEUTRAL';
    pitch?: number;
    speakingRate?: number;
    audioEncoding?: 'MP3' | 'OGG_OPUS' | 'LINEAR16';
}

export interface InterviewSettings {
    language: string;
    voice?: VoiceName;
    enableNativeAudio?: boolean;
}

// ========================================================================================
// VOICE HELPERS
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
        speakingRate: 1.0,
        pitch: 0.0,
        audioEncoding: 'MP3'
    };
}

// ========================================================================================
// MEDIA HELPERS
// ========================================================================================

/**
 * Encodes a Uint8Array to a Base64 string.
 */
export function encode(data: Uint8Array): string {
    let binary = '';
    const len = data.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(data[i]);
    }
    return btoa(binary);
}

/**
 * Decodes a Base64 string to a Uint8Array.
 */
export function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Decodes raw PCM audio data into an AudioBuffer.
 */
export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

/**
 * Converts a File or Blob object to a Base64 string.
 */
export const blobToBase64 = (blob: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]); // Remove data URL prefix
            } else {
                reject(new Error('Failed to read blob as base64 string.'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Captures a single video frame from a HTMLVideoElement and returns it as a Base64 JPEG string.
 */
export const captureVideoFrame = (videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement, jpegQuality: number = 0.7): string => {
    if (!videoElement || !canvasElement) throw new Error("Video or canvas element not provided.");

    const context = canvasElement.getContext('2d');
    if (!context) throw new Error("Could not get 2D context from canvas.");

    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    context.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);

    const dataURL = canvasElement.toDataURL('image/jpeg', jpegQuality);
    return dataURL.split(',')[1];
};

// ========================================================================================
// LIVE SESSION (WEBSOCKET)
// ========================================================================================

/**
 * Establishes a real-time, bidirectional connection for Gemini Live conversations,
 * capable of handling both audio and optional video (image frames).
 */
export function createLiveSession(callbacks: {
    onopen: () => void;
    onmessage: (message: any) => Promise<void>;
    onerror: (e: Event) => void;
    onclose: (e: CloseEvent) => void;
}, sessionSettings: {
    systemInstruction: string;
    model: LiveModelName;
    voiceConfig: VoiceConfig;
    enableVideo?: boolean;
}): Promise<{
    sendRealtimeInput: (input: { media?: { mimeType?: string; data?: string } | { mimeType?: string; data?: string }[]; text?: string }) => void;
    close: () => void;
}> {
    return new Promise((resolve, reject) => {
        const { systemInstruction, model, voiceConfig } = sessionSettings;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws/gemini-proxy?sessionId=${Date.now()}`;

        console.log('[AIService] Connecting to backend proxy:', wsUrl);
        const ws = new WebSocket(wsUrl);

        const session = {
            sendRealtimeInput: (input: { media?: { mimeType: string; data: string } | { mimeType: string; data: string }[]; text?: string }) => {
                if (ws.readyState === WebSocket.OPEN) {
                    if (input.text) {
                        ws.send(JSON.stringify({
                            type: 'text',
                            text: input.text
                        }));
                        return;
                    }

                    if (input.media) {
                        const chunk = Array.isArray(input.media) ? input.media[0] : input.media;
                        if (chunk && chunk.mimeType && chunk.data) {
                            if (chunk.mimeType.includes('audio')) {
                                const binaryString = atob(chunk.data);
                                const len = binaryString.length;
                                const bytes = new Uint8Array(len);
                                for (let i = 0; i < len; i++) {
                                    bytes[i] = binaryString.charCodeAt(i);
                                }
                                if (Math.random() < 0.02) {
                                    console.log(`[AIService] Sending ${bytes.length} bytes of audio to backend`);
                                }
                                ws.send(bytes);
                            } else {
                                ws.send(JSON.stringify({
                                    type: 'audio',
                                    data: chunk.data,
                                    mimeType: chunk.mimeType
                                }));
                            }
                        }
                    }
                }
            },
            close: () => {
                ws.close();
            }
        };

        ws.onopen = () => {
            console.log('[AIService] WebSocket connected');
            const startConfig = {
                type: 'start',
                config: {
                    systemInstruction: systemInstruction,
                    model: model,
                    voiceName: voiceConfig.voiceName
                }
            };
            ws.send(JSON.stringify(startConfig));
            callbacks.onopen();
            resolve(session);
        };

        ws.onmessage = async (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'audio' && message.audio) {
                    await callbacks.onmessage({
                        serverContent: {
                            modelTurn: {
                                parts: [{
                                    inlineData: {
                                        mimeType: message.audio.mimeType || 'audio/pcm;rate=24000',
                                        data: message.audio.data
                                    }
                                }]
                            },
                            turnComplete: false
                        }
                    });
                } else if (message.type === 'transcript' && message.transcript) {
                    await callbacks.onmessage({
                        serverContent: {
                            modelTurn: {
                                parts: [{
                                    text: message.transcript.text
                                }]
                            },
                            turnComplete: message.transcript.isFinal
                        }
                    });
                } else if (message.type === 'error') {
                    console.error('[AIService] Proxy error:', message.error);
                }
            } catch (err) {
                console.error('[AIService] Error processing message:', err);
            }
        };

        ws.onerror = (e) => {
            console.error('[AIService] WebSocket error:', e);
            callbacks.onerror(e);
            if (ws.readyState === WebSocket.CONNECTING) {
                reject(e);
            }
        };

        ws.onclose = (e) => {
            console.log('[AIService] WebSocket closed:', e.code, e.reason);
            callbacks.onclose(e);
        };
    });
}


// ========================================================================================
// REST BACKEND PROXY
// ========================================================================================

async function requestBackend(endpoint: string, body: any): Promise<any> {
    // Uses the API service to handle token, headers, and base URL logic automatically
    const { data, error } = await api.post(`/ai/${endpoint}`, body);

    if (error) {
        throw error;
    }

    // Unwrap standard backend response format: { success: true, data: ... }
    if (data && data.success && data.data) {
        return data.data;
    }

    return data;
}

/**
 * Parse resume document (PDF, Word, Image)
 */
async function parseResumeDocument(fileBase64: string, mimeType: string): Promise<any> {
    return requestBackend('resume/parse', { fileBase64, mimeType });
}

/**
 * Screen resume against job description
 */
async function screenResume(resumeText: string, jobDescription: string): Promise<any> {
    return requestBackend('resume/screen', { resumeText, jobDescription });
}

/**
 * Score interview response
 */
async function scoreResponse(question: string, response: string): Promise<{ score: number, feedback: string }> {
    return requestBackend('interview/score', { question, response });
}

/**
 * Generate interview summary
 */
async function generateInterviewSummary(transcript: string): Promise<string> {
    const data = await requestBackend('interview/summary', { transcript });
    return data.summary;
}

/**
 * Analyze video
 */
async function analyzeVideo(
    videoPart: { inlineData: { data: string; mimeType: string; } },
    prompt: string
): Promise<string> {
    const data = await requestBackend('video/analyze', {
        videoBase64: videoPart.inlineData.data,
        mimeType: videoPart.inlineData.mimeType,
        analysisPrompt: prompt
    });
    return data.analysis;
}

/**
 * Generate structured JSON content
 */
async function generateJsonContent(prompt: string, responseSchema: any): Promise<any> {
    const expectedFields = responseSchema.properties ? Object.keys(responseSchema.properties) : [];
    return requestBackend('generate/json', { prompt, expectedFields });
}

/**
 * Generate text - proxied to backend
 */
async function generateText(prompt: string, useThinkingMode: boolean = false): Promise<string> {
    const data = await requestBackend('generate/text', { prompt, useThinkingMode });
    return data.text;
}

/**
 * Generate text stream - proxied to backend (currently simulated stream)
 */
async function* generateTextStream(prompt: string, useThinkingMode: boolean = false): AsyncGenerator<string> {
    const text = await generateText(prompt, useThinkingMode);
    yield text;
}

/**
 * Start screening session
 */
async function startScreening(resumeText: string, candidateName: string): Promise<{ greeting: string; firstQuestion: string }> {
    return requestBackend('screening/start', { resumeText, candidateName });
}

/**
 * Chat screening
 */
async function chatScreening(history: { role: string; content: string }[], userResponse: string): Promise<{ aiResponse: string; isComplete: boolean }> {
    return requestBackend('screening/chat', { history, userResponse });
}

/**
 * Finalize screening
 */
async function finalizeScreening(transcript: string, candidateName: string, userId: string, jobTitle?: string, jobId?: number): Promise<any> {
    return requestBackend('screening/finalize', { transcript, candidateName, userId, jobTitle, jobId });
}

/**
 * Start Phone Screening Call
 */
async function startPhoneScreening(phoneNumber: string, resumeText: string, jobTitle?: string): Promise<{ success: boolean; sessionId: string; status: string; token?: string; roomName?: string; wsUrl?: string }> {
    return requestBackend('interview/start-phone-screen', { phoneNumber, resumeText, jobTitle });
}

/**
 * Get Interview Status (Polling)
 */
async function getInterviewStatus(sessionId: string): Promise<any> {
    const { data, error } = await api.get(`/interview/status/${sessionId}`);
    if (error) throw error;
    if (data && data.success && data.data) return data.data; // Handle unwrapping if needed
    return data;
}


// ========================================================================================
// FALLBACKS & UTILS
// ========================================================================================

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


// ========================================================================================
// EXPORT
// ========================================================================================

export const aiService = {
    // Initialization check (always true for backend proxy)
    isInitialized: () => true,

    // Generic Types
    AISchemaType,
    AIModality,
    AVAILABLE_LIVE_MODELS,
    AVAILABLE_VOICES,

    // Backend-proxied functions
    parseResumeDocument,
    screenResume,
    scoreResponse,
    generateInterviewSummary,
    analyzeVideo,
    generateJsonContent,
    generateText,
    generateTextStream,

    // Screening
    startScreening,
    chatScreening,
    finalizeScreening,
    startPhoneScreening,
    getInterviewStatus,

    // Live Session & Media
    createLiveSession,
    encode,
    decode,
    decodeAudioData,
    blobToBase64,
    captureVideoFrame,

    // Client-side utils
    synthesizeSpeech,
    selectOptimalVoice,
    getVoiceConfigForLanguage,
};
