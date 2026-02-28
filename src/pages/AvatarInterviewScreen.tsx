
/**
 * AI Avatar Conversational Interview Screen
 *
 * Provides a real-time conversational interview experience with an AI avatar.
 * Features:
 * - Conversational room layout
 * - AI Avatar interviewer
 * - Real-time transcription
 * - Continuous microphone interaction
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Track } from 'livekit-client';
import {
    LiveKitRoom,
    useLocalParticipant,
    useTracks,
    ParticipantTile,
    RoomAudioRenderer,
    DisconnectButton,
    useRoomContext,
    ParticipantName,
    VideoTrack,
    TrackReference,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { livekitService } from '../services/livekitService';
import { interviewService, TranscriptEntry } from '../services/interviewService';
import { api } from '../services/api';
import { MicOnIcon, MicOffIcon, PhoneOffIcon, CheckCircleIcon, VideoOnIcon } from '../components/Icons';

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

type AvatarInterviewScreenProps = {
    currentUser: any;
    interviewingCandidate: Candidate | null;
    currentApplicationId: number | null;
    onSaveInterviewResults: (applicationId: number, score: number, transcript: string, analysis?: any, audioUrl?: string) => Promise<void>;
    onStartInterviewSession: (applicationId: number) => Promise<{ success: boolean }>;
    onNavigate: (page: string, parent: string, context?: any) => void;
    jobsData?: any[];
};

type InterviewState = 'setup' | 'connecting' | 'active' | 'analyzing' | 'finished';

// Timer Component
const SessionTimer = ({ maxSeconds = 900 }: { maxSeconds?: number }) => {
    const room = useRoomContext();
    const [secondsLeft, setSecondsLeft] = useState(maxSeconds);

    useEffect(() => {
        const interval = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    room.disconnect(); // Auto-close
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [room]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    };

    const isUrgent = secondsLeft < 60; // Red if < 1 min

    return (
        <div style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            background: isUrgent ? 'var(--status-error)' : 'rgba(255, 255, 255, 0.8)',
            color: isUrgent ? 'white' : 'var(--color-text-main)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-full)',
            fontWeight: '700',
            fontSize: '1rem',
            backdropFilter: 'blur(8px)',
            zIndex: 10,
            transition: 'background var(--duration-normal)',
            border: isUrgent ? 'none' : '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
        }}>
            Time Remaining: {formatTime(secondsLeft)}
        </div>
    );
};

// Setup/Welcome Screen
const SetupScreen = ({ candidate, jobTitle, onStart, isLoading, error }: any) => {
    const [checks, setChecks] = useState({ mic: false, cam: false, permissions: false });
    const [deviceError, setDeviceError] = useState('');

    useEffect(() => {
        const checkDevices = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                    throw new Error("Browser does not support media devices.");
                }
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                    stream.getTracks().forEach(t => t.stop());
                    setChecks(prev => ({ ...prev, permissions: true }));
                } catch (err) {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        stream.getTracks().forEach(t => t.stop());
                        setChecks(prev => ({ ...prev, permissions: true }));
                    } catch (e) {
                        console.warn("Permissions denied or device missing", e);
                    }
                }
                const devices = await navigator.mediaDevices.enumerateDevices();
                const hasMic = devices.some(d => d.kind === 'audioinput');
                const hasCam = devices.some(d => d.kind === 'videoinput');
                setChecks(prev => ({ ...prev, mic: hasMic, cam: hasCam }));
            } catch (err: any) {
                console.error("Device check error:", err);
                setDeviceError(err.message || "Could not access media devices.");
            }
        };
        checkDevices();
    }, []);

    const isReady = checks.mic && checks.permissions;

    return (
        <div className="page-container" style={{
            maxWidth: '800px',
            margin: '0 auto',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '2rem'
        }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '1rem' }}>AI Avatar Interview</h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                    Welcome to your AI-powered conversational interview for <strong style={{ color: 'var(--color-primary)' }}>{jobTitle}</strong>
                </p>
            </div>

            <div style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-xl)',
                padding: '2.5rem',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--color-border)',
                marginBottom: '2rem'
            }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>System Check</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '48px', height: '48px',
                                borderRadius: '50%',
                                background: checks.mic ? 'var(--success-50)' : 'var(--error-50)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: checks.mic ? 'var(--status-success)' : 'var(--status-error)'
                            }}>
                                <MicOnIcon style={{ width: '24px' }} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontWeight: 600 }}>Microphone</h4>
                                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{checks.mic ? 'Detected' : 'Not Found'}</p>
                            </div>
                        </div>
                        {checks.mic ? <CheckCircleIcon style={{ color: 'var(--status-success)', width: '24px' }} /> : <span style={{ color: 'var(--status-error)', fontSize: '1.5rem' }}>❌</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '48px', height: '48px',
                                borderRadius: '50%',
                                background: checks.cam ? 'var(--success-50)' : 'var(--warning-50)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: checks.cam ? 'var(--status-success)' : 'var(--status-warning)'
                            }}>
                                <VideoOnIcon style={{ width: '24px' }} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontWeight: 600 }}>Camera</h4>
                                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{checks.cam ? 'Detected' : 'Not Found (Audio Only)'}</p>
                            </div>
                        </div>
                        {checks.cam ? <CheckCircleIcon style={{ color: 'var(--status-success)', width: '24px' }} /> : <span style={{ color: 'var(--status-warning)', fontSize: '1.5rem' }}>⚠️</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '48px', height: '48px',
                                borderRadius: '50%',
                                background: checks.permissions ? 'var(--success-50)' : 'var(--error-50)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: checks.permissions ? 'var(--status-success)' : 'var(--status-error)'
                            }}>
                                <CheckCircleIcon style={{ width: '24px' }} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontWeight: 600 }}>Permissions</h4>
                                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{checks.permissions ? 'Granted' : 'Needed'}</p>
                            </div>
                        </div>
                        {checks.permissions ? <CheckCircleIcon style={{ color: 'var(--status-success)', width: '24px' }} /> : <span style={{ color: 'var(--status-error)', fontSize: '1.5rem' }}>❌</span>}
                    </div>
                </div>
            </div>

            {(error || deviceError || !checks.permissions) && (
                <div style={{
                    backgroundColor: 'var(--error-50)',
                    border: '1px solid var(--error-200)',
                    color: 'var(--status-error)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: '2rem'
                }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>Issues Detected:</p>
                    <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
                        {error && <li>{error}</li>}
                        {deviceError && <li>{deviceError}</li>}
                        {!checks.permissions && <li>Please allow microphone access in your browser settings.</li>}
                        {!checks.mic && <li>No microphone found. Please connect a microphone.</li>}
                    </ul>
                </div>
            )}

            <button
                className="btn btn-primary"
                onClick={() => onStart(checks.cam)}
                disabled={isLoading || !isReady}
                style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '1rem',
                    fontSize: '1.1rem',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-md)'
                }}
            >
                {isLoading ? 'Connecting to Secure Room...' : 'Start Interview Session'}
            </button>
        </div>
    );
};

// Custom minimal controls
const CustomControls = () => {
    return (
        <div style={{
            padding: '1rem',
            background: 'white',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 20
        }}>
            <DisconnectButton style={{
                backgroundColor: 'var(--status-error)',
                color: 'white',
                padding: '0.75rem 2rem',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: 'var(--shadow-md)'
            }}>
                <PhoneOffIcon style={{ width: '18px' }} /> End Interview
            </DisconnectButton>
        </div>
    );
};

// Room Component
const RoomContent = ({ jobTitle }: { jobTitle: string }) => {
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false },
    );

    return (
        <div className="room-layout" style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--slate-900)' }}>
            {/* Header Overlay */}
            <div style={{
                position: 'absolute',
                top: '1.5rem',
                left: '2rem',
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--radius-lg)',
                zIndex: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(8px)'
            }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Interviewing For</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-primary)' }}>{jobTitle}</div>
            </div>

            <SessionTimer maxSeconds={900} />

            <div className="participant-grid" style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '1.5rem',
                padding: '6rem 2rem 6rem',
                alignContent: 'center'
            }}>
                {tracks.map((track) => {
                    const isAgent = !track.participant.isLocal;
                    const isVideoOff = !track.publication || track.publication.isMuted;

                    // Specific styling for Agent
                    const AGENT_IMG = "/ai-avatar.png";

                    return (
                        <ParticipantTile
                            key={track.participant.identity}
                            trackRef={track}
                            style={{
                                borderRadius: '1.5rem',
                                overflow: 'hidden',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                                position: 'relative',
                                aspectRatio: '16/9',
                                background: '#1a1a1a',
                                border: isAgent ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)'
                            }}
                        >
                            {isVideoOff ? (
                                <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b' }}>
                                    {isAgent ? (
                                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                            <img
                                                src={AGENT_IMG}
                                                alt="AI Interviewer"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => {
                                                    // Fallback if image fails
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                            {/* Fallback overlay if image missing/hidden */}
                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--primary-900), #0f172a)' }}>
                                                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🤖</div>
                                                <h3 style={{ color: 'white', fontWeight: 700 }}>AI Recruiter</h3>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                                            <div style={{
                                                width: '120px',
                                                height: '120px',
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, var(--color-primary), var(--secondary-500))',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '3.5rem',
                                                fontWeight: '800',
                                                color: 'white',
                                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)'
                                            }}>
                                                {track.participant.name ? track.participant.name.charAt(0).toUpperCase() : 'C'}
                                            </div>
                                            <span style={{ color: 'white', fontSize: '1.5rem', fontWeight: '600', letterSpacing: '0.025em' }}>
                                                {track.participant.name || 'Candidate'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <VideoTrack
                                    trackRef={track as TrackReference}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            )}

                            <div style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', zIndex: 10 }}>
                                <ParticipantName style={{
                                    color: 'white',
                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.75rem',
                                    fontWeight: '600',
                                    fontSize: '1rem',
                                    backdropFilter: 'blur(4px)'
                                }} />
                            </div>
                        </ParticipantTile>
                    );
                })}
            </div>
            <CustomControls />
            <RoomAudioRenderer />
        </div>
    );
};

export default function AvatarInterviewScreen({
    currentUser,
    interviewingCandidate,
    currentApplicationId,
    onSaveInterviewResults,
    onStartInterviewSession,
    onNavigate,
    jobsData
}: AvatarInterviewScreenProps) {
    const [token, setToken] = useState('');
    const [state, setState] = useState<InterviewState>('setup');
    const [error, setError] = useState('');
    const [roomUrl, setRoomUrl] = useState('');
    const [enableVideo, setEnableVideo] = useState(true);

    const startInterview = async (camAvailable: boolean) => {
        if (!currentApplicationId || !currentUser) return;
        setState('connecting');
        setError('');

        const isAudioOnlyConfig = interviewingCandidate?.interview_config?.mode === 'audio';
        const shouldUseVideo = camAvailable && !isAudioOnlyConfig;
        setEnableVideo(shouldUseVideo);

        try {
            const startResult = await onStartInterviewSession(currentApplicationId);
            if (!startResult.success) throw new Error('Failed to initialize interview session');

            const connectionDetails = await livekitService.connectToRoom(
                currentApplicationId.toString(),
                currentUser.name
            );

            setToken(connectionDetails.token);
            setRoomUrl(connectionDetails.serverUrl);
            setState('active');

        } catch (err: any) {
            console.error("Failed to start avatar interview:", err);
            setError(err.message || 'Could not connect to the interview room.');
            setState('setup');
        }
    };

    const handleLeave = useCallback(async () => {
        setState('analyzing');

        if (currentApplicationId) {
            let attempts = 0;
            const maxAttempts = 20;

            while (attempts < maxAttempts) {
                try {
                    const { data: latestCandidate } = await api.get(`/candidates/${currentApplicationId}`);

                    if (latestCandidate?.interview_config?.interviewStatus === 'finished') {
                        const config = latestCandidate.interview_config;
                        await onSaveInterviewResults(
                            currentApplicationId,
                            config.aiScore || 0,
                            config.transcript || '',
                            config.analysis,
                            config.audioRecordingUrl
                        );

                        onNavigate('interview-report', 'dashboard', { applicationId: currentApplicationId });
                        return;
                    }
                } catch (e) {
                    console.warn("Polling error:", e);
                }

                await new Promise(r => setTimeout(r, 2000));
                attempts++;
            }
        }

        setState('finished');
    }, [currentApplicationId, onSaveInterviewResults]);

    const handleError = (err: Error) => {
        console.error("LiveKit Room Error:", err);
        setError(`Connection error: ${err.message}. Please refresh.`);
        setState('setup');
    };

    if (!interviewingCandidate) return <div className="page-content center-content">Loading...</div>;

    const jobTitle = jobsData?.find(j => j.id === interviewingCandidate.jobId)?.title || interviewingCandidate.role;

    if (state === 'active' && token) {
        return (
            <LiveKitRoom
                serverUrl={roomUrl}
                token={token}
                connect={true}
                video={enableVideo}
                audio={true}
                onDisconnected={handleLeave}
                onError={handleError}
                data-lk-theme="default"
                style={{ height: '100vh', backgroundColor: 'var(--slate-900)' }}
                connectOptions={{
                    rtcConfig: {
                        iceServers: [
                            { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
                        ],
                    },
                }}
            >
                <RoomContent jobTitle={jobTitle} />
            </LiveKitRoom>
        );
    }

    if (state === 'finished') {
        return (
            <div className="page-container" style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '2rem'
            }}>
                <div style={{
                    width: '80px', height: '80px',
                    background: 'var(--success-50)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '2rem',
                    boxShadow: '0 0 0 8px var(--success-50)'
                }}>
                    <CheckCircleIcon style={{ width: '40px', height: '40px', color: 'var(--status-success)' }} />
                </div>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '1rem' }}>Interview Completed</h2>
                <p style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', marginBottom: '3rem' }}>
                    Thank you for completing the interview. Your results are being processed.
                </p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button className="btn btn-secondary" onClick={() => onNavigate('dashboard', 'dashboard')}>
                        Exit to Dashboard
                    </button>
                    <button className="btn btn-primary" onClick={() => onNavigate('interview-report', 'dashboard', { applicationId: currentApplicationId })}>
                        View Report
                    </button>
                </div>
            </div>
        );
    }

    if (state === 'analyzing') {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '4px solid var(--primary-100)', borderTopColor: 'var(--color-primary)', animation: 'spin 1s linear infinite' }}></div>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>Analyzing Results...</h2>
                    <p style={{ color: 'var(--color-text-muted)' }}>Please wait while we finalize your interview report.</p>
                </div>
            </div>
        );
    }

    return (
        <SetupScreen
            candidate={interviewingCandidate}
            jobTitle={jobTitle}
            onStart={startInterview}
            isLoading={state === 'connecting'}
            error={error}
        />
    );
}
