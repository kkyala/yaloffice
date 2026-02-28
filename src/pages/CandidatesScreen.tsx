
import React, { useState, useMemo } from 'react';
import { api } from '../services/api';
import AddCandidateScreen from './AddCandidateScreen';
import { config } from '../config/appConfig';

// Type definitions for clarity
type CandidateApplication = {
    id: number;
    jobId: number; // Renamed from job_id for consistency in JS
    name: string;
    role: string;
    status: string;
    interview_config?: {
        aiScore?: number;
        interviewType?: 'audio' | 'video' | 'livekit'; // Audio, Video (Gemini), or AI Avatar (Tavus+LiveKit)
        [key: string]: any;
    };
    linkedin_url?: string;
};
type Job = {
    id: number;
    title: string;
    employer?: string;
};
type EnrichedApplication = {
    id: number;
    candidate_id: number;
    job_id: number;
    status: string;
    // FIX: Made `interview_config` required to match the object shape created in the `map` function.
    // The property key is always present, even if its value is `undefined`.
    interview_config: any;
    candidateName: string;
    jobTitle: string;
    aiScore: number | null;
    linkedin_url?: string;
};
type CandidatesScreenProps = {
    candidatesData: CandidateApplication[];
    jobsData: Job[];
    pipelineJobFilter: string | number;
    currentUser: any;
    onUpdateApplicationStatus: (id: number, status: string) => void;
    onScheduleInterview: (id: number, config: object) => Promise<{ success: boolean }>;
    onSaveCandidate: (candidate: Partial<CandidateApplication>) => void;
    onPipelineJobFilterChange: (filterValue: string) => void;
    onNavigate?: (page: string, parent: string, context?: object) => void;
};

// The main pipeline stages
const PIPELINE_STAGES = ['Applied', 'Sourced', 'Screening', 'Interviewing', 'Offer', 'Hired'];

// Setup Interview Modal Component (Embedded for simplicity)
const SetupInterviewModal = ({ candidateName, application, onSave, onCancel }) => {
    const [questionCount, setQuestionCount] = useState(application?.interview_config?.questionCount || 5);
    const [difficulty, setDifficulty] = useState(application?.interview_config?.difficulty || 'Medium');
    const [duration, setDuration] = useState(application?.interview_config?.duration || 15);
    // User requested to force LiveKit/Audio Agent mode
    const interviewType = 'livekit';
    const isScreening = application?.status === 'Screening';
    const title = isScreening ? `Setup AI Screening for ${candidateName}` : `Setup AI Interview for ${candidateName}`;

    const handleSave = () => {
        onSave({
            questionCount,
            difficulty,
            duration,
            interviewType,
            interviewStatus: 'assessment_pending',
        });
    };

    return (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="modal-content" style={{
                maxWidth: '500px',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--color-border)'
            }}>
                <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border)', padding: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', color: 'var(--color-text-main)' }}>{title}</h2>
                </div>
                <div className="modal-body" style={{ padding: '1.5rem' }}>
                    <div className="form-group">
                        <label className="form-label">Number of Questions</label>
                        <input
                            type="number"
                            value={questionCount}
                            onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                            style={{ background: 'var(--slate-50)' }}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Difficulty</label>
                        <select
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                            style={{ background: 'var(--slate-50)' }}
                        >
                            <option>Easy</option>
                            <option>Medium</option>
                            <option>Hard</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Duration (minutes)</label>
                        <input
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                            style={{ background: 'var(--slate-50)' }}
                        />
                    </div>

                    {/* Fixed Interview Type Display */}
                    <div className="form-group">
                        <label className="form-label">Interview Mode</label>
                        <div style={{
                            padding: '1rem',
                            background: 'var(--primary-50)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--primary-200)',
                            color: 'var(--primary-700)',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}>
                            <div style={{
                                width: '32px', height: '32px',
                                background: 'white',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.2rem'
                            }}>🎙️</div>
                            <div>
                                <div>AI Voice Agent (LiveKit)</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: '400', opacity: 0.8 }}>Real-time voice conversation</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="modal-footer" style={{
                    padding: '1.5rem',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '1rem'
                }}>
                    <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave}>Save & Schedule</button>
                </div>
            </div>
        </div>
    );
};

// Interview Report Modal Component
const InterviewReportModal = ({ application, onClose }) => {
    const { candidateName, jobTitle, aiScore, interview_config } = application;
    const transcript = interview_config?.transcript || 'No transcript available.';
    const interviewType = interview_config?.interviewType || 'audio';

    return (
        <div className="modal-overlay" onClick={onClose} style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="modal-content" style={{ maxWidth: '700px', background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border)', padding: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem' }}>Interview Report: {candidateName}</h2>
                    <button className="modal-close-btn" onClick={onClose}>×</button>
                </div>
                <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                            <strong>Position:</strong> {jobTitle}
                        </p>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                            <strong>Interview Type:</strong> {
                                interviewType === 'livekit' ? 'AI Avatar (Tavus)' :
                                    interviewType === 'video' ? 'Video (Gemini)' : 'Audio (Gemini)'
                            }
                        </p>
                        {aiScore !== null && (
                            <div style={{
                                display: 'inline-block',
                                background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-lg)',
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                marginTop: '0.5rem',
                                boxShadow: 'var(--shadow-md)'
                            }}>
                                AI Score: {aiScore.toFixed(1)}/10
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--color-text-main)', fontSize: '1rem' }}>Interview Transcript</h3>
                        <div style={{
                            background: 'var(--slate-50)',
                            padding: '1.25rem',
                            borderRadius: 'var(--radius-lg)',
                            whiteSpace: 'pre-wrap',
                            fontSize: '0.9rem',
                            lineHeight: '1.6',
                            color: 'var(--color-text-main)',
                            border: '1px solid var(--slate-200)'
                        }}>
                            {transcript}
                        </div>
                    </div>
                </div>
                <div className="modal-footer" style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
                    <a href={`${config.apiBaseUrl}/candidates/${application.id}/report/interview`} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Download PDF</a>
                    <button className="btn btn-ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

// Screening Report Modal
const ScreeningReportModal = ({ application, onClose }) => {
    const { candidateName, interview_config } = application;
    const report = interview_config?.screeningReport || {};

    return (
        <div className="modal-overlay" onClick={onClose} style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="modal-content" style={{ maxWidth: '600px', background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border)', padding: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem' }}>Screening Report: {candidateName}</h2>
                    <button className="modal-close-btn" onClick={onClose}>×</button>
                </div>
                <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>Score:</strong>
                        <span style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--color-primary)' }}>{report.score}/100</span>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Summary:</strong>
                        <p style={{ lineHeight: '1.6', color: 'var(--color-text-muted)' }}>{report.summary}</p>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Recommendation:</strong>
                        <p style={{ fontWeight: '500', color: 'var(--color-text-main)' }}>{report.recommendation}</p>
                    </div>
                    {report.keyStrengths && (
                        <div style={{ marginBottom: '1rem' }}>
                            <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Key Strengths:</strong>
                            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
                                {report.keyStrengths.map((s, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{s}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="modal-footer" style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
                    <a href={`${config.apiBaseUrl}/candidates/${application.id}/report/screening`} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Download PDF</a>
                    <button className="btn btn-ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

// Candidate Profile Modal (with Screening Results)
const CandidateProfileModal = ({ application, screeningData, isLoading, onClose }) => {
    return (
        <div className="modal-overlay" onClick={onClose} style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="modal-content" style={{ maxWidth: '600px', background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border)', padding: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem' }}>Candidate Profile: {application.candidateName}</h2>
                    <button className="modal-close-btn" onClick={onClose}>×</button>
                </div>
                <div className="modal-body" style={{ padding: '1.5rem' }}>
                    <div style={{ marginBottom: '2rem', background: 'var(--slate-50)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                        <p style={{ marginBottom: '0.5rem' }}><strong>Job:</strong> {application.jobTitle}</p>
                        <p style={{ marginBottom: '0.5rem' }}><strong>Status:</strong> {application.status}</p>
                        {application.linkedin_url && (
                            <p><strong>LinkedIn:</strong> <a href={application.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>{application.linkedin_url}</a></p>
                        )}
                    </div>

                    <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem', fontSize: '1rem' }}>Initial Screening Results</h3>

                    {isLoading ? (
                        <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Loading screening data...</p>
                    ) : screeningData && screeningData.completed ? (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{
                                    width: '64px', height: '64px', borderRadius: '50%',
                                    background: screeningData.score >= 70 ? 'var(--status-success)' : 'var(--status-warning)',
                                    color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 'bold', fontSize: '1.5rem',
                                    boxShadow: 'var(--shadow-md)'
                                }}>
                                    {screeningData.score}
                                </div>
                                <div>
                                    <strong style={{ fontSize: '1.1rem' }}>Screening Score</strong>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Completed on {new Date(screeningData.date).toLocaleDateString()}</p>
                                </div>
                            </div>


                            {screeningData.summary && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Summary</strong>
                                    <p style={{ color: 'var(--color-text-main)', lineHeight: '1.6' }}>
                                        {screeningData.summary}
                                    </p>
                                </div>
                            )}

                            {screeningData.strengths && screeningData.strengths.length > 0 && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Key Strengths</strong>
                                    <ul style={{ paddingLeft: '1.5rem', color: 'var(--color-text-muted)' }}>
                                        {screeningData.strengths.map((str: string, i: number) => (
                                            <li key={i} style={{ marginBottom: '0.25rem' }}>{str}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {screeningData.weaknesses && screeningData.weaknesses.length > 0 && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Areas for Improvement</strong>
                                    <ul style={{ paddingLeft: '1.5rem', color: 'var(--color-text-muted)' }}>
                                        {screeningData.weaknesses.map((weak: string, i: number) => (
                                            <li key={i} style={{ marginBottom: '0.25rem' }}>{weak}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--color-text-muted)' }}>No screening data available for this candidate.</p>
                    )}
                </div>
                <div className="modal-footer" style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div >
    );
};

// ApplicationCard Component
type ApplicationCardProps = {
    application: EnrichedApplication;
    onDragStart: (e: React.DragEvent, applicationId: number) => void;
    onScheduleInterview: (app: EnrichedApplication) => void;
    onViewResults: (app: EnrichedApplication) => void;
    onStartInterview: (app: EnrichedApplication) => void;
    onViewScreeningReport: (app: EnrichedApplication) => void;
    onViewProfile: (app: EnrichedApplication) => void; // New prop
    onUpdateStatus: (id: number, status: string) => void;
};
const ApplicationCard: React.FC<ApplicationCardProps> = ({ application, onDragStart, onScheduleInterview, onViewResults, onStartInterview, onViewScreeningReport, onViewProfile, onUpdateStatus }) => {
    const { id, candidateName, jobTitle, aiScore, status } = application;
    const interviewStatus = application.interview_config?.interviewStatus;
    const interviewType = application.interview_config?.interviewType || 'audio';
    const screeningStatus = application.interview_config?.screeningStatus;

    const renderActionButton = () => {
        if (status === 'Sourced') {
            return (
                <button className="btn btn-secondary btn-sm" onClick={() => onViewProfile(application)} style={{ width: '100%' }}>View Profile</button>
            );
        }
        if (status === 'Screening') {
            if (screeningStatus === 'completed') {
                return (
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onViewScreeningReport(application)}>Report</button>
                        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => onScheduleInterview(application)}>Schedule</button>
                    </div>
                );
            } else {
                return (
                    <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={() => onScheduleInterview(application)}>Setup Screening</button>
                );
            }
        }
        if (status === 'Interviewing' && !interviewStatus) {
            return (
                <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => onScheduleInterview(application)}>Setup Interview</button>
            );
        }
        if (interviewStatus === 'assessment_pending' || interviewStatus === 'pending') {
            return (
                <div style={{
                    padding: '0.5rem',
                    background: 'var(--slate-50)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--slate-500)',
                    fontSize: '0.8rem',
                    textAlign: 'center',
                    width: '100%',
                    border: '1px dashed var(--slate-300)'
                }}>
                    Assessment Pending
                </div>
            );
        }
        if (interviewStatus === 'assessment_completed' || interviewStatus === 'started') {
            return (
                <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={() => onStartInterview(application)}>
                    {interviewStatus === 'started' ? 'Continue Interview' : 'Start Interview'}
                </button>
            );
        }
        if (interviewStatus === 'finished') {
            return (
                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', width: '100%' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => onViewResults(application)}>View Report</button>
                    {status === 'Interviewing' && (
                        <button className="btn btn-primary btn-sm" onClick={() => onUpdateStatus(id, 'Offer')}>Move to Offer</button>
                    )}
                </div>
            );
        }
        if (status === 'Offer') {
            return (
                <button className="btn btn-primary btn-sm" style={{ backgroundColor: 'var(--accent-teal)', borderColor: 'var(--accent-teal)', width: '100%' }} onClick={() => onUpdateStatus(id, 'Hired')}>Mark as Hired</button>
            );
        }
        return null; // For 'Applied' or other stages with no specific action
    };


    return (
        <div
            className="candidate-card"
            draggable={true}
            onDragStart={(e) => onDragStart(e, id)}
            style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--color-border)',
                marginBottom: '1rem'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-main)' }}>{candidateName}</h4>
                {aiScore !== null && (
                    <div style={{
                        background: aiScore >= 7 ? 'var(--status-success)' : 'var(--status-warning)',
                        color: 'white',
                        padding: '0.1rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                    }}>
                        {aiScore.toFixed(1)}
                    </div>
                )}
            </div>

            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{jobTitle}</p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span style={{
                    fontSize: '0.7rem',
                    background: 'var(--slate-50)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--slate-600)',
                    border: '1px solid var(--slate-200)'
                }}>
                    {interviewType === 'livekit' ? '🎙️ Voice AI' : interviewType === 'video' ? '📹 Video' : '🔊 Audio'}
                </span>
                {application.linkedin_url && (
                    <span style={{
                        fontSize: '0.7rem',
                        background: '#eff6ff',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        color: '#2563eb',
                        border: '1px solid #dbeafe'
                    }}>
                        LinkedIn
                    </span>
                )}
            </div>

            <div className="candidate-card-footer" style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                {renderActionButton()}
            </div>
        </div>
    );
};

// Pipeline Column Component
type PipelineColumnProps = {
    title: string;
    applications: EnrichedApplication[];
    isReadOnly?: boolean; // New prop
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, newStatus: string) => void;
    onDragStart: (e: React.DragEvent, applicationId: number) => void;
    onScheduleInterview: (app: EnrichedApplication) => void;
    onViewResults: (app: EnrichedApplication) => void;
    onStartInterview: (app: EnrichedApplication) => void;
    onViewScreeningReport: (app: EnrichedApplication) => void;
    onViewProfile: (app: EnrichedApplication) => void; // New prop
    onUpdateStatus: (id: number, status: string) => void;
};
const PipelineColumn: React.FC<PipelineColumnProps> = ({ title, applications, isReadOnly, onDragOver, onDrop, onDragStart, onScheduleInterview, onViewResults, onStartInterview, onViewScreeningReport, onViewProfile, onUpdateStatus }) => {
    const handleDragOver = (e: React.DragEvent) => {
        if (isReadOnly) return;
        onDragOver(e);
    };

    const handleDrop = (e: React.DragEvent, newStatus: string) => {
        if (isReadOnly) return;
        onDrop(e, newStatus);
    };

    return (
        <div className="pipeline-column" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, title)} style={{ opacity: isReadOnly ? 0.7 : 1, pointerEvents: isReadOnly ? 'none' : 'auto' }}>
            <div className="pipeline-column-header" data-status={title}><h3>{title}</h3><span className="candidate-count">{applications.length}</span></div>
            <div className="pipeline-column-body" style={{ pointerEvents: 'auto' }}>
                {/* Re-enable pointer events for body so cards can be dragged OUT of read-only columns if needed, 
                    but wait, if the column is read-only, usually we can't drop INTO it. 
                    Can we drag OUT of it? Yes.
                    So pointer-events: none on the column might break dragging out.
                    Better to just handle onDrop/onDragOver.
                */}
                {applications.map(app => (
                    <ApplicationCard
                        key={app.id}
                        application={app}
                        onDragStart={onDragStart}
                        onScheduleInterview={onScheduleInterview}
                        onViewResults={onViewResults}
                        onStartInterview={onStartInterview}
                        onViewScreeningReport={onViewScreeningReport}
                        onViewProfile={onViewProfile}
                        onUpdateStatus={onUpdateStatus}
                    />
                ))}
            </div>
        </div>
    );
};

export default function CandidatesScreen({
    candidatesData = [],
    jobsData = [],
    pipelineJobFilter = 'all',
    currentUser,
    onUpdateApplicationStatus,
    onScheduleInterview,
    onSaveCandidate,
    onPipelineJobFilterChange,
    onNavigate,
    onStartInterviewSession,
}: CandidatesScreenProps & { onStartInterviewSession: (applicationId: number) => Promise<{ success: boolean }> }) {
    const [view, setView] = useState('pipeline');
    const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
    const [appForSetup, setAppForSetup] = useState<EnrichedApplication | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [appForReport, setAppForReport] = useState<EnrichedApplication | null>(null);
    const [isScreeningReportOpen, setIsScreeningReportOpen] = useState(false);
    const [appForScreeningReport, setAppForScreeningReport] = useState<EnrichedApplication | null>(null);

    const [pendingStatusUpdate, setPendingStatusUpdate] = useState<string | null>(null);

    // Profile Modal State
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [appForProfile, setAppForProfile] = useState<EnrichedApplication | null>(null);
    const [profileScreeningData, setProfileScreeningData] = useState<any>(null);
    const [isProfileLoading, setIsProfileLoading] = useState(false);

    const jobsForFilter = useMemo(() => {
        let filteredJobs = jobsData;
        if (currentUser?.role === 'Employer') {
            filteredJobs = jobsData.filter(job => job.employer === currentUser.name);
        }

        const jobsWithCandidates = new Set(candidatesData.map(c => c.jobId));
        return filteredJobs.filter(job => jobsWithCandidates.has(job.id));
    }, [jobsData, currentUser, candidatesData]);

    const enrichedList: EnrichedApplication[] = useMemo(() => {
        const jobsMap = new Map(jobsData.map(j => [j.id, j]));
        const employerJobIds = currentUser?.role === 'Employer' ? new Set(jobsForFilter.map(job => job.id)) : null;

        return candidatesData.map((candidateApp): EnrichedApplication | null => {
            if (employerJobIds && !employerJobIds.has(candidateApp.jobId)) return null;
            if (pipelineJobFilter !== 'all' && candidateApp.jobId !== parseInt(pipelineJobFilter as string, 10)) return null;

            const job = jobsMap.get(candidateApp.jobId);
            if (!job) return null;

            return {
                id: candidateApp.id,
                candidate_id: candidateApp.id,
                job_id: candidateApp.jobId,
                status: candidateApp.status,
                interview_config: candidateApp.interview_config,
                candidateName: candidateApp.name,
                jobTitle: job.title,
                aiScore: candidateApp.interview_config?.aiScore ?? null,
                linkedin_url: candidateApp.linkedin_url,
            };
        }).filter((app): app is EnrichedApplication => app !== null);
    }, [candidatesData, jobsData, currentUser, jobsForFilter, pipelineJobFilter]);

    const applicationsByStage = useMemo(() => {
        return PIPELINE_STAGES.reduce((acc, stage) => {
            acc[stage] = enrichedList.filter(app => app.status === stage);
            return acc;
        }, {} as Record<string, EnrichedApplication[]>);
    }, [enrichedList]);

    const selectedJobTitle = pipelineJobFilter !== 'all' ? jobsData.find(j => j.id === parseInt(pipelineJobFilter as string, 10))?.title : 'All Jobs';
    const canAddCandidates = currentUser?.role !== 'Employer';

    const handleDragStart = (e: React.DragEvent, applicationId: number) => {
        e.dataTransfer.setData("text/plain", applicationId.toString());
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const handleDrop = (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        const applicationId = parseInt(e.dataTransfer.getData("text/plain"), 10);
        const droppedApp = enrichedList.find(app => app.id === applicationId);

        if (droppedApp && droppedApp.status !== newStatus) {
            if (newStatus === 'Interviewing') {
                // If moving to Interviewing, open setup modal to configure interview
                setAppForSetup(droppedApp);
                setPendingStatusUpdate('Interviewing'); // Set intent to move to Interviewing
                setIsSetupModalOpen(true);
            } else {
                onUpdateApplicationStatus(applicationId, newStatus);
            }
        }
    };

    const handleSaveAndExit = (candidateData) => { onSaveCandidate(candidateData); setView('pipeline'); };

    const handleOpenSetupModal = (app: EnrichedApplication) => {
        setAppForSetup(app);
        // If opening via "Schedule Interview" button (when screening is done), imply move to Interviewing
        if (app.status === 'Screening' && app.interview_config?.screeningStatus === 'completed') {
            setPendingStatusUpdate('Interviewing');
        } else {
            setPendingStatusUpdate(null);
        }
        setIsSetupModalOpen(true);
    };

    const handleCloseSetupModal = () => {
        setIsSetupModalOpen(false);
        setAppForSetup(null);
        setPendingStatusUpdate(null);
    };

    const handleSaveInterviewConfig = async (config: object) => {
        if (appForSetup) {
            const result = await onScheduleInterview(appForSetup.id, config);
            if (result.success) {
                // Check if we have a pending status update (from drag or schedule button)
                if (pendingStatusUpdate) {
                    onUpdateApplicationStatus(appForSetup.id, pendingStatusUpdate);
                }
            }
            handleCloseSetupModal();
        }
    };

    const handleStartInterview = async (app: EnrichedApplication) => {
        if (!app.interview_config) {
            console.error("Interview config not found for application:", app.id);
            return;
        }
        const result = await onStartInterviewSession(app.id);
        if (result.success) {
            let page = 'interview';
            if (app.interview_config.interviewType === 'livekit' || app.interview_config.interviewType === 'tavus') {
                page = 'livekit-interview';
            } else if (app.interview_config.interviewType === 'video') {
                page = 'ai-video-interview';
            }
            const parentPage = currentUser?.role === 'Employer' ? 'recruitment' : 'candidates';
            onNavigate(page, parentPage, { candidateId: app.candidate_id, applicationId: app.id });
        }
    };

    const handleViewResults = (app: EnrichedApplication) => {
        setAppForReport(app);
        setIsReportModalOpen(true);
    };

    const handleViewScreeningReport = (app: EnrichedApplication) => {
        setAppForScreeningReport(app);
        setIsScreeningReportOpen(true);
    };

    const handleViewProfile = async (app: EnrichedApplication) => {
        setAppForProfile(app);
        setIsProfileModalOpen(true);
        setIsProfileLoading(true);
        try {
            const { data } = await api.get(`/interview/screening-status/${app.candidate_id}`);
            setProfileScreeningData(data);
        } catch (err) {
            console.error("Failed to fetch screening status:", err);
            setProfileScreeningData(null);
        } finally {
            setIsProfileLoading(false);
        }
    };

    if (view === 'add' && canAddCandidates) {
        return <AddCandidateScreen onSave={handleSaveAndExit} onCancel={() => setView('pipeline')} jobs={jobsData} />;
    }

    return (
        <>
            <header className="page-header"><h1>Talent Pipeline: {selectedJobTitle}</h1>
                <div className="header-actions">
                    <select className="header-filter" value={pipelineJobFilter} onChange={(e) => onPipelineJobFilterChange(e.target.value)}>
                        <option value="all">All Jobs</option>
                        {jobsForFilter.map(job => (<option key={job.id} value={job.id}>{job.title}</option>))}
                    </select>
                    {canAddCandidates && (<button className="btn btn-primary" onClick={() => setView('add')}>Add New Candidate</button>)}
                </div>
            </header>
            <div className="pipeline-board">
                {PIPELINE_STAGES.map(stage => (
                    <PipelineColumn
                        key={stage}
                        title={stage}
                        applications={applicationsByStage[stage] || []}
                        isReadOnly={stage === 'Offer' && (currentUser?.role === 'Agent' || currentUser?.role === 'Recruiter')} // Assuming Agent/Recruiter are restricted
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onDragStart={handleDragStart}
                        onScheduleInterview={handleOpenSetupModal}
                        onViewResults={handleViewResults}
                        onStartInterview={handleStartInterview}
                        onViewScreeningReport={handleViewScreeningReport}
                        onViewProfile={handleViewProfile}
                        onUpdateStatus={onUpdateApplicationStatus}
                    />
                ))}
            </div>
            {isSetupModalOpen && appForSetup && (
                <SetupInterviewModal
                    application={appForSetup}
                    candidateName={appForSetup.candidateName}
                    onSave={handleSaveInterviewConfig}
                    onCancel={handleCloseSetupModal}
                />
            )}
            {isReportModalOpen && appForReport && (
                <InterviewReportModal
                    application={appForReport}
                    onClose={() => setIsReportModalOpen(false)}
                />
            )}
            {isScreeningReportOpen && appForScreeningReport && (
                <ScreeningReportModal
                    application={appForScreeningReport}
                    onClose={() => setIsScreeningReportOpen(false)}
                />
            )}
            {isProfileModalOpen && appForProfile && (
                <CandidateProfileModal
                    application={appForProfile}
                    screeningData={profileScreeningData}
                    isLoading={isProfileLoading}
                    onClose={() => setIsProfileModalOpen(false)}
                />
            )}
        </>
    );
}
