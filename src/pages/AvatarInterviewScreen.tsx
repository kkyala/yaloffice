
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
} from '@livekit/components-react';
import '@livekit/components-styles';
import { livekitService } from '../services/livekitService';
import { interviewService, TranscriptEntry } from '../services/interviewService';
import { api } from '../services/api';
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
            top: '1rem',
            right: '1rem',
            background: isUrgent ? '#ef4444' : 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontWeight: 'bold',
            fontSize: '1.2rem',
            backdropFilter: 'blur(4px)',
            zIndex: 10,
            transition: 'background 0.3s'
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
        <div className="interview-welcome-container">
            <h1>AI Avatar Interview</h1>
            <p style={{ fontSize: '1.2rem', marginBottom: '3rem', color: 'var(--text-secondary)' }}>
                Welcome to your AI-powered conversational interview for <strong style={{ color: 'var(--primary-color)' }}>{jobTitle}</strong>
            </p>

            <div className="device-check-panel glass-panel">
                <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem' }}>System Check</h2>
                <div className="device-check-item">
                    {checks.mic ? <CheckCircleIcon style={{ color: 'var(--success-color)', width: '28px', height: '28px' }} /> : <span style={{ color: 'var(--error-color)', fontSize: '1.5rem' }}>❌</span>}
                    <span style={{ fontSize: '1.1rem' }}>Microphone {checks.mic ? 'Detected' : 'Not Found'}</span>
                </div>
                <div className="device-check-item" style={{ margin: '1rem 0' }}>
                    {checks.cam ? <CheckCircleIcon style={{ color: 'var(--success-color)', width: '28px', height: '28px' }} /> : <span style={{ color: checks.cam ? 'var(--success-color)' : 'var(--warning-color)', fontSize: '1.5rem' }}>{checks.cam ? '✓' : '⚠️'}</span>}
                    <span style={{ fontSize: '1.1rem' }}>Camera {checks.cam ? 'Detected' : 'Not Found (Audio Only)'}</span>
                </div>
                <div className="device-check-item">
                    {checks.permissions ? <CheckCircleIcon style={{ color: 'var(--success-color)', width: '28px', height: '28px' }} /> : <span style={{ color: 'var(--error-color)', fontSize: '1.5rem' }}>❌</span>}
                    <span style={{ fontSize: '1.1rem' }}>Permissions {checks.permissions ? 'Granted' : 'Needed'}</span>
                </div>
            </div>

            {(error || deviceError || !checks.permissions) && (
                <div className="error-banner" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error-color)', color: 'var(--error-color)', padding: '1rem', borderRadius: 'var(--border-radius)', marginBottom: '2rem', textAlign: 'left' }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>Issues Detected:</p>
                    <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0 }}>
                        {error && <li>{error}</li>}
                        {deviceError && <li>{deviceError}</li>}
                        {!checks.permissions && <li>Please allow microphone access in your browser settings.</li>}
                        {!checks.mic && <li>No microphone found. Please connect a microphone.</li>}
                    </ul>
                </div>
            )}

            <button className="btn btn-primary btn-lg" onClick={() => onStart(checks.cam)} disabled={isLoading || !isReady} style={{ width: '100%', maxWidth: '300px', padding: '1rem', fontSize: '1.2rem' }}>
                {isLoading ? 'Connecting...' : 'Start Interview Session'}
            </button>
        </div>
    );
};

// Custom minimal controls
const CustomControls = () => {
    return (
        <div className="livekit-control-bar" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <DisconnectButton style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                End Interview
            </DisconnectButton>
        </div>
    );
};

// Room Component
// Room Component
const RoomContent = ({ jobTitle }: { jobTitle: string }) => {
    // Render the room layout with participants
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false },
    );

    return (
        <div className="room-layout" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Header Overlay */}
            <div style={{
                position: 'absolute',
                top: '1rem',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '0.5rem 1.5rem',
                borderRadius: '20px',
                zIndex: 10,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backdropFilter: 'blur(5px)'
            }}>
                <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Interviewing For</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{jobTitle}</span>
            </div>

            <SessionTimer maxSeconds={900} /> {/* 15 Minutes */}

            <div className="participant-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem', padding: '1rem', marginTop: '4rem' }}>
                {tracks.map((track) => {
                    const isAgent = !track.participant.isLocal;
                    // Check if this is a Camera track and if it is muted or unpublished
                    const isVideoOff = !track.publication || track.publication.isMuted;
                    const AGENT_IMG = "/ai-avatar.png";
                    // Using a professional business portrait instead of a 3D avatar
                    const CANDIDATE_IMG = "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80";

                    return (
                        <ParticipantTile
                            key={track.participant.identity}
                            trackRef={track}
                            style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', position: 'relative' }}
                        >
                            {isVideoOff ? (
                                <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a' }}>
                                    {isAgent ? (
                                        <img
                                            src={AGENT_IMG}
                                            alt="AI Interviewer"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 1 }}
                                        />
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: '100px',
                                                height: '100px',
                                                borderRadius: '50%',
                                                background: 'var(--primary-color)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '2.5rem',
                                                fontWeight: 'bold',
                                                color: 'white',
                                                boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                                            }}>
                                                {track.participant.name ? track.participant.name.charAt(0).toUpperCase() : 'C'}
                                            </div>
                                            <span style={{ color: 'white', fontSize: '1.5rem', fontWeight: '600' }}>
                                                {track.participant.name || 'Candidate'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <VideoTrack
                                    trackRef={track}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            )}

                            {/* Always Overlay Participant Name */}
                            <div style={{ position: 'absolute', bottom: '10px', left: '10px', zIndex: 10 }}>
                                <ParticipantName style={{
                                    color: 'white',
                                    backgroundColor: 'rgba(0,0,0,0.5)',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontWeight: '500',
                                    fontSize: '0.9rem'
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

        // Disable video if not available or strictly audio-only mode
        const isAudioOnlyConfig = interviewingCandidate?.interview_config?.mode === 'audio';
        const shouldUseVideo = camAvailable && !isAudioOnlyConfig;
        setEnableVideo(shouldUseVideo);

        try {
            // 1. Signal backend to start interview (initializes DB record)
            const startResult = await onStartInterviewSession(currentApplicationId);
            if (!startResult.success) throw new Error('Failed to initialize interview session');

            // 2. Get Connection Token from Backend (LiveKit)
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
            const maxAttempts = 20; // 40 seconds max (2s interval)

            // Poll for the Agent to update the DB
            while (attempts < maxAttempts) {
                try {
                    // Fetch directly to bypass stale props
                    const { data: latestCandidate } = await api.get(`/candidates/${currentApplicationId}`);

                    if (latestCandidate?.interview_config?.interviewStatus === 'finished') {
                        // Found the results!
                        // We must trigger a refresh in App.tsx so the "View Report" button
                        // will lead to a configured report.
                        // We can use a dummy call to onSaveInterviewResults to trigger refetch,
                        // or better yet, we should add a refresh callback. 
                        // But since we don't have one, we can call onSaveInterviewResults with nulls
                        // to just trigger the refetch logic if possible, or assume onNavigate handles it?
                        // No, onNavigate doesn't refetch.
                        // Let's rely on the fact that if we just wait, the user clicking "View" 
                        // will navigate, but the data in App state is STALE.

                        // HACK: Re-triggering a "save" identical to what's there is safe,
                        // but inefficient. 
                        // A better way: The App receives candidatesData.
                        // We really need App.tsx's refetchCandidates to run.

                        // Calling onSaveInterviewResults with the *just fetched* data updates the state *and* DB.
                        const config = latestCandidate.interview_config;
                        await onSaveInterviewResults(
                            currentApplicationId,
                            config.aiScore || 0,
                            config.transcript || '',
                            config.analysis,
                            config.audioRecordingUrl
                        );
                        break;
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

    if (!interviewingCandidate) return <div className="loading-screen">Loading...</div>;

    const jobTitle = jobsData?.find(j => j.id === interviewingCandidate.jobId)?.title || interviewingCandidate.role;

    // Determine video prop for LiveKitRoom: true (on), false (off), or constraints
    // We rely on enableVideo state calculated during setup

    if (state === 'active' && token) {
        return (
            <LiveKitRoom
                serverUrl={roomUrl}
                token={token}
                connect={true}
                video={false}
                audio={true}
                onDisconnected={handleLeave}
                onError={handleError}
                data-lk-theme="default"
                style={{ height: '100vh', backgroundColor: 'var(--bg-primary)' }}
            >
                <RoomContent jobTitle={jobTitle} />
            </LiveKitRoom>
        );
    }

    if (state === 'finished') {
        return (
            <div className="finished-screen">
                <h2>Interview Completed</h2>
                <p>Thank you for completing the interview. Your results are being processed.</p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button className="btn btn-primary" onClick={() => onNavigate('interview-report', 'dashboard', { applicationId: currentApplicationId })}>
                        View Report
                    </button>
                    <button className="btn btn-secondary" onClick={() => onNavigate('dashboard', 'dashboard')}>
                        Exit to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (state === 'analyzing') {
        return <div className="loading-screen"><h2>Analyzing Interview...</h2><p>Please wait while we process your results.</p></div>;
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
