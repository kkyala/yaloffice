// src/services/AILiveService.ts
import { config } from '../config/appConfig';

// --- INITIALIZATION ---
// GoogleGenAI SDK initialization removed as we are now using a WebSocket proxy.

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
    return {
        voiceName: voice || selectOptimalVoice({ language }),
        languageCode: language,
        gender: 'NEUTRAL'
    };
}

// --- AUDIO & MEDIA HELPERS ---

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
    onmessage: (message: any) => Promise<void>;
    onerror: (e: Event) => void;
    onclose: (e: CloseEvent) => void;
}, sessionSettings: {
    systemInstruction: string;
    model: LiveModelName;
    voiceConfig: VoiceConfig;
    enableVideo?: boolean;
}): Promise<{
    sendRealtimeInput: (input: { media: { mimeType: string; data: string }[] }) => void;
    close: () => void;
}> {
    return new Promise((resolve, reject) => {
        const { systemInstruction, model, voiceConfig, enableVideo } = sessionSettings;

        // Connect to Backend Proxy instead of Google Direct
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host; // e.g. localhost:3000 or ngrok
        const wsUrl = `${protocol}//${host}/ws/gemini-proxy?sessionId=${Date.now()}`;

        console.log('[AILiveService] Connecting to backend proxy:', wsUrl);
        const ws = new WebSocket(wsUrl);

        // Define session object
        const session = {
            sendRealtimeInput: (input: { media: { mimeType: string; data: string }[] }) => {
                if (ws.readyState === WebSocket.OPEN) {
                    // If it's audio/pcm, send as binary for efficiency (backend handles this)
                    // But the input here is base64 string from the UI.
                    // The backend proxy expects binary for audio chunks if we want to use the optimized path,
                    // OR we can send JSON.

                    // Let's send binary for audio to match backend expectation:
                    // "if (Buffer.isBuffer(data)) { ... }"

                    const chunk = input.media[0];
                    if (chunk.mimeType.includes('audio')) {
                        // Convert base64 to binary and send
                        const binaryString = atob(chunk.data);
                        const len = binaryString.length;
                        const bytes = new Uint8Array(len);
                        for (let i = 0; i < len; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        ws.send(bytes);
                    } else {
                        // Send other types (like image/video) as JSON
                        ws.send(JSON.stringify({
                            type: 'audio', // or 'image' if we support it later
                            data: chunk.data,
                            mimeType: chunk.mimeType
                        }));
                    }
                }
            },
            close: () => {
                ws.close();
            }
        };

        ws.onopen = () => {
            console.log('[AILiveService] WebSocket connected');

            // Send start configuration to backend proxy
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

                // Map backend proxy messages to what the UI expects
                // Backend sends: { type: 'audio', audio: { data: base64 } }
                // UI expects: { serverContent: { modelTurn: { parts: [{ inlineData: { data: base64, mimeType: 'audio/pcm;rate=24000' } }] } } }

                if (message.type === 'audio' && message.audio) {
                    // Wrap in the structure the UI expects (simulating Google SDK format)
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
                    // Handle text transcript
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
                    console.error('[AILiveService] Proxy error:', message.error);
                    // callbacks.onerror(new Event('error')); // Optional: trigger error callback
                }
            } catch (err) {
                console.error('[AILiveService] Error processing message:', err);
            }
        };

        ws.onerror = (e) => {
            console.error('[AILiveService] WebSocket error:', e);
            callbacks.onerror(e);
            if (ws.readyState === WebSocket.CONNECTING) {
                reject(e);
            }
        };

        ws.onclose = (e) => {
            console.log('[AILiveService] WebSocket closed:', e.code, e.reason);
            callbacks.onclose(e);
        };
    });
}

// --- MAIN EXPORT OBJECT ---
export const aiLiveService = {
    isInitialized: () => true, // Always true now as we use backend proxy

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