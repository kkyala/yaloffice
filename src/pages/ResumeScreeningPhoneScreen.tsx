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

            if (response.success) {
                setSessionId(response.sessionId);
                setStatus('on-call');
                setLogs(prev => [...prev, "Call initiated to " + phoneNumber]);

                // Start polling for analysis/completion immediately since we aren't connected to the room to know when it ends
                monitorCallStatus(response.sessionId);
            } else {
                setError("Failed to initiate call. Error: " + (response.message || response.error || "Unknown"));
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

    const monitorCallStatus = (sid: string) => {
        // Don't set status to 'analyzing' immediately. We are 'on-call' until backend says otherwise.
        // setStatus('analyzing'); 

        const poll = setInterval(async () => {
            try {
                const res = await aiService.getInterviewStatus(sid);

                // If the call is effectively done but we are still in 'on-call' state in UI
                if ((res.status === 'completed' || res.status === 'finished') && status !== 'completed') {
                    if (poll) clearInterval(poll);
                    setStatus('completed');
                    setLogs(prev => [...prev, "Interview Finished!", "Redirecting..."]);
                    setTimeout(onComplete, 3000);
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 3000);
        setAnalysisPoll(poll);
    };

    const handleDisconnected = async () => {
        // Only trigger if we were actually in a call
        if (status === 'on-call' || status === 'calling') {
            if (sessionId) {
                monitorCallStatus(sessionId);
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
                        <p>Enter your phone number to receive the call.</p>

                        <div style={{ margin: '1rem auto', maxWidth: '300px' }}>
                            <input
                                type="tel"
                                className="form-control"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+1 555 123 4567"
                                style={{ textAlign: 'center', fontSize: '1.2rem', padding: '0.8rem' }}
                            />
                        </div>

                        <button
                            className="btn btn-primary btn-lg"
                            onClick={handleCall}
                            disabled={!phoneNumber || phoneNumber === 'VoIP-User'}
                            style={{ marginTop: '1rem', padding: '1rem 3rem', borderRadius: '50px', fontSize: '1.2rem' }}
                        >
                            Start Call
                        </button>
                    </div>
                )}

                {status === 'calling' && (
                    <div>
                        <h2>Initiating Call...</h2>
                        <p>Calling {phoneNumber}...</p>
                    </div>
                )}

                {status === 'on-call' && (
                    <div className="active-call-state">
                        <h2>Call in Progress</h2>
                        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                            We are calling your phone. Please pick up to start the interview.
                        </p>
                        <hr style={{ margin: '2rem 0', opacity: 0.1 }} />
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Speak clearly. The AI will ask you questions based on your resume.
                        </p>
                        <button className="btn btn-outline-danger" onClick={onComplete} style={{ marginTop: '2rem' }}>
                            End Session
                        </button>
                    </div>
                )}

                {(status === 'analyzing' || status === 'completed') && (
                    <div>
                        <h2>Processing Results</h2>
                        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
                        <p>The AI is analyzing your responses...</p>
                    </div>
                )}

                {error && (
                    <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
                        {error}
                        <div style={{ marginTop: '1rem' }}>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setStatus('idle')}>Try Again</button>
                        </div>
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
