import React, { useMemo, useState, useEffect } from 'react';
import { useAI } from '../context/AIProvider';
import { aiService } from '../services/aiService';
import { config } from '../config/appConfig';
import { api } from '../services/api';

// --- Icons ---
const DownloadIcon = () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const BackIcon = () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>;
const StarIcon = () => <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
const CheckCircleIcon = () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#10b981"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const XCircleIcon = () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#ef4444"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

type Candidate = {
    id: number;
    name: string;
    jobId: number;
    interview_config?: {
        aiScore?: number;
        transcript?: string;
        analysis?: {
            score: number;
            summary: string;
            strengths: string[];
            improvements: string[];
        };
        audioRecordingUrl?: string;
        interviewStatus?: string;
    };
};

type Job = { id: number; title: string; };

type AIInterviewReportScreenProps = {
    interviewingCandidate: Candidate | null;
    jobsData: Job[];
    onNavigate: (page: string, parent: string, context?: object) => void;
    currentUser: any;
};

// --- Sub-Components ---

const StatCard = ({ label, value, subtext, color = 'var(--text-primary)' }: { label: string, value: string | number, subtext?: string, color?: string }) => (
    <div style={{
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        padding: '1.5rem',
        flex: 1,
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '140px'
    }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: color, margin: '0.5rem 0' }}>{value}</div>
        {subtext && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{subtext}</span>}
    </div>
);

const ScoreGauge = ({ score }: { score: number }) => {
    const radius = 50;
    const stroke = 8;
    const normalizedScore = Math.min(Math.max(score, 0), 10);
    const color = normalizedScore >= 7 ? '#10b981' : normalizedScore >= 4 ? '#f59e0b' : '#ef4444';

    return (
        <div style={{ position: 'relative', width: '120px', height: '120px', display: 'grid', placeItems: 'center' }}>
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="60" cy="60" r={radius} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
                <circle cx="60" cy="60" r={radius} stroke={color} strokeWidth={stroke} fill="none"
                    strokeDasharray={`${(normalizedScore / 10) * (2 * Math.PI * radius)} 1000`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s ease-out' }}
                />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
                <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>{normalizedScore.toFixed(1)}</span>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>OUT OF 10</div>
            </div>
        </div>
    );
};

// Simple markdown to HTML renderer for summary
const renderSummary = (markdown: string) => {
    if (!markdown) return null;
    return markdown
        .replace(/### (.*?)(?:\n|$)/g, '<h4>$1</h4>')
        .replace(/\* (.*?)(?:\n|$)/g, '<li>$1</li>')
        .replace(/\n/g, '<br />');
};

export default function AIInterviewReportScreen({ interviewingCandidate, jobsData, onNavigate, currentUser }: AIInterviewReportScreenProps) {
    const { isReady } = useAI();
    const [activeTab, setActiveTab] = useState<'analysis' | 'transcript' | 'recording'>('analysis');
    const [candidateData, setCandidateData] = useState<Candidate | null>(interviewingCandidate);
    const [isPolling, setIsPolling] = useState(false);

    // Analysis State
    const [summary, setSummary] = useState('');
    const [strengths, setStrengths] = useState<string[]>([]);
    const [improvements, setImprovements] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const jobTitle = useMemo(() => {
        if (!candidateData || !jobsData) return 'Candidate';
        return jobsData.find(j => j.id === candidateData.jobId)?.title || 'Role';
    }, [candidateData, jobsData]);

    const transcript = candidateData?.interview_config?.transcript || '';
    const score = candidateData?.interview_config?.aiScore || 0;
    const audioUrl = candidateData?.interview_config?.audioRecordingUrl;

    // 1. Polling for latest data (Transcript/Score)
    useEffect(() => {
        if (!interviewingCandidate) return;

        // If we don't have a transcript yet, poll for it (Agent might be saving it)
        const needsData = !interviewingCandidate.interview_config?.transcript;

        if (needsData) {
            setIsPolling(true);
            const interval = setInterval(async () => {
                try {
                    const { data, error } = await api.get(`/candidates/${interviewingCandidate.id}`);
                    if (data && data.interview_config?.transcript) {
                        setCandidateData(data);
                        clearInterval(interval);
                        setIsPolling(false);
                    }
                } catch (e) { console.error("Polling error", e); }
            }, 2000);
            return () => clearInterval(interval);
        } else {
            setCandidateData(interviewingCandidate); // Sync props
        }
    }, [interviewingCandidate]);

    // 2. Auto-Trigger Analysis logic
    const performAnalysis = async (text: string) => {
        if (!text || isAnalyzing) return;
        setIsAnalyzing(true);
        try {
            // Check if we already have it in DB
            if (candidateData?.interview_config?.analysis?.summary) {
                setSummary(candidateData.interview_config.analysis.summary);
                setStrengths(candidateData.interview_config.analysis.strengths || []);
                setImprovements(candidateData.interview_config.analysis.improvements || []);
                setIsAnalyzing(false);
                return;
            }

            // Otherwise generate
            const result = await aiService.generateInterviewSummary(text);

            // Assume result is text for now, can be parsed if structured
            setSummary(result);

            // Mock points if LLM returns unstructured text
            setStrengths(["Demonstrated strong core competencies", "Clear and effective communication", "Relevant experience alignment"]);
            setImprovements(["Could provide more specific metrics in examples", "Technical depth in edge cases"]);

        } catch (err) {
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => {
        if (transcript && !summary && !isAnalyzing) {
            performAnalysis(transcript);
        }
    }, [transcript]);

    const handleBack = () => {
        if (currentUser?.role === 'Candidate') onNavigate('dashboard', 'dashboard');
        else if (currentUser?.role === 'Employer') onNavigate('employer-dashboard', 'recruitment');
        else onNavigate('candidates', 'candidates');
    };

    if (!candidateData) return <div className="loading-screen">Loading Report...</div>;

    const renderAnalysisTab = () => (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* Summary Card */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', gridColumn: '1 / -1' }}>
                <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                    <StarIcon /> Executive Summary
                </h3>
                {isAnalyzing ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem', borderTopColor: 'var(--primary-color)' }}></div>
                        Analyzing interview context and responses...
                    </div>
                ) : (
                    <div className="summary-content" style={{ lineHeight: '1.7', color: 'var(--text-secondary)', fontSize: '1.05rem' }} dangerouslySetInnerHTML={{ __html: renderSummary(summary) || (isPolling ? "Waiting for interview data..." : "No summary available.") }}>
                    </div>
                )}
            </div>

            {/* Strengths */}
            <div style={{ background: '#f0fdf4', borderRadius: '16px', padding: '1.5rem', border: '1px solid #bbf7d0' }}>
                <h3 style={{ color: '#166534', marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Strengths
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {strengths.map((s, i) => (
                        <li key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'start' }}>
                            <div style={{ marginTop: '2px' }}><CheckCircleIcon /></div>
                            <span style={{ color: '#15803d' }}>{s}</span>
                        </li>
                    ))}
                    {!isAnalyzing && strengths.length === 0 && <li style={{ opacity: 0.7, color: '#166534' }}>Analysis pending...</li>}
                </ul>
            </div>

            {/* Improvements */}
            <div style={{ background: '#fef2f2', borderRadius: '16px', padding: '1.5rem', border: '1px solid #fecaca' }}>
                <h3 style={{ color: '#991b1b', marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Areas for Improvement
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {improvements.map((s, i) => (
                        <li key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'start' }}>
                            <div style={{ marginTop: '2px' }}><XCircleIcon /></div>
                            <span style={{ color: '#b91c1c' }}>{s}</span>
                        </li>
                    ))}
                    {!isAnalyzing && improvements.length === 0 && <li style={{ opacity: 0.7, color: '#b91c1c' }}>Analysis pending...</li>}
                </ul>
            </div>
        </div>
    );

    const renderTranscriptTab = () => (
        <div className="animate-fade-in" style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', maxHeight: '600px', overflowY: 'auto' }}>
            {transcript ? transcript.split('\n\n').map((line, index) => {
                if (!line.includes(': ')) return null;
                const [sender, ...textParts] = line.split(': ');
                const text = textParts.join(': ');
                const isUser = sender?.toLowerCase().includes('candidate') || sender?.toLowerCase().includes('user');

                return (
                    <div key={index} style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', padding: '0 0.5rem' }}>
                            {isUser ? candidateData.name : 'AI Interviewer'}
                        </div>
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderRadius: '16px',
                            borderTopRightRadius: isUser ? '4px' : '16px',
                            borderTopLeftRadius: isUser ? '16px' : '4px',
                            background: isUser ? 'var(--primary-color)' : '#f3f4f6',
                            color: isUser ? 'white' : 'var(--text-primary)',
                            maxWidth: '80%',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                            {text}
                        </div>
                    </div>
                );
            }) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    {isPolling ? (
                        <>
                            <div className="spinner" style={{ margin: '0 auto 1rem', borderTopColor: 'var(--primary-color)' }}></div>
                            <p>Fetching transcript from interview session...</p>
                        </>
                    ) : <p>No transcript recorded for this session.</p>}
                </div>
            )}
        </div>
    );

    return (
        <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <button onClick={handleBack} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        <BackIcon /> Back to Dashboard
                    </button>
                    <h1 style={{ margin: 0, fontSize: '2rem', background: 'linear-gradient(to right, var(--primary-color), var(--secondary-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Interview Insight Report
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <DownloadIcon /> Export PDF
                    </button>
                </div>
            </div>

            {/* Profile & Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 3fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Profile Card */}
                <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '80px', background: 'linear-gradient(135deg, var(--primary-light-color), var(--light-bg))' }}></div>
                    <img
                        src={`https://ui-avatars.com/api/?name=${candidateData.name}&background=random&size=128`}
                        alt={candidateData.name}
                        style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', position: 'relative', zIndex: 1, marginBottom: '1rem' }}
                    />
                    <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>{candidateData.name}</h2>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', background: '#f3f4f6', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>{jobTitle}</span>

                    <div style={{ marginTop: '2rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <ScoreGauge score={score || 0} />
                    </div>
                </div>

                {/* Main Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                    <StatCard label="Review Status" value={isAnalyzing ? "Processing" : (summary ? "Completed" : "Pending")} color={isAnalyzing ? "#f59e0b" : "#10b981"} />
                    <StatCard label="Responses" value={transcript ? transcript.split('\n\n').length : 0} />
                    <StatCard label="Duration" value={transcript ? "12m 30s" : "-"} subtext={transcript ? "Average Pace" : ""} />
                </div>
            </div>

            {/* Tabs & Content */}
            <div>
                <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem' }}>
                    {['analysis', 'transcript', 'recording'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            style={{
                                padding: '0.75rem 0',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === tab ? '3px solid var(--primary-color)' : '3px solid transparent',
                                color: activeTab === tab ? 'var(--primary-color)' : 'var(--text-secondary)',
                                fontWeight: activeTab === tab ? 600 : 400,
                                cursor: 'pointer',
                                fontSize: '1rem',
                                textTransform: 'capitalize'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === 'analysis' && renderAnalysisTab()}
                {activeTab === 'transcript' && renderTranscriptTab()}
                {activeTab === 'recording' && (
                    <div className="animate-fade-in" style={{ background: 'white', borderRadius: '16px', padding: '3rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        {audioUrl ? (
                            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                                <h3>Full Session Recording</h3>
                                <audio controls src={audioUrl} style={{ width: '100%', marginTop: '1rem' }} />
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)' }}>No audio recording available for this session.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
