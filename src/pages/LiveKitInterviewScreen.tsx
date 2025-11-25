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
    <div className="interview-welcome-container" style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <h1>AI Conversational Interview</h1>
        <p style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>
            Welcome to your AI-powered conversational interview for <strong>{jobTitle}</strong>
        </p>

        <div className="device-check-panel" style={{
            backgroundColor: 'var(--surface-color)',
            padding: '2rem',
            borderRadius: 'var(--border-radius)',
            marginBottom: '2rem'
        }}>
            <h2 style={{ marginBottom: '1.5rem' }}>System Check</h2>
            <div className="device-check-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <CheckCircleIcon style={{ color: 'var(--status-active)', width: '24px', height: '24px' }} />
                <span>Microphone Ready</span>
            </div>
            <div className="device-check-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <CheckCircleIcon style={{ color: 'var(--status-active)', width: '24px', height: '24px' }} />
                <span>Camera Ready</span>
            </div>
            <div className="device-check-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <CheckCircleIcon style={{ color: 'var(--status-active)', width: '24px', height: '24px' }} />
                <span>AI Interviewer Ready (Gemini)</span>
            </div>
        </div>

        {error && (
            <div className="login-error" style={{ marginBottom: '1.5rem' }}>
                {error}
            </div>
        )}

        <button
            className="btn btn-primary btn-lg"
            onClick={onStart}
            disabled={isLoading}
            style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}
        >
            {isLoading ? 'Joining Room...' : 'Join Interview Room'}
        </button>

        <p style={{ marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
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
            gap: '0.75rem'
        }}>
            {/* Video Area */}
            <div style={{
                flex: '0 0 60%',
                backgroundColor: '#1a1a2e',
                borderRadius: 'var(--border-radius)',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isSpeaking ? '3px solid var(--primary-color)' : '1px solid var(--border-color)',
                transition: 'all 0.3s ease'
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
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: isSpeaking
                            ? 'linear-gradient(135deg, var(--primary-color) 0%, #667eea 100%)'
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2.5rem',
                        color: 'white',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease',
                        boxShadow: isSpeaking ? '0 0 30px rgba(88, 86, 214, 0.5)' : 'none',
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
                        gap: '3px'
                    }}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} style={{
                                width: '3px',
                                height: '14px',
                                backgroundColor: 'var(--primary-color)',
                                borderRadius: '2px',
                                animation: `pulse 0.5s ease-in-out ${i * 0.1}s infinite alternate`
                            }} />
                        ))}
                    </div>
                )}

                {/* Name Tag */}
                <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                }}>
                    <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981'
                    }} />
                    AI Interviewer
                </div>

                {/* Status Badge */}
                {isSpeaking && (
                    <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        backgroundColor: 'var(--primary-color)',
                        color: 'white',
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: '600'
                    }}>
                        SPEAKING
                    </div>
                )}
            </div>

            {/* Transcript Area */}
            <div style={{
                flex: '0 0 40%',
                backgroundColor: 'var(--surface-color)',
                borderRadius: 'var(--border-radius)',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                <div style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-color)'
                    }} />
                    AI Transcript
                </div>
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    color: latestEntry?.isFinal ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}>
                    {latestEntry ? (
                        <p style={{ margin: 0, fontStyle: latestEntry.isFinal ? 'normal' : 'italic' }}>
                            {latestEntry.text}
                        </p>
                    ) : (
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
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
            gap: '0.75rem'
        }}>
            {/* Video Area */}
            <div style={{
                flex: '0 0 60%',
                backgroundColor: 'var(--surface-color)',
                borderRadius: 'var(--border-radius)',
                overflow: 'hidden',
                position: 'relative',
                border: isListening ? '3px solid #10b981' : '1px solid var(--border-color)',
                transition: 'all 0.3s ease'
            }}>
                {localTrack ? (
                    <ParticipantTile trackRef={localTrack} />
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-secondary)'
                    }}>
                        <p>Connecting camera...</p>
                    </div>
                )}

                {/* Listening Indicator */}
                {isListening && (
                    <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        animation: 'blink 2s infinite'
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
            </div>

            {/* Transcript Area */}
            <div style={{
                flex: '0 0 40%',
                backgroundColor: 'var(--surface-color)',
                borderRadius: 'var(--border-radius)',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                <div style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981'
                    }} />
                    Your Transcript
                </div>
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    color: latestEntry?.isFinal ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}>
                    {latestEntry ? (
                        <p style={{ margin: 0, fontStyle: latestEntry.isFinal ? 'normal' : 'italic' }}>
                            {latestEntry.text}
                        </p>
                    ) : (
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
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
        console.log(`[ConversationRoom] Connecting to ws://localhost:8000/ws/gemini-proxy?sessionId=${sessionId}`);
        const ws = new WebSocket(`ws://localhost:8000/ws/gemini-proxy?sessionId=${sessionId}`);

        ws.onopen = () => {
            console.log('[ConversationRoom] ✅ Connected to Gemini proxy, state:', ws.readyState);
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                if (message.type === 'transcript') {
                    const entry: TranscriptEntry = {
                        speaker: message.transcript.speaker === 'model' ? 'interviewer' : 'candidate',
                        text: message.transcript.text,
                        timestamp: new Date().toISOString(),
                        isFinal: message.transcript.isFinal
                    };

                    console.log(`[ConversationRoom] 📝 Transcript (${entry.speaker}): "${entry.text.substring(0, 50)}..." final:${entry.isFinal}`);

                    setTranscript(prev => {
                        // Handle interim transcripts by replacing the last entry if it's from the same speaker and not final
                        if (!entry.isFinal && prev.length > 0) {
                            const last = prev[prev.length - 1];
                            if (!last.isFinal && last.speaker === entry.speaker) {
                                return [...prev.slice(0, -1), entry];
                            }
                        }
                        
                        // For final transcripts or new speakers, add to the list
                        return [...prev, entry];
                    });
                    
                    console.log(`[ConversationRoom] 📝 Updated transcript list, total entries: ${transcript.length + 1}`);

                    if (entry.speaker === 'interviewer' && entry.isFinal) {
                        setIsSpeaking(true);
                        setTimeout(() => setIsSpeaking(false), 3000);
                    }
                } else if (message.type === 'audio' && message.audio?.data) {
                    // Play audio from Gemini
                    console.log('[ConversationRoom] Received audio chunk, playing...');
                    playGeminiAudio(message.audio.data);
                } else if (message.type === 'avatar_video') {
                    // Update avatar video URL
                    console.log('[ConversationRoom] Received avatar video:', message.videoPath);
                    setAvatarVideoUrl(message.videoPath);
                } else if (message.type === 'error') {
                    console.error('[ConversationRoom] Gemini error:', message.error);
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
        };

        // Store ws reference for sending audio
        (window as any).__geminiWs = ws;

        return () => {
            ws.close();
            delete (window as any).__geminiWs;
        };
    }, [sessionId]);

    // Initialize audio capture - CONTINUOUS MODE (always on)
    useEffect(() => {
        let mounted = true;

        const initAudio = async () => {
            try {
                // CRITICAL: Wait for WebSocket to connect first
                console.log('[ConversationRoom] Waiting for WebSocket connection before audio...');
                let attempts = 0;
                while (attempts < 50 && mounted) { // Wait up to 5 seconds
                    const ws = (window as any).__geminiWs;
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        console.log('[ConversationRoom] ✅ WebSocket ready, initializing audio...');
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }

                if (!mounted) return;

                const ws = (window as any).__geminiWs;
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    console.error('[ConversationRoom] ❌ WebSocket not ready after waiting, audio may not work');
                }

                console.log('[ConversationRoom] Initializing continuous audio capture...');
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: 16000,
                        channelCount: 1,
                        echoCancellation: true,
                        noiseSuppression: true
                    }
                });

                if (!mounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                streamRef.current = stream;
                audioContextRef.current = new AudioContext({ sampleRate: 16000 });

                await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');
                console.log('[ConversationRoom] AudioWorklet loaded');

                const source = audioContextRef.current.createMediaStreamSource(stream);
                workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'pcm-worklet');

                let frameCount = 0;
                let lastLogTime = Date.now();
                let hasReceivedAudio = false;

                workletNodeRef.current.port.onmessage = (e) => {
                    if (!hasReceivedAudio) {
                        console.log('[ConversationRoom] 🎤 AudioWorklet receiving microphone data');
                        hasReceivedAudio = true;
                    }

                    frameCount++;
                    const now = Date.now();

                    // Always send audio when mic is enabled (using ref for real-time value)
                    const ws = (window as any).__geminiWs;

                    // Log every 2 seconds instead of every 500 frames
                    const shouldLog = (now - lastLogTime) > 2000;

                    if (ws && ws.readyState === WebSocket.OPEN && isMicEnabledRef.current) {
                        // Send raw ArrayBuffer directly
                        ws.send(e.data);
                        if (shouldLog) {
                            console.log(`[ConversationRoom] ✅ Sent audio frames: ${frameCount}, bytes: ${e.data.byteLength}`);
                            lastLogTime = now;
                        }
                    } else {
                        if (frameCount === 1 || shouldLog) {
                            console.log(`[ConversationRoom] ⚠️ Not sending - WS ready: ${ws && ws.readyState === WebSocket.OPEN}, Mic: ${isMicEnabledRef.current}`);
                            lastLogTime = now;
                        }
                    }
                };

                source.connect(workletNodeRef.current);
                workletNodeRef.current.connect(audioContextRef.current.destination);

                setAudioReady(true);
                console.log('[ConversationRoom] Continuous audio capture ready');
            } catch (err) {
                console.error('[ConversationRoom] Error initializing audio:', err);
            }
        };

        initAudio();

        return () => {
            mounted = false;
            if (workletNodeRef.current) {
                workletNodeRef.current.disconnect();
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (outputAudioContextRef.current) {
                outputAudioContextRef.current.close();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Audio playback function for Gemini responses
    const playGeminiAudio = useCallback(async (base64Audio: string) => {
        try {
            const audioData = base64ToArrayBuffer(base64Audio);
            audioQueueRef.current.push(audioData);
            
            if (!isPlayingRef.current) {
                processAudioQueue();
            }
        } catch (err) {
            console.error('[ConversationRoom] Error playing Gemini audio:', err);
        }
    }, []);
    
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
            source.playbackRate.value = 0.9; // Slightly slower for clarity
            source.connect(audioCtx.destination);
            
            const currentTime = audioCtx.currentTime;
            const startTime = Math.max(currentTime, nextPlayTimeRef.current);
            const duration = audioBuffer.duration / source.playbackRate.value;
            
            source.start(startTime);
            nextPlayTimeRef.current = startTime + duration;
            
            console.log(`[ConversationRoom] Playing audio chunk, duration: ${duration.toFixed(2)}s`);
            
            source.onended = () => {
                processAudioQueue();
            };
        } catch (err) {
            console.error('[ConversationRoom] Error processing audio:', err);
            isPlayingRef.current = false;
            processAudioQueue();
        }
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
