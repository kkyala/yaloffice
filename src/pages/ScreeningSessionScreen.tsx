
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { MicOnIcon, MicOffIcon, Volume2Icon, CheckCircleIcon, StopCircleIcon, AlertCircleIcon, PlayCircleIcon, AudioWaveIcon } from '../components/Icons';
import { useAI } from '../context/AIProvider';
import { LiveKitRoom, RoomAudioRenderer, BarVisualizer, useRoomContext } from '@livekit/components-react';
import { RoomEvent, Participant } from 'livekit-client';
import '@livekit/components-styles';

type SessionState = 'idle' | 'connecting' | 'active' | 'processing_report' | 'completed' | 'error';
type Transcript = { id: number; sender: 'user' | 'gemini'; text: string; timestamp: Date };

// Inner component to handle room events and transcription
function ActiveSessionView({ status, setStatus, stopSession, isMicOn, setIsMicOn, transcripts, setTranscripts }: any) {
    const room = useRoomContext();
    const [isSpeaking, setIsSpeaking] = useState(false);

    useEffect(() => {
        if (!room) return;

        const onTranscriptionReceived = (
            segments: any[],
            participant?: Participant,
            publication?: any
        ) => {
            const text = segments.map(s => s.text).join(' ');
            if (!text.trim()) return;

            const sender = participant?.identity === room.localParticipant.identity ? 'user' : 'gemini';

            setTranscripts((prev: Transcript[]) => {
                const newText = segments.map(s => s.text).join(' ');
                if (!newText.trim()) return prev;

                const sender = participant?.identity === room.localParticipant.identity ? 'user' : 'gemini';
                const last = prev[prev.length - 1];
                const isRecent = last && (new Date().getTime() - new Date(last.timestamp).getTime() < 3000);

                if (last && last.sender === sender && isRecent) {
                    const updated = [...prev];
                    updated[prev.length - 1] = { ...last, text: newText, timestamp: new Date() };
                    return updated;
                }

                return [...prev, {
                    id: Date.now(),
                    sender,
                    text: newText,
                    timestamp: new Date()
                }];
            });
        };

        const onActiveSpeakersChanged = (speakers: Participant[]) => {
            setIsSpeaking(speakers.length > 0);
        };

        room.on(RoomEvent.TranscriptionReceived, onTranscriptionReceived);
        room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);

        return () => {
            room.off(RoomEvent.TranscriptionReceived, onTranscriptionReceived);
            room.off(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);
        };
    }, [room, setTranscripts]);

    // Auto-scroll to bottom of transcripts
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts]);

    return (
        <div style={{ display: 'flex', height: '100%', gap: '1.5rem', flexDirection: 'row', flexWrap: 'wrap' }}>
            {/* Left Column: Visualizer & Controls */}
            <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '500px' }}>
                <div style={{
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: 'var(--shadow-lg)',
                    border: '1px solid var(--color-border)',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <RoomAudioRenderer />

                    {/* Visualizer Area */}
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'radial-gradient(circle at center, var(--primary-50) 0%, var(--color-surface) 70%)',
                        padding: '2rem',
                        position: 'relative'
                    }}>
                        {/* Ambient Glow */}
                        <div style={{
                            position: 'absolute',
                            width: '300px',
                            height: '300px',
                            background: 'radial-gradient(circle, var(--primary-200) 0%, transparent 70%)',
                            borderRadius: '50%',
                            filter: 'blur(60px)',
                            opacity: isSpeaking ? 0.6 : 0.2,
                            transition: 'opacity 0.3s ease',
                            animation: isSpeaking ? 'pulse 2s infinite' : 'none'
                        }} />

                        <div style={{
                            position: 'relative',
                            zIndex: 10,
                            width: '100%',
                            maxWidth: '400px',
                            height: '120px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {status === 'active' ? (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                                    <BarVisualizer
                                        state="speaking"
                                        barCount={20}
                                        trackRef={undefined}
                                        style={{ height: '80px', width: '100%' }}
                                        options={{ color: 'currentColor' }}
                                    />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', opacity: 0.7 }}>
                                    <div style={{
                                        width: '64px',
                                        height: '64px',
                                        background: 'var(--primary-100)',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--color-primary)'
                                    }}>
                                        <Volume2Icon style={{ width: '32px', height: '32px' }} />
                                    </div>
                                    <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Connecting secure line...</p>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '3rem', textAlign: 'center', position: 'relative', zIndex: 10 }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>
                                {status === 'active' ? 'AI Recruiter is Listening' : 'Establishing Connection...'}
                            </h3>
                            <p style={{ color: 'var(--color-text-muted)' }}>
                                {status === 'active' ? 'Speak naturally. I am analyzing your responses.' : 'Please wait while we prepare your interview session.'}
                            </p>
                        </div>
                    </div>

                    {/* Controls Bar */}
                    <div style={{
                        height: '100px',
                        background: 'var(--color-surface)',
                        borderTop: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2.5rem'
                    }}>
                        <button
                            onClick={() => setIsMicOn(!isMicOn)}
                            className={`btn ${isMicOn ? 'btn-secondary' : 'btn-danger'}`}
                            style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0
                            }}
                            title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
                        >
                            {isMicOn ? <MicOnIcon style={{ width: '24px', height: '24px' }} /> : <MicOffIcon style={{ width: '24px', height: '24px' }} />}
                        </button>

                        <button
                            className="btn btn-danger"
                            onClick={stopSession}
                            style={{
                                padding: '0 2rem',
                                height: '56px',
                                borderRadius: 'var(--radius-full)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                fontSize: '1rem'
                            }}
                        >
                            <StopCircleIcon style={{ width: '20px', height: '20px' }} />
                            End Interview
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Column: Transcript */}
            <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
                <div style={{
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: 'var(--shadow-md)',
                    border: '1px solid var(--color-border)',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '1.25rem',
                        borderBottom: '1px solid var(--color-border)',
                        background: 'var(--slate-50)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <h3 style={{ fontWeight: 700, color: 'var(--color-text-main)', margin: 0, fontSize: '1rem' }}>Live Transcript</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: 'var(--status-success)',
                                animation: 'pulse 2s infinite'
                            }}></span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Real-time</span>
                        </div>
                    </div>

                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                    }}>
                        {transcripts.length === 0 ? (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', opacity: 0.6 }}>
                                <AudioWaveIcon style={{ width: '48px', height: '48px', marginBottom: '1rem', opacity: 0.2 }} />
                                <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>Conversation will appear here...</p>
                            </div>
                        ) : (
                            transcripts.map((t: Transcript) => (
                                <div key={t.id} style={{
                                    display: 'flex',
                                    justifyContent: t.sender === 'user' ? 'flex-end' : 'flex-start'
                                }}>
                                    <div style={{
                                        maxWidth: '85%',
                                        padding: '0.75rem 1rem',
                                        borderRadius: 'var(--radius-lg)',
                                        fontSize: '0.9rem',
                                        lineHeight: '1.5',
                                        boxShadow: 'var(--shadow-sm)',
                                        background: t.sender === 'user' ? 'var(--color-primary)' : 'var(--slate-100)',
                                        color: t.sender === 'user' ? 'white' : 'var(--color-text-main)',
                                        borderTopRightRadius: t.sender === 'user' ? 'var(--radius-sm)' : 'var(--radius-lg)',
                                        borderTopLeftRadius: t.sender === 'user' ? 'var(--radius-lg)' : 'var(--radius-sm)'
                                    }}>
                                        {t.text}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={transcriptEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ScreeningSessionScreen({ currentUser, onNavigate, interviewingCandidate, jobsData }: any) {
    const { isReady } = useAI();
    const [status, setStatus] = useState<SessionState>('idle');
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const [error, setError] = useState('');
    const [report, setReport] = useState<any>(null);
    const [isMicOn, setIsMicOn] = useState(true);
    const [resumeText, setResumeText] = useState('');

    // LiveKit State
    const [token, setToken] = useState('');
    const [liveKitUrl, setLiveKitUrl] = useState('');

    // Get Job Context
    const job = interviewingCandidate ? jobsData?.find((j: any) => j.id === interviewingCandidate.jobId) : null;

    useEffect(() => {
        // Load resume context
        const loadResume = async () => {
            try {
                const { data } = await api.get(`/resumes/${currentUser.id}`);
                // Data is an array, get the first one (latest)
                const latestResume = Array.isArray(data) ? data[0] : data;

                if (latestResume && latestResume.parsed_data) {
                    const { skills, experience, education } = latestResume.parsed_data;
                    const text = `
                        Candidate Name: ${currentUser.name}
                        Skills: ${skills ? skills.join(', ') : 'Not specified'}
                        Experience: ${experience ? JSON.stringify(experience) : 'Not specified'}
                        Education: ${education ? JSON.stringify(education) : 'Not specified'}
                    `;
                    setResumeText(text);
                }
            } catch (err) {
                console.warn("Failed to load resume, using default context:", err);
                setResumeText(`Candidate Name: ${currentUser.name}. The candidate has applied for a software engineering role.`);
            }
        };
        loadResume();
    }, [currentUser.id, currentUser.name]);

    const startLiveSession = async () => {
        setStatus('connecting');
        setError('');
        try {
            const contextToUse = resumeText || `Candidate Name: ${currentUser.name}. The candidate is applying for a generic technical role.`;

            let systemInstruction = `
                You are an AI Recruiter conducting an initial screening for Yāl Office.
                Your goal is to verify the skills mentioned in the candidate's resume in a light, conversational manner.
                Resume Context: ${contextToUse}
                Do not ask deep technical coding questions yet. Focus on their experience and comfort level with the skills.
                Keep your responses concise, professional, and encouraging.
                Start by greeting the candidate by name and asking about their recent experience related to their skills.
            `;

            // Append Job Specific Instructions
            if (job) {
                systemInstruction += `\n\nTarget Job: ${job.title}\n`;
                if (job.screening_config?.questions) {
                    systemInstruction += `Specific Screening Criteria/Questions: ${job.screening_config.questions}\nEnsure you cover these points during the conversation.`;
                }
            }

            const { data } = await api.post('/livekit/token', {
                identity: currentUser.id,
                roomName: `interview-${currentUser.id}-${Date.now()}`,
                participantMetadata: { systemInstruction }
            });

            setToken(data.token);
            // Use 127.0.0.1 for LiveKit WebSocket
            const livekitUrl = 'ws://127.0.0.1:7880';
            console.log("Connecting to LiveKit URL:", livekitUrl);
            setLiveKitUrl(livekitUrl);

        } catch (err: any) {
            console.error("Failed to start session:", err);
            setError(err.message || "Failed to connect to interview server.");
            setStatus('error');
        }
    };

    const stopSession = useCallback(async () => {
        setStatus('processing_report');
        setToken('');

        try {
            // Call backend to analyze the screening session
            const { data } = await api.post('/interview/analyze-screening', {
                transcripts,
                candidateName: currentUser.name,
                candidateId: currentUser.id,
                jobTitle: job ? job.title : 'Initial Resume Screening',
                jobId: job?.id, // Pass job ID
                resumeText: resumeText // Pass the resume context
            });

            if (data && data.success && data.analysis) {
                setReport(data.analysis);
                setStatus('completed');
            } else {
                console.error("Analysis failed:", data);
                setError('Failed to generate interview report.');
                setStatus('error');
            }
        } catch (err) {
            console.error("Error analyzing session:", err);
            setError('An error occurred while analyzing the interview.');
            setStatus('error');
        }
    }, [transcripts, currentUser, resumeText]);

    if (status === 'processing_report') {
        return (
            <div style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '4px solid var(--primary-100)', borderTopColor: 'var(--color-primary)', animation: 'spin 1s linear infinite' }}></div>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>Analyzing Interview...</h2>
                    <p style={{ color: 'var(--color-text-muted)' }}>Please wait while our AI generates your assessment report.</p>
                </div>
            </div>
        );
    }

    if (report) {
        return (
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem', animation: 'fadeIn 0.5s ease-out' }}>
                <div style={{
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: 'var(--shadow-xl)',
                    padding: '3rem',
                    textAlign: 'center',
                    border: '1px solid var(--color-border)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '6px', background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))' }}></div>

                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'var(--success-50)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 2rem',
                        boxShadow: '0 0 0 8px var(--success-50)'
                    }}>
                        <CheckCircleIcon style={{ width: '40px', height: '40px', color: 'var(--status-success)' }} />
                    </div>

                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '1rem', letterSpacing: '-0.025em' }}>Screening Completed</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '3rem', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
                        Great job! Our AI has analyzed your responses and generated a preliminary assessment.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem', textAlign: 'left' }}>
                        <div style={{ background: 'var(--primary-50)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--primary-100)' }}>
                            <div style={{ color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>Overall Score</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                                <span style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--primary-900)', letterSpacing: '-0.05em' }}>{report.score}</span>
                                <span style={{ fontSize: '1.25rem', color: 'var(--primary-400)', fontWeight: 500 }}>/100</span>
                            </div>
                        </div>
                        <div style={{ background: 'var(--success-50)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--success-200)' }}>
                            <div style={{ color: 'var(--status-success)', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>Key Strengths</div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {report.strengths && report.strengths.slice(0, 3).map((s: string, i: number) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--success-900)', fontWeight: 500, fontSize: '0.9rem' }}>
                                        <div style={{ marginTop: '0.4rem', width: '5px', height: '5px', borderRadius: '50%', background: 'var(--status-success)', flexShrink: 0 }} />
                                        {s}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div style={{ background: 'var(--warning-50)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--warning-200)' }}>
                            <div style={{ color: 'var(--status-warning)', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>Points to Improve</div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {report.weaknesses && report.weaknesses.slice(0, 3).map((w: string, i: number) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--warning-900)', fontWeight: 500, fontSize: '0.9rem' }}>
                                        <div style={{ marginTop: '0.4rem', width: '5px', height: '5px', borderRadius: '50%', background: 'var(--status-warning)', flexShrink: 0 }} />
                                        {w}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {report.skills_analysis && Array.isArray(report.skills_analysis) && (
                        <div style={{ marginBottom: '3rem', textAlign: 'left' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '1.5rem' }}>Skill Breakdown</h3>
                            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--color-surface)' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--color-border)' }}>
                                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Skill</th>
                                            <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Score</th>
                                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Assessment</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.skills_analysis.map((item: any, i: number) => (
                                            <tr key={i} style={{ borderBottom: i === report.skills_analysis.length - 1 ? 'none' : '1px solid var(--color-border)' }}>
                                                <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-text-main)' }}>{item.skill}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: 'var(--radius-full)',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        background: item.score >= 70 ? 'var(--success-50)' : item.score >= 40 ? 'var(--warning-50)' : 'var(--error-50)',
                                                        color: item.score >= 70 ? 'var(--status-success)' : item.score >= 40 ? 'var(--status-warning)' : 'var(--status-error)'
                                                    }}>
                                                        {item.score}%
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{item.reason}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
                        <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>
                            Back to Dashboard
                        </button>
                        <button className="btn btn-primary" onClick={() => onNavigate('find-jobs')}>
                            Apply for More Jobs
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.025em', margin: 0 }}>AI Screening</h1>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Live voice assessment with our AI recruiter</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {(status === 'active' || status === 'connecting') && (
                        <button
                            onClick={stopSession}
                            className="btn btn-danger btn-sm"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <StopCircleIcon style={{ width: '16px', height: '16px' }} />
                            End Screening
                        </button>
                    )}
                    <div style={{
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: status === 'active' ? 'var(--error-50)' : status === 'connecting' ? 'var(--warning-50)' : 'var(--slate-100)',
                        color: status === 'active' ? 'var(--status-error)' : status === 'connecting' ? 'var(--status-warning)' : 'var(--color-text-muted)',
                        border: `1px solid ${status === 'active' ? 'var(--error-200)' : status === 'connecting' ? 'var(--warning-200)' : 'var(--slate-200)'}`,
                    }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: status === 'active' ? 'var(--status-error)' : status === 'connecting' ? 'var(--status-warning)' : 'var(--slate-400)',
                            animation: status === 'active' ? 'pulse 1.5s infinite' : status === 'connecting' ? 'bounce 1s infinite' : 'none'
                        }} />
                        {status === 'active' ? 'LIVE RECORDING' : status === 'connecting' ? 'CONNECTING...' : 'READY'}
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ flex: 1, minHeight: 0 }}>
                {token ? (
                    <LiveKitRoom
                        token={token}
                        serverUrl={liveKitUrl}
                        connect={true}
                        audio={isMicOn}
                        video={false}
                        onConnected={() => setStatus('active')}
                        onDisconnected={() => {
                            if (status === 'active') stopSession();
                        }}
                        onError={(err) => {
                            console.error("LiveKit Error:", err);
                            setError("Connection error occurred.");
                            setStatus('error');
                        }}
                        style={{ height: '100%' }}
                    >
                        <ActiveSessionView
                            status={status}
                            setStatus={setStatus}
                            stopSession={stopSession}
                            isMicOn={isMicOn}
                            setIsMicOn={setIsMicOn}
                            transcripts={transcripts}
                            setTranscripts={setTranscripts}
                        />
                    </LiveKitRoom>
                ) : (
                    // Ready State
                    <div style={{
                        height: '100%',
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-xl)',
                        boxShadow: 'var(--shadow-lg)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '3rem',
                        textAlign: 'center',
                        backgroundImage: 'radial-gradient(circle at center, var(--primary-50) 0%, transparent 60%)'
                    }}>
                        <div style={{
                            width: '120px',
                            height: '120px',
                            background: 'white',
                            borderRadius: '2.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '2rem',
                            boxShadow: 'var(--shadow-xl)',
                            transform: 'rotate(3deg)',
                            border: '1px solid var(--color-border)'
                        }}>
                            <MicOnIcon style={{ width: '56px', height: '56px', color: 'var(--color-primary)' }} />
                        </div>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '1rem', letterSpacing: '-0.025em' }}>Ready for your assessment?</h2>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '3rem', fontSize: '1.2rem', maxWidth: '500px', lineHeight: '1.6' }}>
                            Ensure you're in a quiet environment. Our AI recruiter will verify your resume details.
                        </p>

                        {error && (
                            <div style={{
                                marginBottom: '2rem',
                                padding: '1rem 1.5rem',
                                background: 'var(--error-50)',
                                color: 'var(--status-error)',
                                borderRadius: 'var(--radius-lg)',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                border: '1px solid var(--error-200)',
                                maxWidth: '500px',
                                textAlign: 'left'
                            }}>
                                <AlertCircleIcon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                                {error}
                            </div>
                        )}

                        <button
                            onClick={startLiveSession}
                            disabled={!isReady}
                            className={`btn ${isReady ? 'btn-primary' : 'btn-secondary'}`}
                            style={{
                                padding: '1.25rem 3rem',
                                fontSize: '1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                opacity: isReady ? 1 : 0.7
                            }}
                        >
                            Start Screening
                            <PlayCircleIcon style={{ width: '24px', height: '24px' }} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
