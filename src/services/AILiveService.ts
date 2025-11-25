

// src/services/AILiveService.ts
import { GoogleGenAI, Modality as GoogleGenAIModality, Blob as GeminiBlob, LiveServerMessage } from '@google/genai';
import { config } from '../config/appConfig';

// --- INITIALIZATION ---
let ai: GoogleGenAI | null = null;
try {
    if (process.env.API_KEY) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } else {
        console.error("API_KEY environment variable not set for AILiveService.");
    }
} catch (error) {
    console.error("Failed to initialize GoogleGenAI in AILiveService:", error);
}

// --- CONSTANTS & CONFIGURATION ---

export const AVAILABLE_LIVE_MODELS = ['gemini-2.5-flash-native-audio-preview-09-2025'] as const;
export const AVAILABLE_VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'] as const; // Standard voices

export type VoiceName = typeof AVAILABLE_VOICES[number];
export type LiveModelName = typeof AVAILABLE_LIVE_MODELS[number];

/**
 * Defines the configuration for Text-to-Speech (TTS) voice generation.
 */
export interface VoiceConfig {
  voiceName: VoiceName;
  languageCode: string;
  gender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  pitch?: number;
  speakingRate?: number;
  audioEncoding?: 'MP3' | 'OGG_OPUS' | 'LINEAR16';
}

// --- DYNAMIC VOICE SELECTION ---

export function selectOptimalVoice(settings: { language: string }): VoiceName {
    const lang = settings.language.toLowerCase();
    if (lang.startsWith('en-gb')) return 'Charon';
    if (lang.startsWith('en')) return 'Zephyr';
    if (lang.startsWith('de') || lang.startsWith('fr') || lang.startsWith('es')) return 'Kore';
    if (lang.startsWith('ja') || lang.startsWith('ko') || lang.startsWith('zh')) return 'Puck';
    return 'Zephyr';
}

export function getVoiceConfigForLanguage(language: string, voice?: VoiceName): VoiceConfig {
    const voiceName = voice || selectOptimalVoice({ language });
    const gender = (voiceName === 'Charon' || voiceName === 'Fenrir') ? 'MALE' : 'FEMALE'; // Simplified
    
    return {
        voiceName,
        languageCode: language,
        gender: gender === 'MALE' ? 'MALE' : 'FEMALE',
        speakingRate: 1.03,
        pitch: 0.0,
        audioEncoding: 'MP3'
    };
}

// --- AUDIO & MEDIA HELPERS ---

/**
 * Encodes a Uint8Array to a Base64 string.
 */
export function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
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
    if (!videoElement || !canvasElement) {
        throw new Error("Video or canvas element not provided.");
    }

    const context = canvasElement.getContext('2d');
    if (!context) {
        throw new Error("Could not get 2D context from canvas.");
    }

    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    context.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);
    
    // Using toDataURL for direct Base64, more efficient than toBlob for single frames.
    const dataURL = canvasElement.toDataURL('image/jpeg', jpegQuality);
    return dataURL.split(',')[1]; // Return only the Base64 data
};


// --- LIVE REAL-TIME SESSION ---

/**
 * Establishes a real-time, bidirectional connection for Gemini Live conversations,
 * capable of handling both audio and optional video (image frames).
 * @param callbacks Event handlers for open, message, error, and close events.
 * @param sessionSettings Configuration for the live session, including system prompt and voice.
 * @returns A promise that resolves with the live session object.
 */
export function createLiveSession(callbacks: {
    onopen: () => void;
    onmessage: (message: LiveServerMessage) => Promise<void>;
    onerror: (e: ErrorEvent) => void;
    onclose: (e: CloseEvent) => void;
}, sessionSettings: {
    systemInstruction: string;
    model: LiveModelName;
    voiceConfig: VoiceConfig;
    enableVideo?: boolean; // New flag to enable video stream support
}) {
    if (!ai) throw new Error("AI Service not initialized in AILiveService.");
    
    const { systemInstruction, model, voiceConfig, enableVideo } = sessionSettings;

    return ai.live.connect({
        model: model,
        callbacks,
        config: {
            responseModalities: [GoogleGenAIModality.AUDIO], // Gemini Live currently only returns audio
            speechConfig: { 
                voiceConfig: { 
                    prebuiltVoiceConfig: { voiceName: voiceConfig.voiceName }
                }
            },
            systemInstruction: systemInstruction,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            // FIX: Removed visualConfig. Video streaming is handled by sending image/jpeg via sendRealtimeInput.
            // visualConfig: enableVideo ? {} : undefined, 
        },
    });
}

// --- MAIN EXPORT OBJECT ---
export const aiLiveService = {
    isInitialized: () => !!ai,
    
    // Configs
    AVAILABLE_LIVE_MODELS,
    AVAILABLE_VOICES,
    selectOptimalVoice,
    getVoiceConfigForLanguage,

    // Media Helpers
    encode,
    decode,
    decodeAudioData,
    blobToBase64,
    captureVideoFrame,

    // Core Live Session
    createLiveSession,
};