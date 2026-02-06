import React, { useState, useEffect } from 'react';
import { aiService } from '../services/aiService';
import { LiveKitRoom, RoomAudioRenderer, BarVisualizer, useLocalParticipant, useRoomContext } from '@livekit/components-react';
import '@livekit/components-styles';

interface ResumeScreeningPhoneScreenProps {
    currentUser: any;
    resumeText: string;
    onComplete: () => void;
    jobId?: number;
    jobTitle?: string;
}

const AudioControls = ({ onEndCall }: { onEndCall: () => void }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ height: '50px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {/* Visualizer will be inactive without trackRef, but avoids type error. */}
                <BarVisualizer barCount={7} trackRef={undefined} style={{ height: '40px', width: '200px' }} />
            </div>
            <button className="btn btn-outline-danger" onClick={onEndCall} style={{ marginTop: '2rem' }}>
                End Call
            </button>
        </div>
    );
};

const ResumeScreeningPhoneScreen: React.FC<ResumeScreeningPhoneScreenProps> = ({ currentUser, resumeText, onComplete, jobId, jobTitle }) => {
    const [status, setStatus] = useState<'idle' | 'calling' | 'on-call' | 'completed' | 'analyzing'>('idle');
    const [phoneNumber, setPhoneNumber] = useState(currentUser?.personalInfo?.phone || currentUser?.phone || 'VoIP-User'); // Phone not strictly needed for VoIP but kept for flow
    const [token, setToken] = useState<string>("");
    const [liveKitUrl, setLiveKitUrl] = useState<string>("");
    const [sessionId, setSessionId] = useState<string>("");
    const [error, setError] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [analysisPoll, setAnalysisPoll] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Pre-fill phone if available from resume text (optional now)
        if (!phoneNumber && resumeText) {
            const phoneMatch = resumeText.match(/(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
            if (phoneMatch) setPhoneNumber(phoneMatch[0]);
        }
    }, [resumeText, phoneNumber]);

    const handleCall = async () => {
        setStatus('calling');
        setLogs(prev => [...prev, "Connecting to AI Interviewer..."]);
        setError('');

        try {
            // Initiate Session & Get Token
            const response = await aiService.startPhoneScreening(phoneNumber || 'voip-user', resumeText, jobTitle);

            if (response.success && response.token) {
                setToken(response.token);
                setSessionId(response.sessionId);
                setLiveKitUrl(response.wsUrl || import.meta.env.VITE_LIVEKIT_URL || "wss://yal-office-bi7w482a.livekit.cloud");
                setStatus('on-call');
                setLogs(prev => [...prev, "Connected via VoIP.", "Waiting for Agent..."]);

                // We don't need to poll for completion if we trust the "End Call" button or Room Disconnect
                // But the Agent might end it.
            } else {
                setError("Failed to initiate call. Status: " + response.status);
                setStatus('idle');
            }
        } catch (err: any) {
            console.error("Call failed:", err);
            setError(err.message || "Failed to connect to AI Service.");
            setStatus('idle');
        }
    };

    // Clean up poll on unmount
    useEffect(() => {
        return () => {
            if (analysisPoll) clearInterval(analysisPoll);
        };
    }, [analysisPoll]);

    const waitForAnalysis = (sid: string) => {
        setStatus('analyzing');
        setLogs(prev => [...prev, "Call ended. Waiting for AI analysis..."]);

        const poll = setInterval(async () => {
            try {
                const res = await aiService.getInterviewStatus(sid);
                if (res.status === 'completed' || res.status === 'finished') {
                    if (poll) clearInterval(poll);
                    setStatus('completed');
                    setLogs(prev => [...prev, "Analysis Complete!"]);
                    setTimeout(onComplete, 2000);
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 2000);
        setAnalysisPoll(poll);
    };

    const handleDisconnected = async () => {
        // Only trigger if we were actually in a call
        if (status === 'on-call' || status === 'calling') {
            if (sessionId) {
                waitForAnalysis(sessionId);
            } else {
                // Fallback if session ID missing (shouldn't happen if token received)
                onComplete();
            }
        }
    };


    return (
        <div className="ai-screening-phone">
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>AI Voice Screening</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Speak directly with our AI Recruiter.</p>
                </div>
                <button className="btn btn-outline-danger btn-sm" onClick={onComplete}>
                    Cancel
                </button>
            </header>

            <div className="card p-5" style={{
                maxWidth: '600px',
                margin: '2rem auto',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                backgroundColor: 'var(--surface-color)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
            }}>

                <div className="phone-icon-wrapper" style={{
                    width: '120px',
                    height: '120px',
                    margin: '0 auto',
                    borderRadius: '50%',
                    backgroundColor: status === 'on-call' ? '#22c55e' : (status === 'calling' ? '#f59e0b' : 'var(--bg-secondary)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '3rem',
                    transition: 'all 0.5s ease',
                    boxShadow: status === 'on-call' ? '0 0 0 10px rgba(34, 197, 94, 0.2)' : 'none',
                    animation: status === 'calling' ? 'pulse 1.5s infinite' : 'none'
                }}>
                    📞
                </div>

                {status === 'idle' && (
                    <div className="phone-input-section">
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Ready to Start?</h2>
                        <p>We will use your device microphone.</p>

                        <button
                            className="btn btn-primary btn-lg"
                            onClick={handleCall}
                            style={{ marginTop: '2rem', padding: '1rem 3rem', borderRadius: '50px', fontSize: '1.2rem' }}
                        >
                            Start Call
                        </button>
                    </div>
                )}

                {status === 'calling' && (
                    <div>
                        <h2>Connecting...</h2>
                    </div>
                )}

                {status === 'on-call' && token && (
                    <LiveKitRoom
                        video={false}
                        audio={true}
                        token={token}
                        serverUrl={liveKitUrl}
                        connect={true}
                        onDisconnected={handleDisconnected}
                        data-lk-theme="default"
                    >
                        <h2>Interview in Progress</h2>
                        <p style={{ color: '#22c55e', fontWeight: 'bold' }}>• Live Connection</p>
                        <RoomAudioRenderer />
                        <AudioControls onEndCall={() => setStatus('completed') /* Will trigger disconnect effect via LiveKitRoom unmount or logic */} />
                    </LiveKitRoom>
                )}

                {status === 'analyzing' || status === 'completed' && (
                    <div>
                        <h2>Processing Results</h2>
                        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
                        <p>The AI is analyzing your responses...</p>
                    </div>
                )}

            </div>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
                    70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
                }
            `}</style>
        </div>
    );
};

export default ResumeScreeningPhoneScreen;
