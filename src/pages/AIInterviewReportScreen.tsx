import React, { useMemo, useState, useEffect } from 'react';
import { useAI } from '../context/AIProvider';
import { aiService } from '../services/aiService';

// Type definitions to match what's passed from App.tsx
type Candidate = {
    id: number;
    name: string;
    jobId: number;
    interview_config?: {
        aiScore?: number;
        transcript?: string;
    };
};

type Job = {
    id: number;
    title: string;
};

type AIInterviewReportScreenProps = {
    interviewingCandidate: Candidate | null;
    jobsData: Job[];
    onNavigate: (page: string, parent: string, context?: object) => void;
    currentUser: any;
};

// Component to render the score visually
const ScoreDisplay = ({ score }: { score?: number | null }) => {
    const percentage = score ? (score / 10) * 100 : 0;
    const color = `hsl(${percentage}, 70%, 45%)`; // Red to green gradient
    
    return (
        <div className="score-display" style={{ textAlign: 'center' }}>
            <div className="score-circle-track" style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto', borderRadius: '50%', background: 'var(--light-bg)', display: 'grid', placeItems: 'center' }}>
                <div className="score-circle-fill" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '50%', background: `conic-gradient(${color} ${percentage}%, transparent 0)` }}>
                    <div className="score-circle-inner" style={{ position: 'absolute', top: '10px', left: '10px', width: '100px', height: '100px', background: 'var(--background-color)', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{score ? score.toFixed(1) : 'N/A'}</span>
                        <small>/ 10</small>
                    </div>
                </div>
            </div>
            <h3 style={{ marginTop: '1rem', marginBottom: '0' }}>Overall Score</h3>
        </div>
    );
};


export default function AIInterviewReportScreen({ interviewingCandidate, jobsData, onNavigate, currentUser }: AIInterviewReportScreenProps) {
    const { isReady, reportInvalidApiKey } = useAI();
    const [summary, setSummary] = useState('');
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [summaryError, setSummaryError] = useState('');

    const jobTitle = useMemo(() => {
        if (!interviewingCandidate || !jobsData) return 'the role';
        return jobsData.find(j => j.id === interviewingCandidate.jobId)?.title || 'the role';
    }, [interviewingCandidate, jobsData]);

    const interviewData = interviewingCandidate?.interview_config;
    const transcript = interviewData?.transcript || '';
    const score = interviewData?.aiScore;

    const handleGenerateSummary = async () => {
        if (!transcript || !isReady) return;
        setIsLoadingSummary(true);
        setSummaryError('');
        try {
            const result = await aiService.generateInterviewSummary(transcript);
            setSummary(result);
        } catch (err) {
            console.error(err);
            setSummaryError('Failed to generate summary. Please try again.');
            if (err.message?.toLowerCase().includes('api key')) {
                reportInvalidApiKey();
            }
        } finally {
            setIsLoadingSummary(false);
        }
    };
    
    // Auto-generate summary on load if not already generated
    useEffect(() => {
        if (transcript && isReady && !summary) {
            handleGenerateSummary();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transcript, isReady]);

    const handleBack = () => {
        if (currentUser?.role === 'Candidate') {
            onNavigate('dashboard', 'dashboard');
        } else if (currentUser?.role === 'Employer') {
            onNavigate('recruitment-pipeline', 'recruitment');
        } else {
            // Default for Agent/Recruiter
            onNavigate('candidates', 'candidates');
        }
    };

    if (!interviewingCandidate) {
        return (
            <div className="page-content">
                <h2>Report Not Found</h2>
                <p>The interview report could not be loaded. Please go back and try again.</p>
                <button className="btn btn-secondary" onClick={handleBack}>Back</button>
            </div>
        );
    }
    
    // Simple markdown to HTML renderer for summary
    const renderSummary = (markdown) => {
        if (!markdown) return null;
        // A simple parser to format the summary: ### becomes h4, * becomes li, newlines become br.
        return markdown
            .replace(/### (.*?)(?:\n|$)/g, '<h4>$1</h4>')
            .replace(/\* (.*?)(?:\n|$)/g, '<li>$1</li>')
            .replace(/\n/g, '<br />');
    };

    return (
        <>
            <header className="page-header">
                <h1>AI Interview Report</h1>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={handleBack}>Back to Pipeline</button>
                </div>
            </header>
            <div className="report-container" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
                <div className="report-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="dashboard-widget">
                        <h3>Candidate</h3>
                        <div className="candidate-info-card" style={{ textAlign: 'center' }}>
                             <img src={`https://i.pravatar.cc/80?u=${interviewingCandidate.name}`} alt={interviewingCandidate.name} style={{ borderRadius: '50%', marginBottom: '1rem' }} />
                             <h4>{interviewingCandidate.name}</h4>
                             <p style={{ color: 'var(--text-secondary)' }}>Applied for {jobTitle}</p>
                        </div>
                    </div>
                     <div className="dashboard-widget">
                        <ScoreDisplay score={score} />
                     </div>
                     <div className="dashboard-widget">
                        <h3>AI Analysis</h3>
                        {summaryError && <p className="error-message" style={{ color: 'var(--error-color)' }}>{summaryError}</p>}
                        {isLoadingSummary && !summary ? (
                            <div className="loading-state small" style={{ textAlign: 'center' }}><div className="spinner"></div><p>Generating summary...</p></div>
                        ) : summary ? (
                            <div className="summary-content" dangerouslySetInnerHTML={{ __html: renderSummary(summary) }}></div>
                        ) : (
                             <button className="btn btn-primary btn-full" onClick={handleGenerateSummary} disabled={isLoadingSummary || !transcript}>
                                {isLoadingSummary ? 'Generating...' : 'Generate with AI'}
                            </button>
                        )}
                     </div>
                </div>
                <div className="report-main-content">
                    <div className="dashboard-widget" style={{ height: 'calc(100vh - 200px)'}}>
                        <h3>Interview Transcript</h3>
                        <div className="transcript-container" style={{ overflowY: 'auto', height: 'calc(100% - 40px)', paddingRight: '1rem' }}>
                            {transcript ? transcript.split('\n\n').map((line, index) => {
                                if (!line.includes(': ')) return <p key={index}>{line}</p>;
                                const [sender, ...textParts] = line.split(': ');
                                const text = textParts.join(': ');
                                const senderClass = sender?.toLowerCase() === 'user' ? 'user' : 'ai';
                                return (
                                    <div key={index} className={`transcript-message ${senderClass}`} style={{ marginBottom: '1.5rem' }}>
                                        <div className="message-sender" style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{senderClass === 'user' ? interviewingCandidate.name : 'AI Interviewer'}</div>
                                        <div className={`message-bubble ${senderClass}`} style={{ padding: '0.75rem 1rem', borderRadius: '12px', background: senderClass === 'user' ? 'var(--primary-light-color)' : 'var(--light-bg)' }}>{text}</div>
                                    </div>
                                );
                            }) : (
                                <p>No transcript available for this interview.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
