
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAI } from '../context/AIProvider';
import { aiService, type VoiceName, AVAILABLE_VOICES, AVAILABLE_LIVE_MODELS } from '../services/aiService';
import { MicOnIcon, MicOffIcon, VideoOnIcon, VideoOffIcon, ScreenShareIcon, RobotIcon, PhoneOffIcon } from '../components/Icons';
import { config } from '../config/appConfig';
import { LiveServerMessage, Blob } from '../types/ai';

type SessionState = 'idle' | 'connecting' | 'active' | 'error';
type Transcript = { id: number; sender: 'user' | 'agent'; text: string };
type LiveSession = {
    close: () => void;
    sendRealtimeInput: (input: { media: Blob }) => void;
};

// --- AUDIO & MEDIA HELPERS ---
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
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

// --- COMPONENT ---
export default function RecruiterVoiceAgentScreen() {
    const { isReady, reportInvalidApiKey } = useAI();

    // Session and UI State
    const [sessionState, setSessionState] = useState<SessionState>('idle');
    const [systemInstruction, setSystemInstruction] = useState(config.ai.interview.systemInstruction);
    const [isMicOn, setIsMicOn] = useState(true);
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const [currentTurn, setCurrentTurn] = useState({ user: '', agent: '' });
    const [error, setError] = useState('');
    const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Zephyr');

    // Refs
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef(0);
    const liveSessionRef = useRef<LiveSession | null>(null);

    // Initial check
    useEffect(() => {
        if (!isReady) {
            // Context handles the error banner
        }
    }, [isReady]);

    const cleanupAudioResources = useCallback(() => {
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessorRef.current?.disconnect();
        mediaStreamSourceRef.current?.disconnect();

        if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close().catch(console.error);
        if (outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close().catch(console.error);

        for (const source of outputSourcesRef.current.values()) {
            try { source.stop(); } catch (e) { }
        }
        outputSourcesRef.current.clear();

        liveSessionRef.current?.close();
        liveSessionRef.current = null;
        sessionPromiseRef.current = null;

        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        nextStartTimeRef.current = 0;
    }, []);

    const playAudio = useCallback(async (base64Audio: string) => {
        if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioCtx = outputAudioContextRef.current;
        const decodedBytes = decode(base64Audio);
        if (decodedBytes.length === 0) return;
        const audioBuffer = await decodeAudioData(decodedBytes, audioCtx, 24000, 1);

        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtx.currentTime);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.addEventListener('ended', () => {
            outputSourcesRef.current.delete(source);
        });

        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
        outputSourcesRef.current.add(source);
    }, []);

    const setupAudioInputStream = useCallback(() => {
        if (!mediaStreamRef.current || !liveSessionRef.current) return;

        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const audioCtx = inputAudioContextRef.current;

        mediaStreamSourceRef.current = audioCtx.createMediaStreamSource(mediaStreamRef.current);

        scriptProcessorRef.current = audioCtx.createScriptProcessor(4096, 1, 1);

        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
            if (!isMicOn) return;
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);

            // Downsample or process if needed, assuming backend expects raw PCM or specific format
            // Here we send raw int16 pcm encoded in base64
            const pcmBlob: Blob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                mimeType: 'audio/pcm;rate=16000',
            };
            liveSessionRef.current?.sendRealtimeInput({ media: pcmBlob });
        };
        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
        scriptProcessorRef.current.connect(audioCtx.destination);
    }, [isMicOn]);

    const handleConnect = async () => {
        if (!isReady) return;
        setSessionState('connecting');
        setError('');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            // Allow frontend to specify model, but backend handles connection
            const modelToUse = AVAILABLE_LIVE_MODELS[0]; // Default model

            sessionPromiseRef.current = aiService.createLiveSession(
                {
                    onopen: () => {
                        setSessionState('active');
                        setupAudioInputStream();
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.outputTranscription) {
                            setCurrentTurn(prev => ({ ...prev, agent: prev.agent + message.serverContent?.outputTranscription?.text }));
                        }
                        if (message.serverContent?.inputTranscription) {
                            setCurrentTurn(prev => ({ ...prev, user: prev.user + message.serverContent?.inputTranscription?.text }));
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) playAudio(base64Audio);

                        if (message.serverContent?.turnComplete) {
                            setTranscripts(prev => [
                                ...prev,
                                { id: Date.now(), sender: 'user', text: currentTurn.user.trim() },
                                { id: Date.now() + 1, sender: 'agent', text: currentTurn.agent.trim() }
                            ]);
                            setCurrentTurn({ user: '', agent: '' });
                        }
                    },
                    onerror: (e: Event | any) => {
                        console.error("Live Session error:", e);
                        setError("Session error. Please retry.");
                        setSessionState('error');
                        cleanupAudioResources();
                        if (e?.message?.toLowerCase().includes('api key')) reportInvalidApiKey();
                    },
                    onclose: () => {
                        setSessionState('idle');
                        cleanupAudioResources();
                    }
                },
                {
                    systemInstruction,
                    model: modelToUse,
                    voiceConfig: aiService.getVoiceConfigForLanguage('en-US', selectedVoice)
                }
            );

            liveSessionRef.current = await sessionPromiseRef.current;

        } catch (err: any) {
            console.error("Connection failed:", err);
            setError('Failed to connect to AI Agent. Check permissions.');
            setSessionState('error');
            cleanupAudioResources();
        }
    };

    const handleDisconnect = () => {
        cleanupAudioResources();
        setSessionState('idle');
    };

    const toggleMic = () => {
        setIsMicOn(!isMicOn);
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getAudioTracks().forEach(track => track.enabled = !isMicOn);
        }
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Recruiter Voice Agent</h1>
                <div className="header-actions">
                    <select
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value as VoiceName)}
                        disabled={sessionState === 'active'}
                        className="voice-select"
                        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                    >
                        {AVAILABLE_VOICES.map(voice => (
                            <option key={voice} value={voice}>{voice}</option>
                        ))}
                    </select>
                </div>
            </header>

            <div className="live-session-container" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', height: 'calc(100vh - 140px)' }}>
                {/* Main Interaction Area */}
                <div className="interaction-area form-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {sessionState === 'active' ? (
                        <div className="active-session-visual" style={{ textAlign: 'center' }}>
                            <div className={`orb ${sessionState === 'active' ? 'pulsing' : ''}`} style={{
                                width: '150px', height: '150px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
                                margin: '0 auto 2rem', boxShadow: '0 0 40px rgba(var(--primary-rgb), 0.4)',
                                animation: 'pulse 2s infinite'
                            }}>
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <RobotIcon style={{ width: '64px', height: '64px', color: 'white' }} />
                                </div>
                            </div>
                            <h2>Listening...</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Speak naturally to the AI Recruiter Agent</p>
                        </div>
                    ) : (
                        <div className="idle-state" style={{ textAlign: 'center' }}>
                            <RobotIcon style={{ width: '80px', height: '80px', color: 'var(--text-secondary)', marginBottom: '1.5rem' }} />
                            <h2>Ready to Start</h2>
                            <p style={{ maxWidth: '400px', margin: '0 auto 2rem', color: 'var(--text-secondary)' }}>
                                Configure the system instructions and voice settings, then connect to start a real-time voice session.
                            </p>
                            <button className="btn btn-primary btn-lg" onClick={handleConnect} disabled={sessionState === 'connecting'}>
                                {sessionState === 'connecting' ? 'Connecting...' : 'Connect to Agent'}
                            </button>
                        </div>
                    )}

                    {/* Controls Overlay */}
                    {sessionState === 'active' && (
                        <div className="session-controls" style={{
                            position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
                            display: 'flex', gap: '1.5rem', padding: '1rem 2rem', backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: '50px'
                        }}>
                            <button className={`icon-btn ${!isMicOn ? 'off' : ''}`} onClick={toggleMic} style={{ color: 'white', padding: '1rem', borderRadius: '50%', background: isMicOn ? 'rgba(255,255,255,0.2)' : 'var(--error-color)' }}>
                                {isMicOn ? <MicOnIcon /> : <MicOffIcon />}
                            </button>
                            <button className="icon-btn danger" onClick={handleDisconnect} style={{ color: 'white', padding: '1rem', borderRadius: '50%', background: 'var(--error-color)' }}>
                                <PhoneOffIcon />
                            </button>
                        </div>
                    )}

                    {error && <div className="error-message" style={{ marginTop: '1rem', color: 'var(--error-color)' }}>{error}</div>}
                </div>

                {/* Configuration & Transcript Sidebar */}
                <div className="sidebar-panel form-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="config-section" style={{ marginBottom: '2rem' }}>
                        <h3 style={{ marginBottom: '0.5rem' }}>System Instructions</h3>
                        <textarea
                            value={systemInstruction}
                            onChange={(e) => setSystemInstruction(e.target.value)}
                            disabled={sessionState !== 'idle'}
                            rows={6}
                            style={{ width: '100%', fontSize: '0.9rem', resize: 'vertical' }}
                            placeholder="Define how the AI agent should behave..."
                        />
                    </div>

                    <div className="transcript-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <h3 style={{ marginBottom: '0.5rem' }}>Live Transcript</h3>
                        <div className="transcript-container" style={{
                            flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '8px', padding: '1rem', fontSize: '0.9rem'
                        }}>
                            {transcripts.length === 0 && <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Transcript will appear here...</p>}
                            {transcripts.map(t => (
                                <div key={t.id} style={{ marginBottom: '0.75rem', textAlign: t.sender === 'user' ? 'right' : 'left' }}>
                                    <span style={{
                                        display: 'inline-block', padding: '0.5rem 0.75rem', borderRadius: '12px',
                                        backgroundColor: t.sender === 'user' ? 'var(--primary-color)' : 'white',
                                        color: t.sender === 'user' ? 'white' : 'inherit',
                                        boxShadow: t.sender === 'agent' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                    }}>
                                        {t.text}
                                    </span>
                                </div>
                            ))}
                            {(currentTurn.user || currentTurn.agent) && (
                                <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                                    {currentTurn.user && <p>User: {currentTurn.user}...</p>}
                                    {currentTurn.agent && <p>Agent: {currentTurn.agent}...</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); box-shadow: 0 0 20px rgba(var(--primary-rgb), 0.4); }
                    50% { transform: scale(1.05); box-shadow: 0 0 40px rgba(var(--primary-rgb), 0.6); }
                    100% { transform: scale(1); box-shadow: 0 0 20px rgba(var(--primary-rgb), 0.4); }
                }
            `}</style>
        </div>
    );
}
