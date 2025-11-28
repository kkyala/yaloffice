/**
 * LiveKit + Gemini Live Conversational Interview Screen
 *
 * Follows LiveKit conversation room pattern where:
 * - Candidate joins first (video participant)
 * - AI Interviewer joins second (virtual participant)
 * - Both appear as equal participants in a grid layout
 * - Natural conversational flow with continuous listening
 *
 * Features:
 * - LiveKit conversational room layout
 * - Gemini Live AI interviewer
 * - Real-time transcription beneath each participant
 * - Continuous microphone (no push-to-talk)
 * - Post-interview analysis
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Track } from 'livekit-client';
import {
    LiveKitRoom,
    useLocalParticipant,
    useTracks,
    ParticipantTile,
    ControlBar,
    RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { livekitService } from '../services/livekitService';
import { interviewService, TranscriptEntry } from '../services/interviewService';
import { MicOnIcon, MicOffIcon, PhoneOffIcon, CheckCircleIcon } from '../components/Icons';

type Candidate = {
    id: number;
    name: string;
    role: string;
    jobId: number;
    interview_config?: {
        mode?: 'chat' | 'audio' | 'video';
        interviewType?: 'audio' | 'video';
        interviewStatus?: 'pending' | 'started' | 'finished';
        questionCount?: number;
        difficulty?: string;
        customQuestions?: string[];
    };
};

type LiveKitInterviewScreenProps = {
    currentUser: any;
    interviewingCandidate: Candidate | null;
    currentApplicationId: number | null;
    onSaveInterviewResults: (applicationId: number, score: number, transcript: string) => Promise<void>;
    onStartInterviewSession: (applicationId: number) => Promise<{ success: boolean }>;
    onNavigate: (page: string, parent: string, context?: any) => void;
    jobsData?: any[];
};

type InterviewState = 'setup' | 'connecting' | 'active' | 'analyzing' | 'finished';

// Setup/Welcome Screen
const SetupScreen = ({ candidate, jobTitle, onStart, isLoading, error }: any) => (
    <div className="interview-welcome-container">
        <h1>AI Conversational Interview</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '3rem', color: 'var(--text-secondary)' }}>
            Welcome to your AI-powered conversational interview for <strong style={{ color: 'var(--primary-color)' }}>{jobTitle}</strong>
        </p>

        <div className="device-check-panel glass-panel">
            <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem' }}>System Check</h2>
            <div className="device-check-item">
                <CheckCircleIcon style={{ color: 'var(--success-color)', width: '28px', height: '28px' }} />
                <span style={{ fontSize: '1.1rem' }}>Microphone Ready</span>
            </div>
            <div className="device-check-item" style={{ margin: '1rem 0' }}>
                <CheckCircleIcon style={{ color: 'var(--success-color)', width: '28px', height: '28px' }} />
                <span style={{ fontSize: '1.1rem' }}>Camera Ready</span>
            </div>
            <div className="device-check-item">
                <CheckCircleIcon style={{ color: 'var(--success-color)', width: '28px', height: '28px' }} />
                <span style={{ fontSize: '1.1rem' }}>AI Interviewer Ready (Gemini)</span>
            </div>
        </div>

        {error && (
            <div className="error-banner" style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--error-color)',
                color: 'var(--error-color)',
                padding: '1rem',
                borderRadius: 'var(--border-radius)',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textAlign: 'left'
            }}>
                <div style={{ flexShrink: 0 }}>⚠️</div>
                <div>
                    <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Connection Error</strong>
                    <span style={{ fontSize: '0.9rem' }}>{error}</span>
                </div>
            </div>
        )}

        <button
            className="btn btn-primary btn-lg"
            onClick={onStart}
            disabled={isLoading}
            style={{ padding: '1.2rem 4rem', fontSize: '1.2rem', borderRadius: '50px' }}
        >
            {isLoading ? 'Joining Room...' : 'Join Interview Room'}
        </button>

        <p style={{ marginTop: '2rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Microphone will be enabled automatically for continuous conversation
        </p>
    </div>
);

// AI Interviewer Virtual Participant Component with Transcript
const AIInterviewerParticipant = ({
    isSpeaking,
    transcript,
    avatarVideoUrl
}: {
    isSpeaking: boolean;
    transcript: TranscriptEntry[];
    avatarVideoUrl: string | null;
}) => {
    const interviewerTranscript = transcript.filter(t => t.speaker === 'interviewer');
    const latestEntry = interviewerTranscript[interviewerTranscript.length - 1];
    const videoRef = React.useRef<HTMLVideoElement>(null);

    React.useEffect(() => {
        if (avatarVideoUrl && videoRef.current) {
            videoRef.current.src = `http://localhost:8000${avatarVideoUrl}`;
            videoRef.current.play().catch(err => console.error('Error playing avatar video:', err));
        }
    }, [avatarVideoUrl]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            gap: '1rem'
        }}>
            {/* Video Area */}
            <div className="participant-view" style={{
                flex: '0 0 65%',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isSpeaking ? '2px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease',
                boxShadow: isSpeaking ? '0 0 30px rgba(129, 140, 248, 0.3)' : 'none'
            }}>
                {/* Avatar Video or Static Avatar */}
                {avatarVideoUrl ? (
                    <video
                        ref={videoRef}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                        autoPlay
                        loop
                        muted={false}
                    />
                ) : (
                    <div style={{
                        width: '140px',
                        height: '140px',
                        borderRadius: '50%',
                        background: isSpeaking
                            ? 'linear-gradient(135deg, var(--primary-color) 0%, #c084fc 100%)'
                            : 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '3rem',
                        color: 'white',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease',
                        boxShadow: isSpeaking ? '0 0 40px rgba(129, 140, 248, 0.6)' : 'none',
                        transform: isSpeaking ? 'scale(1.05)' : 'scale(1)'
                    }}>
                        AI
                    </div>
                )}

                {/* Speaking Indicator */}
                {isSpeaking && (
                    <div style={{
                        position: 'absolute',
                        bottom: '40px',
                        display: 'flex',
                        gap: '4px'
                    }}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} style={{
                                width: '4px',
                                height: '16px',
                                backgroundColor: 'var(--primary-color)',
                                borderRadius: '2px',
                                animation: `pulse 0.5s ease-in-out ${i * 0.1}s infinite alternate`,
                                boxShadow: '0 0 10px var(--primary-color)'
                            }} />
                        ))}
                    </div>
                )}

                {/* Name Tag */}
                <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        boxShadow: '0 0 8px #10b981'
                    }} />
                    AI Interviewer
                </div>

                {/* Status Badge */}
                {isSpeaking && (
                    <div style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        backgroundColor: 'var(--primary-color)',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                    }}>
                        SPEAKING
                    </div>
                )}
            </div>

            {/* Transcript Area */}
            <div className="glass-panel" style={{
                flex: '0 0 35%',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div style={{
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#94a3b8',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-color)'
                    }} />
                    AI Transcript
                </div>
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    fontSize: '0.95rem',
                    lineHeight: '1.6',
                    color: latestEntry?.isFinal ? '#f1f5f9' : '#94a3b8'
                }}>
                    {latestEntry ? (
                        <p style={{ margin: 0, fontStyle: latestEntry.isFinal ? 'normal' : 'italic' }}>
                            {latestEntry.text}
                        </p>
                    ) : (
                        <p style={{ margin: 0, color: '#64748b', fontStyle: 'italic' }}>
                            Waiting for AI response...
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

// Candidate Video Participant Component with Transcript
const CandidateParticipant = ({
    participantName,
    isListening,
    transcript
}: {
    participantName: string;
    isListening: boolean;
    transcript: TranscriptEntry[]
}) => {
    const { localParticipant } = useLocalParticipant();
    const tracks = useTracks([Track.Source.Camera]);
    const localTrack = tracks.find(t => t.participant?.identity === localParticipant?.identity);

    const candidateTranscript = transcript.filter(t => t.speaker === 'candidate');
    const latestEntry = candidateTranscript[candidateTranscript.length - 1];

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            gap: '1rem'
        }}>
            {/* Video Area */}
            <div className="participant-view" style={{
                flex: '0 0 65%',
                position: 'relative',
                border: isListening ? '2px solid var(--success-color)' : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease',
                boxShadow: isListening ? '0 0 20px rgba(16, 185, 129, 0.2)' : 'none'
            }}>
                {localTrack ? (
                    <ParticipantTile trackRef={localTrack} style={{ width: '100%', height: '100%', borderRadius: '24px' }} />
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        background: '#0f172a'
                    }}>
                        <p>Connecting camera...</p>
                    </div>
                )}

                {/* Listening Indicator */}
                {isListening && (
                    <div style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        backgroundColor: 'var(--success-color)',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        animation: 'pulse 2s infinite',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: 'white'
                        }} />
                        LISTENING
                    </div>
                )}

                {/* Name Tag */}
                <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6',
                        boxShadow: '0 0 8px #3b82f6'
                    }} />
                    {participantName || 'You'}
                </div>
            </div>

            {/* Transcript Area */}
            <div className="glass-panel" style={{
                flex: '0 0 35%',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div style={{
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#94a3b8',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--success-color)'
                    }} />
                    Your Transcript
                </div>
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    fontSize: '0.95rem',
                    lineHeight: '1.6',
                    color: latestEntry?.isFinal ? '#f1f5f9' : '#94a3b8'
                }}>
                    {latestEntry ? (
                        <p style={{ margin: 0, fontStyle: latestEntry.isFinal ? 'normal' : 'italic' }}>
                            {latestEntry.text}
                        </p>
                    ) : (
                        <p style={{ margin: 0, color: '#64748b', fontStyle: 'italic' }}>
                            Speak to start...
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

// Conversational Interview Room Component
const ConversationRoom = ({
    token,
    serverUrl,
    onInterviewEnd,
    candidateName,
    sessionId,
    initialGreeting
}: {
    token: string;
    serverUrl: string;
    onInterviewEnd: () => void;
    candidateName: string;
    sessionId: string;
    initialGreeting: string;
}) => {
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([
        { speaker: 'interviewer', text: initialGreeting, timestamp: new Date().toISOString(), isFinal: true }
    ]);
    const [isMicEnabled, setIsMicEnabled] = useState(true);
    // Load persisted transcript on mount
    useEffect(() => {
        const saved = sessionStorage.getItem('livekitInterviewTranscript');
        if (saved) {
            try {
                const data = JSON.parse(saved) as TranscriptEntry[];
                setTranscript(data);
            } catch (e) {
                console.error('Failed to parse persisted transcript', e);
            }
        }
    }, []);
    // Persist transcript on change
    useEffect(() => {
        sessionStorage.setItem('livekitInterviewTranscript', JSON.stringify(transcript));
    }, [transcript]);
    const isMicEnabledRef = useRef(true); // Ref for AudioWorklet access
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [audioReady, setAudioReady] = useState(false);

    // Audio playback for Gemini responses
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const audioQueueRef = useRef<ArrayBuffer[]>([]);
    const isPlayingRef = useRef(false);
    const nextPlayTimeRef = useRef(0);

    // Connect to Gemini proxy on mount
    useEffect(() => {
        let ws: WebSocket | null = null;
        let keepaliveInterval: NodeJS.Timeout | null = null;
        let reconnectTimeout: NodeJS.Timeout | null = null;
        let isCleanClose = false;

        const connect = () => {
            if (ws) {
                ws.close();
            }

            console.log('[ConversationRoom] Connecting to WebSocket...');
            ws = new WebSocket(`ws://localhost:8000/ws/gemini-proxy?sessionId=${sessionId}`);
            (window as any).__geminiWs = ws;

            ws.onopen = () => {
                console.log('[ConversationRoom] ✅ Connected to Gemini proxy, state:', ws?.readyState);

                // Start keepalive pings
                if (keepaliveInterval) clearInterval(keepaliveInterval);
                keepaliveInterval = setInterval(() => {
                    if (ws?.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'keepalive' }));
                        console.log('[ConversationRoom] Sent keepalive ping');
                    }
                }, 30000);
            };

            ws.onmessage = async (event) => {
                try {
                    let message;
                    if (event.data instanceof Blob) {
                        const text = await event.data.text();
                        message = JSON.parse(text);
                    } else if (typeof event.data === 'string') {
                        message = JSON.parse(event.data);
                    } else {
                        // Handle raw binary audio data
                        const arrayBuffer = await event.data.arrayBuffer();
                        // ... handle binary if needed, but current protocol uses JSON for audio
                        return;
                    }

                    if (message.type === 'text') {
                        // ... existing text handling ...
                        const entry: TranscriptEntry = {
                            speaker: message.role === 'user' ? 'candidate' : 'interviewer',
                            text: message.text,
                            timestamp: new Date().toISOString(),
                            isFinal: true
                        };
                        setTranscript(prev => [...prev, entry]);
                    } else if (message.type === 'audio' && message.audio?.data) {
                        console.log('[ConversationRoom] Received audio chunk, playing...');
                        playGeminiAudio(message.audio.data);

                        // Add AI speaking indicator
                        setTranscript(prev => {
                            const last = prev[prev.length - 1];
                            if (last && last.speaker === 'interviewer' && !last.isFinal) {
                                return prev;
                            }
                            return [...prev, {
                                speaker: 'interviewer',
                                text: 'Speaking...',
                                timestamp: new Date().toISOString(),
                                isFinal: false
                            }];
                        });

                        setTimeout(() => {
                            setTranscript(prev => {
                                const last = prev[prev.length - 1];
                                if (last && last.speaker === 'interviewer' && !last.isFinal) {
                                    return [...prev.slice(0, -1), {
                                        ...last,
                                        text: '[AI Response - Audio Only]',
                                        isFinal: true
                                    }];
                                }
                                return prev;
                            });
                        }, 2000);
                    } else if (message.type === 'avatar_video') {
                        setAvatarVideoUrl(message.videoPath);
                    }
                } catch (err) {
                    console.error('[ConversationRoom] Error parsing message:', err);
                }
            };

            ws.onerror = (err) => {
                console.error('[ConversationRoom] WebSocket error:', err);
            };

            ws.onclose = () => {
                console.log('[ConversationRoom] WebSocket closed');
                if (keepaliveInterval) clearInterval(keepaliveInterval);

                if (!isCleanClose) {
                    console.log('[ConversationRoom] Attempting reconnect in 2s...');
                    reconnectTimeout = setTimeout(connect, 2000);
                }
            };
        };

        connect();

        return () => {
            isCleanClose = true;
            if (keepaliveInterval) clearInterval(keepaliveInterval);
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            if (ws) {
                ws.close();
            }
            delete (window as any).__geminiWs;
        };
    }, [sessionId]);

    // Initialize audio capture & playback - LOW LATENCY MODE
    useEffect(() => {
        let mounted = true;
        let inputContext: AudioContext | null = null;
        let outputContext: AudioContext | null = null;
        let inputWorklet: AudioWorkletNode | null = null;
        let outputWorklet: AudioWorkletNode | null = null;
        let micStream: MediaStream | null = null;

        const initAudio = async () => {
            try {
                console.log('[ConversationRoom] Initializing low-latency audio pipeline...');

                // 1. Setup Input Context (16kHz for Gemini Input)
                inputContext = new AudioContext({ sampleRate: 16000 });
                await inputContext.audioWorklet.addModule('/audio-processor.js');

                // 2. Setup Output Context (24kHz for Gemini Output)
                outputContext = new AudioContext({ sampleRate: 24000 });
                await outputContext.audioWorklet.addModule('/audio-processor.js');

                if (!mounted) return;

                // 3. Setup Microphone Input
                micStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: 16000,
                        channelCount: 1,
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });

                if (!mounted) return;

                const micSource = inputContext.createMediaStreamSource(micStream);
                inputWorklet = new AudioWorkletNode(inputContext, 'pcm-worklet');

                // Handle Mic Data -> WebSocket
                inputWorklet.port.onmessage = (e) => {
                    const ws = (window as any).__geminiWs;
                    if (ws && ws.readyState === WebSocket.OPEN && isMicEnabledRef.current) {
                        ws.send(e.data);
                    }
                };

                micSource.connect(inputWorklet);
                // Connect to destination to keep the graph alive (but mute it to avoid feedback)
                // Actually, we don't need to connect inputWorklet to destination if we don't want self-monitoring.
                // But some browsers require it. Let's connect with gain 0.
                const silentGain = inputContext.createGain();
                silentGain.gain.value = 0;
                inputWorklet.connect(silentGain);
                silentGain.connect(inputContext.destination);

                // 4. Setup Speaker Output
                outputWorklet = new AudioWorkletNode(outputContext, 'pcm-worklet');
                outputWorklet.connect(outputContext.destination);

                // Store output worklet for incoming messages
                (window as any).__outputWorklet = outputWorklet;

                setAudioReady(true);
                console.log('[ConversationRoom] ✅ Low-latency audio pipeline ready');

            } catch (err) {
                console.error('[ConversationRoom] Error initializing audio:', err);
            }
        };

        initAudio();

        return () => {
            mounted = false;
            micStream?.getTracks().forEach(t => t.stop());
            inputContext?.close();
            outputContext?.close();
            delete (window as any).__outputWorklet;
        };
    }, []);

    // Audio playback function - Pushes to Worklet Ring Buffer
    const playGeminiAudio = useCallback(async (base64Audio: string) => {
        try {
            const outputWorklet = (window as any).__outputWorklet as AudioWorkletNode;
            if (outputWorklet) {
                const binaryString = atob(base64Audio);
                const bytes = new Int16Array(binaryString.length / 2);
                const dataView = new DataView(new ArrayBuffer(binaryString.length));
                for (let i = 0; i < binaryString.length; i++) {
                    dataView.setUint8(i, binaryString.charCodeAt(i));
                }
                // Assume Little Endian (standard for WAV/PCM)
                for (let i = 0; i < bytes.length; i++) {
                    bytes[i] = dataView.getInt16(i * 2, true);
                }

                outputWorklet.port.postMessage({ type: 'audio', data: bytes });
            }
        } catch (err) {
            console.error('[ConversationRoom] Error queuing audio:', err);
        }
    }, []);

    // Initialize Web Speech API for candidate transcription
    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('[ConversationRoom] Web Speech API not supported');
            return;
        }

        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        let isActive = true;
        let restartAttempts = 0;
        const MAX_RESTART_ATTEMPTS = 3;

        recognition.onstart = () => {
            console.log('[ConversationRoom] 🎤 Speech recognition started');
            restartAttempts = 0;
        };

        recognition.onresult = (event: any) => {
            const result = event.results[event.results.length - 1];
            const transcriptText = result[0].transcript;
            const isFinal = result.isFinal;

            console.log(`[ConversationRoom] 📝 Speech recognized: "${transcriptText}" (final: ${isFinal})`);

            setTranscript(prev => {
                // Replace last interim result or add new final result
                if (!isFinal && prev.length > 0) {
                    const last = prev[prev.length - 1];
                    if (!last.isFinal && last.speaker === 'candidate') {
                        return [...prev.slice(0, -1), {
                            speaker: 'candidate',
                            text: transcriptText,
                            timestamp: new Date().toISOString(),
                            isFinal: false
                        }];
                    }
                }

                return [...prev, {
                    speaker: 'candidate',
                    text: transcriptText,
                    timestamp: new Date().toISOString(),
                    isFinal
                }];
            });
        };

        recognition.onerror = (event: any) => {
            // Ignore 'no-speech' errors as they're normal when user isn't speaking
            if (event.error === 'no-speech') {
                return; // Don't log or restart
            }

            // Ignore 'aborted' errors during cleanup
            if (event.error === 'aborted') {
                return; // Don't log or restart
            }

            // Log other errors but don't restart excessively
            console.error('[ConversationRoom] Speech recognition error:', event.error);
            restartAttempts++;
        };

        recognition.onend = () => {
            // Only restart if component is still mounted and we haven't exceeded restart attempts
            if (isActive && isMicEnabledRef.current && restartAttempts < MAX_RESTART_ATTEMPTS) {
                // Add delay before restart to prevent rapid cycling
                setTimeout(() => {
                    if (isActive) {
                        try {
                            recognition.start();
                        } catch (err) {
                            console.error('[ConversationRoom] Error restarting recognition:', err);
                        }
                    }
                }, 500); // Increased delay to 500ms
            } else if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
                console.warn('[ConversationRoom] Speech recognition stopped after max restart attempts');
            }
        };

        // Start recognition
        try {
            recognition.start();
        } catch (err) {
            console.error('[ConversationRoom] Error starting recognition:', err);
        }

        return () => {
            isActive = false;
            try {
                recognition.stop();
            } catch (err) {
                // Ignore errors on cleanup
            }
        };
    }, []); // Empty dependency array - only run once

    // Audio playback function for Gemini responses
    // const playGeminiAudio = useCallback(async (base64Audio: string) => {
    //     try {
    //         const audioData = base64ToArrayBuffer(base64Audio);
    //         audioQueueRef.current.push(audioData);

    //         if (!isPlayingRef.current) {
    //             processAudioQueue();
    //         }
    //     } catch (err) {
    //         console.error('[ConversationRoom] Error playing Gemini audio:', err);
    //     }
    // }, []);

    const processAudioQueue = useCallback(async () => {
        if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            return;
        }

        isPlayingRef.current = true;

        if (!outputAudioContextRef.current) {
            outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
        }

        const audioCtx = outputAudioContextRef.current;
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        // Process all available chunks in the queue
        while (audioQueueRef.current.length > 0) {
            const audioData = audioQueueRef.current.shift()!;

            try {
                // Decode PCM audio (16-bit, mono, 24000 Hz from Gemini)
                const int16Array = new Int16Array(audioData);
                const float32Array = new Float32Array(int16Array.length);

                for (let i = 0; i < int16Array.length; i++) {
                    float32Array[i] = int16Array[i] / 32768.0;
                }

                const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
                audioBuffer.getChannelData(0).set(float32Array);

                const source = audioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.playbackRate.value = 1.0; // Normal speed
                source.connect(audioCtx.destination);

                const currentTime = audioCtx.currentTime;
                const startTime = Math.max(currentTime, nextPlayTimeRef.current);
                const duration = audioBuffer.duration;

                source.start(startTime);
                nextPlayTimeRef.current = startTime + duration;

                console.log(`[ConversationRoom] Scheduled audio chunk, duration: ${duration.toFixed(2)}s`);
            } catch (err) {
                console.error('[ConversationRoom] Error processing audio:', err);
            }
        }

        isPlayingRef.current = false;
    }, []);

    const base64ToArrayBuffer = useCallback((base64: string): ArrayBuffer => {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }, []);

    const toggleMic = useCallback(() => {
        setIsMicEnabled(prev => {
            const newValue = !prev;
            isMicEnabledRef.current = newValue; // Update ref immediately
            console.log('[ConversationRoom] Mic toggled:', newValue);
            return newValue;
        });
    }, []);

    return (
        <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            audio={true}
            video={true}
            onDisconnected={onInterviewEnd}
            style={{ height: '100vh', overflow: 'hidden' }}
        >
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                backgroundColor: 'var(--background-color)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'var(--surface-color)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Interview in Progress</h2>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            2 participants • AI Interview
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {audioReady && (
                            <span style={{
                                fontSize: '0.8rem',
                                color: '#10b981',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: '#10b981',
                                    animation: 'blink 2s infinite'
                                }} />
                                Audio Ready
                            </span>
                        )}
                    </div>
                </div>

                {/* Main Content Area - NO SCROLL */}
                <div style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1.5rem',
                    padding: '1.5rem',
                    overflow: 'hidden'
                }}>
                    {/* Candidate Participant */}
                    <CandidateParticipant
                        participantName={candidateName}
                        isListening={isMicEnabled && audioReady}
                        transcript={transcript}
                    />

                    {/* AI Interviewer Participant */}
                    <AIInterviewerParticipant
                        isSpeaking={isSpeaking}
                        transcript={transcript}
                        avatarVideoUrl={avatarVideoUrl}
                    />
                </div>

                {/* Control Bar - Fixed at Bottom */}
                <div style={{
                    height: '70px',
                    backgroundColor: 'var(--surface-color)',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                    padding: '0 1.5rem',
                    flexShrink: 0
                }}>
                    {/* Microphone Toggle Button */}
                    <button
                        className={`btn btn-lg ${isMicEnabled ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={toggleMic}
                        disabled={!audioReady}
                        style={{
                            padding: '0.75rem 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            backgroundColor: isMicEnabled ? '#10b981' : undefined,
                            borderColor: isMicEnabled ? '#10b981' : undefined
                        }}
                    >
                        {isMicEnabled ? <MicOnIcon /> : <MicOffIcon />}
                        {!audioReady ? 'Initializing...' : isMicEnabled ? 'Microphone On' : 'Microphone Off'}
                    </button>

                    {/* LiveKit Controls */}
                    <ControlBar />

                    {/* End Interview Button */}
                    <button
                        className="btn btn-lg"
                        onClick={onInterviewEnd}
                        style={{
                            backgroundColor: 'var(--error-color)',
                            borderColor: 'var(--error-color)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem'
                        }}
                    >
                        <PhoneOffIcon />
                        End Interview
                    </button>
                </div>
            </div>

            <RoomAudioRenderer />

            {/* Animations */}
            <style>{`
                @keyframes pulse {
                    from { transform: scaleY(0.5); }
                    to { transform: scaleY(1.5); }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            `}</style>
        </LiveKitRoom>
    );
};

// Main Component
export default function LiveKitInterviewScreen({
    currentUser,
    interviewingCandidate,
    currentApplicationId,
    onSaveInterviewResults,
    onStartInterviewSession,
    onNavigate,
    jobsData = [],
}: LiveKitInterviewScreenProps) {
    const [interviewState, setInterviewState] = useState<InterviewState>('setup');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [livekitToken, setLivekitToken] = useState('');
    const [livekitUrl, setLivekitUrl] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [initialGreeting, setInitialGreeting] = useState('');
    // Load persisted session state on mount
    useEffect(() => {
        const saved = sessionStorage.getItem('livekitInterviewState');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.interviewState) setInterviewState(data.interviewState);
                if (data.livekitToken) setLivekitToken(data.livekitToken);
                if (data.livekitUrl) setLivekitUrl(data.livekitUrl);
                if (data.sessionId) setSessionId(data.sessionId);
                if (data.initialGreeting) setInitialGreeting(data.initialGreeting);
                // transcript is managed within ConversationRoom; not set here
            } catch (e) {
                console.error('Failed to parse persisted interview state', e);
            }
        }
    }, []);

    // Persist relevant state whenever it changes
    useEffect(() => {
        const data = {
            interviewState,
            livekitToken,
            livekitUrl,
            sessionId,
            initialGreeting,
        };
        sessionStorage.setItem('livekitInterviewState', JSON.stringify(data));
    }, [interviewState, livekitToken, livekitUrl, sessionId, initialGreeting]);

    const jobTitle = jobsData.find(j => j.id === interviewingCandidate?.jobId)?.title || interviewingCandidate?.role || 'Unknown Position';

    const startInterview = useCallback(async () => {
        if (!interviewingCandidate || !currentApplicationId) return;

        setIsLoading(true);
        setError('');

        try {
            // 1. Start interview session
            const sessionResult = await onStartInterviewSession(currentApplicationId);
            if (!sessionResult.success) {
                throw new Error('Failed to start interview session');
            }

            setInterviewState('connecting');

            // 2. Create LiveKit room and get token
            const roomConfig = livekitService.createInterviewRoomConfig(
                currentApplicationId,
                interviewingCandidate.jobId,
                interviewingCandidate.name,
                'candidate'
            );

            const tokenData = await livekitService.getAccessToken(roomConfig);
            setLivekitToken(tokenData.token);
            setLivekitUrl(tokenData.url);

            // 3. Start Gemini interview session
            const session = await interviewService.startInterview({
                roomName: roomConfig.roomName,
                jobTitle,
                questionCount: interviewingCandidate.interview_config?.questionCount || 5,
                difficulty: interviewingCandidate.interview_config?.difficulty || 'Medium',
                candidateId: String(interviewingCandidate.id),
                candidateName: interviewingCandidate.name,
                customQuestions: interviewingCandidate.interview_config?.customQuestions || [],
            });

            setSessionId(session.sessionId);
            setInitialGreeting(session.greeting);

            setInterviewState('active');
        } catch (err: any) {
            console.error('Error starting interview:', err);
            setError(err.message || 'Failed to start the interview. Please check your configuration and try again.');
            setInterviewState('setup');
        } finally {
            setIsLoading(false);
        }
    }, [interviewingCandidate, currentApplicationId, jobTitle, onStartInterviewSession]);

    const endInterview = useCallback(async () => {
        setInterviewState('analyzing');

        try {
            // Clear persisted transcript when interview ends
            sessionStorage.removeItem('livekitInterviewTranscript');
            const result = await interviewService.stopInterview();

            const transcriptText = result.transcript
                .map((t: any) => `${t.role}: ${t.content}`)
                .join('\n');

            if (currentApplicationId) {
                await onSaveInterviewResults(
                    currentApplicationId,
                    result.analysis?.score || 5.0,
                    transcriptText
                );
            }

            if (interviewingCandidate && currentApplicationId) {
                const parentPage = currentUser?.role === 'Candidate' ? 'dashboard' : 'recruitment';
                onNavigate('interview-report', parentPage, {
                    candidateId: interviewingCandidate.id,
                    applicationId: currentApplicationId,
                    analysis: result.analysis
                });
            }
        } catch (err: any) {
            console.error('Error ending interview:', err);
            setError('Failed to process interview results');
        } finally {
            setInterviewState('finished');
            // Clear persisted interview state and transcript
            sessionStorage.removeItem('livekitInterviewState');
            sessionStorage.removeItem('livekitInterviewTranscript');
        }
    }, [currentApplicationId, interviewingCandidate, currentUser, onSaveInterviewResults, onNavigate]);

    if (!interviewingCandidate) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p>Loading interview...</p>
            </div>
        );
    }

    if (interviewState === 'setup') {
        return (
            <SetupScreen
                candidate={interviewingCandidate}
                jobTitle={jobTitle}
                onStart={startInterview}
                isLoading={isLoading}
                error={error}
            />
        );
    }

    if (interviewState === 'connecting') {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ margin: '0 auto 2rem' }}></div>
                <h2>Joining Conversation Room...</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    • Candidate joining... ✓<br />
                    • AI Interviewer joining...
                </p>
            </div>
        );
    }

    if (interviewState === 'analyzing') {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ margin: '0 auto 2rem' }}></div>
                <h2>Analyzing Your Interview...</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Please wait while we process your responses.</p>
            </div>
        );
    }

    if (interviewState === 'active' && livekitToken && livekitUrl) {
        return (
            <ConversationRoom
                token={livekitToken}
                serverUrl={livekitUrl}
                onInterviewEnd={endInterview}
                candidateName={interviewingCandidate.name}
                sessionId={sessionId}
                initialGreeting={initialGreeting}
            />
        );
    }

    return (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Interview setup in progress...</p>
        </div>
    );
}
