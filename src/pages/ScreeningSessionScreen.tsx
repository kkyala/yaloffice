import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { MicOnIcon, MicOffIcon, Volume2Icon, CheckCircleIcon, StopCircleIcon, AlertCircleIcon, PlayCircleIcon } from '../components/Icons';
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

            // LiveKit sends segments. Each segment has an ID.
            // We need to track segments to update them properly instead of appending.
            // However, the simple UI just shows a list of bubbles.
            // We'll use a Map to store segments by ID, then convert to array for display.

            setTranscripts((prev: Transcript[]) => {
                // We need to know if this is a new segment or an update to an existing one.
                // Since we don't have segment IDs in the simple Transcript type, we have to be clever.
                // BUT, LiveKit's `segments` array contains the *current* state of the segments being transcribed.
                // Usually it's just one active segment that is updating.

                const newText = segments.map(s => s.text).join(' ');
                if (!newText.trim()) return prev;

                const sender = participant?.identity === room.localParticipant.identity ? 'user' : 'gemini';
                const last = prev[prev.length - 1];

                // If the last message is from the same sender and is recent (within 2s), we assume it's the same utterance being updated.
                // We REPLACE the text if it looks like an update (e.g. starts with same words) or APPEND if it's a continuation.
                // Actually, LiveKit sends the *accumulated* text for the current segment. 
                // So if we are in the same "turn", we should probably replace the last bubble's text with this new complete segment text.

                const isRecent = last && (new Date().getTime() - new Date(last.timestamp).getTime() < 3000);

                if (last && last.sender === sender && isRecent) {
                    // Check if the new text is a superset of the old text (interim update)
                    // or if it's a correction.
                    // Simple heuristic: just replace the last bubble with this new text segment
                    // BUT, if we have multiple segments, we might be overwriting history.
                    // Let's assume for a simple dialogue, we just update the tail.

                    // If the new text is shorter than the old text, it might be a new sentence starting? 
                    // No, usually it grows.

                    const updated = [...prev];
                    // If the previous text was "Hello" and now we get "Hello world", we replace "Hello" with "Hello world".
                    // If we get "How are you", we might want to append?
                    // LiveKit `segments` usually contains the *unstable* part.
                    // Let's try appending only if it doesn't seem to overlap.

                    // BETTER APPROACH:
                    // Just append a new bubble if it's a distinct new sentence (final).
                    // Update the last bubble if it's interim.
                    // Since we don't have 'final' flag exposed easily here without looking at segment properties:
                    const isFinal = segments.some(s => s.final);

                    if (isFinal) {
                        // If it's final, we update the last one and seal it (effectively).
                        updated[prev.length - 1] = { ...last, text: newText, timestamp: new Date() };
                    } else {
                        // If it's interim, we also update the last one.
                        // The issue the user saw was "Hi Nithin Hi Nithin". This happens if we append `newText` to `last.text`.
                        // We should REPLACE `last.text` with `newText` if it's the same segment.
                        updated[prev.length - 1] = { ...last, text: newText, timestamp: new Date() };
                    }
                    return updated;
                }

                // New bubble
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
                    background: 'white',
                    borderRadius: '2rem',
                    boxShadow: 'var(--box-shadow-lg)',
                    border: '1px solid var(--border-color)',
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
                        background: 'linear-gradient(to bottom, rgba(249, 250, 251, 0.5), white)',
                        padding: '2rem',
                        position: 'relative'
                    }}>
                        {/* Ambient Glow */}
                        <div style={{
                            position: 'absolute',
                            width: '300px',
                            height: '300px',
                            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
                            borderRadius: '50%',
                            filter: 'blur(60px)',
                            opacity: isSpeaking ? 1 : 0.5,
                            transition: 'opacity 1s ease',
                            animation: isSpeaking ? 'pulse 3s infinite' : 'none'
                        }} />

                        <div style={{
                            position: 'relative',
                            zIndex: 10,
                            width: '100%',
                            maxWidth: '500px',
                            height: '180px',
                            background: 'white',
                            borderRadius: '1.5rem',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--box-shadow-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                        }}>
                            {status === 'active' ? (
                                <div style={{ width: '100%', height: '100px', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <BarVisualizer
                                        state="speaking"
                                        barCount={30}
                                        trackRef={undefined}
                                        style={{ height: '100%', width: '100%' }}
                                        options={{}}
                                    />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', opacity: 0.7 }}>
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        background: 'var(--light-bg)',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Volume2Icon style={{ width: '24px', height: '24px', color: 'var(--primary-color)' }} />
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Connecting to secure line...</p>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '2rem', textAlign: 'center', position: 'relative', zIndex: 10 }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                                {status === 'active' ? 'AI Recruiter is Listening' : 'Establishing Connection...'}
                            </h3>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                {status === 'active' ? 'Speak naturally. I am analyzing your responses.' : 'Please wait while we prepare your interview session.'}
                            </p>
                        </div>
                    </div>

                    {/* Controls Bar */}
                    <div style={{
                        height: '90px',
                        background: 'white',
                        borderTop: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2rem'
                    }}>
                        <button
                            onClick={() => setIsMicOn(!isMicOn)}
                            style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                background: isMicOn ? 'var(--light-bg)' : '#fee2e2',
                                color: isMicOn ? 'var(--text-secondary)' : '#dc2626',
                                border: isMicOn ? '1px solid var(--border-color)' : '1px solid #fecaca',
                                cursor: 'pointer'
                            }}
                            title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
                        >
                            {isMicOn ? <MicOnIcon style={{ width: '24px', height: '24px' }} /> : <MicOffIcon style={{ width: '24px', height: '24px' }} />}
                        </button>

                        <button
                            onClick={stopSession}
                            style={{
                                padding: '0 2rem',
                                height: '52px',
                                background: '#dc2626',
                                color: 'white',
                                borderRadius: '30px',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)',
                                transition: 'transform 0.1s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
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
                    background: 'white',
                    borderRadius: '2rem',
                    boxShadow: 'var(--box-shadow-lg)',
                    border: '1px solid var(--border-color)',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '1.25rem',
                        borderBottom: '1px solid var(--border-color)',
                        background: 'rgba(249, 250, 251, 0.8)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>Live Transcript</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: '#22c55e',
                                animation: 'pulse 2s infinite'
                            }}></span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Real-time</span>
                        </div>
                    </div>

                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        background: 'var(--light-bg)'
                    }}>
                        {transcripts.length === 0 ? (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: 0.6 }}>
                                <div style={{ width: '64px', height: '64px', marginBottom: '1rem', background: 'var(--text-secondary)', borderRadius: '1rem', opacity: 0.1, transform: 'rotate(12deg)' }}></div>
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
                                        padding: '0.85rem 1.15rem',
                                        borderRadius: '1.25rem',
                                        fontSize: '0.9rem',
                                        lineHeight: '1.5',
                                        boxShadow: 'var(--box-shadow-sm)',
                                        background: t.sender === 'user' ? 'var(--primary-color)' : 'white',
                                        color: t.sender === 'user' ? 'white' : 'var(--text-primary)',
                                        border: t.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                                        borderTopRightRadius: t.sender === 'user' ? '4px' : '1.25rem',
                                        borderTopLeftRadius: t.sender === 'user' ? '1.25rem' : '4px'
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
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            setLiveKitUrl(`${protocol}//${window.location.host}/livekit`);

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
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid var(--primary-color)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Analyzing Interview...</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Please wait while our AI generates your assessment report.</p>
            </div>
        );
    }

    if (report) {
        return (
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem', animation: 'fadeIn 0.5s ease-out' }}>
                <div style={{
                    background: 'white',
                    borderRadius: '2rem',
                    boxShadow: 'var(--box-shadow-xl)',
                    padding: '3rem',
                    textAlign: 'center',
                    border: '1px solid var(--border-color)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '8px', background: 'linear-gradient(90deg, #3b82f6, #6366f1, #a855f7)' }}></div>

                    <div style={{
                        width: '96px',
                        height: '96px',
                        background: '#f0fdf4',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 2rem',
                        boxShadow: '0 0 0 8px rgba(240, 253, 244, 0.5)'
                    }}>
                        <CheckCircleIcon style={{ width: '48px', height: '48px', color: '#16a34a' }} />
                    </div>

                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '-0.025em' }}>Screening Completed</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
                        Great job! Our AI has analyzed your responses and generated a preliminary assessment.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginBottom: '3rem', textAlign: 'left' }}>
                        <div style={{ background: 'linear-gradient(135deg, #eff6ff, white)', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #dbeafe', boxShadow: 'var(--box-shadow-sm)' }}>
                            <div style={{ color: '#2563eb', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>Overall Score</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                                <span style={{ fontSize: '3.75rem', fontWeight: 900, color: '#1e3a8a', letterSpacing: '-0.05em' }}>{report.score}</span>
                                <span style={{ fontSize: '1.5rem', color: '#60a5fa', fontWeight: 500 }}>/100</span>
                            </div>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, #f0fdf4, white)', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #dcfce7', boxShadow: 'var(--box-shadow-sm)' }}>
                            <div style={{ color: '#16a34a', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>Key Strengths</div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {report.strengths && report.strengths.map((s: string, i: number) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: '#14532d', fontWeight: 500 }}>
                                        <div style={{ marginTop: '0.375rem', width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                                        {s}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, #fffbeb, white)', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #fef3c7', boxShadow: 'var(--box-shadow-sm)' }}>
                            <div style={{ color: '#d97706', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>Areas for Improvement</div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {report.weaknesses && report.weaknesses.map((w: string, i: number) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: '#78350f', fontWeight: 500 }}>
                                        <div style={{ marginTop: '0.375rem', width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                                        {w}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {report.skills_analysis && Array.isArray(report.skills_analysis) && (
                        <div style={{ marginBottom: '3rem', textAlign: 'left' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Skill Breakdown</h3>
                            <div style={{ overflowX: 'auto', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: 'var(--box-shadow-sm)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--light-bg)', borderBottom: '1px solid var(--border-color)' }}>
                                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Skill</th>
                                            <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Score</th>
                                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Assessment</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.skills_analysis.map((item: any, i: number) => (
                                            <tr key={i} style={{ borderBottom: i === report.skills_analysis.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.skill}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '9999px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 700,
                                                        background: item.score >= 70 ? '#dcfce7' : item.score >= 40 ? '#fef3c7' : '#fee2e2',
                                                        color: item.score >= 70 ? '#166534' : item.score >= 40 ? '#92400e' : '#991b1b'
                                                    }}>
                                                        {item.score}%
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.reason}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
                        <button onClick={() => onNavigate('dashboard')} style={{ padding: '1rem 2.5rem', background: 'white', color: 'var(--text-primary)', borderRadius: '1rem', fontWeight: 700, border: '1px solid var(--border-color)', cursor: 'pointer', boxShadow: 'var(--box-shadow-sm)' }}>
                            Back to Dashboard
                        </button>
                        <button onClick={() => onNavigate('find-jobs')} style={{ padding: '1rem 2.5rem', background: 'var(--primary-color)', color: 'white', borderRadius: '1rem', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: 'var(--box-shadow-md)' }}>
                            Apply for Jobs
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', margin: 0 }}>AI Screening</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Live voice assessment with our AI recruiter</p>
                </div>
                <div style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: status === 'active' ? '#fef2f2' : status === 'connecting' ? '#fffbeb' : '#f3f4f6',
                    color: status === 'active' ? '#dc2626' : status === 'connecting' ? '#d97706' : '#4b5563',
                    border: status === 'active' ? '1px solid #fecaca' : status === 'connecting' ? '1px solid #fde68a' : '1px solid #e5e7eb',
                    boxShadow: status === 'active' ? '0 0 0 4px rgba(254, 242, 242, 0.5)' : 'none'
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: status === 'active' ? '#ef4444' : status === 'connecting' ? '#f59e0b' : '#9ca3af',
                        animation: status === 'active' ? 'pulse 1.5s infinite' : status === 'connecting' ? 'bounce 1s infinite' : 'none'
                    }} />
                    {status === 'active' ? 'LIVE RECORDING' : status === 'connecting' ? 'CONNECTING...' : 'READY'}
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
                        background: 'white',
                        borderRadius: '2rem',
                        boxShadow: 'var(--box-shadow-xl)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '3rem',
                        textAlign: 'center',
                        backgroundImage: 'linear-gradient(to bottom, white, rgba(249, 250, 251, 0.5))'
                    }}>
                        <div style={{
                            width: '128px',
                            height: '128px',
                            background: '#eff6ff',
                            borderRadius: '2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '2rem',
                            boxShadow: '0 0 0 8px rgba(239, 246, 255, 0.5)',
                            transform: 'rotate(3deg)',
                            transition: 'transform 0.5s'
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'rotate(0)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'rotate(3deg)'}
                        >
                            <MicOnIcon style={{ width: '56px', height: '56px', color: '#2563eb' }} />
                        </div>
                        <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '-0.025em' }}>Ready for your screening?</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.125rem', maxWidth: '450px', lineHeight: '1.6' }}>
                            Ensure you're in a quiet environment with a stable internet connection. The AI will verify the skills from your resume.
                        </p>

                        {error && (
                            <div style={{
                                marginBottom: '2rem',
                                padding: '1rem 1.5rem',
                                background: '#fef2f2',
                                color: '#b91c1c',
                                borderRadius: '1rem',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                border: '1px solid #fecaca',
                                maxWidth: '450px',
                                textAlign: 'left'
                            }}>
                                <AlertCircleIcon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                                {error}
                            </div>
                        )}

                        <button
                            onClick={startLiveSession}
                            disabled={!isReady}
                            style={{
                                padding: '1.25rem 3rem',
                                background: 'var(--primary-color)',
                                color: 'white',
                                borderRadius: '1rem',
                                fontWeight: 700,
                                fontSize: '1.25rem',
                                border: 'none',
                                cursor: isReady ? 'pointer' : 'not-allowed',
                                boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.15), 0 8px 10px -6px rgba(59, 130, 246, 0.1)',
                                transition: 'all 0.2s',
                                opacity: isReady ? 1 : 0.5,
                                transform: isReady ? 'translateY(0)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                            }}
                            onMouseEnter={(e) => isReady && (e.currentTarget.style.transform = 'translateY(-2px)')}
                            onMouseLeave={(e) => isReady && (e.currentTarget.style.transform = 'translateY(0)')}
                        >
                            Start Screening
                            <PlayCircleIcon style={{ width: '24px', height: '24px', opacity: 0.8 }} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
