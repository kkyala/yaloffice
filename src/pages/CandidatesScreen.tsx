
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
    // NEW: State for interview type selection (audio, video, or livekit)
    const [interviewType, setInterviewType] = useState<'audio' | 'video' | 'livekit'>(application?.interview_config?.interviewType || 'audio');

    const handleSave = () => {
        onSave({
            questionCount,
            difficulty,
            duration,
            interviewType, // Pass the selected interview type
            interviewStatus: 'assessment_pending',
        });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <div className="modal-header"><h2>Setup AI Interview for {candidateName}</h2></div>
                <div className="modal-body">
                    <div className="form-group"><label>Number of Questions</label><input type="number" value={questionCount} onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))} /></div>
                    <div className="form-group"><label>Difficulty</label><select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
                    <div className="form-group"><label>Duration (minutes)</label><input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value, 10))} /></div>
                    {/* NEW: Interview Type Selection */}
                    <div className="form-group">
                        <label>Interview Type</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="radio"
                                    name="interviewType"
                                    value="audio"
                                    checked={interviewType === 'audio'}
                                    onChange={() => setInterviewType('audio')}
                                /> Audio Only (Gemini AI)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="radio"
                                    name="interviewType"
                                    value="video"
                                    checked={interviewType === 'video'}
                                    onChange={() => setInterviewType('video')}
                                /> Video (Gemini AI)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="radio"
                                    name="interviewType"
                                    value="livekit"
                                    checked={interviewType === 'livekit'}
                                    onChange={() => setInterviewType('livekit')}
                                /> AI Avatar Interview (Tavus + LiveKit)
                            </label>
                        </div>
                    </div>
                </div>
                <div className="modal-footer"><button className="btn btn-secondary" onClick={onCancel}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save & Schedule</button></div>
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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Interview Report: {candidateName}</h2>
                    <button className="modal-close-btn" onClick={onClose} style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)'
                    }}>×</button>
                </div>
                <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            <strong>Position:</strong> {jobTitle}
                        </p>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            <strong>Interview Type:</strong> {
                                interviewType === 'livekit' ? 'AI Avatar (Tavus)' :
                                    interviewType === 'video' ? 'Video (Gemini)' : 'Audio (Gemini)'
                            }
                        </p>
                        {aiScore !== null && (
                            <div style={{
                                display: 'inline-block',
                                background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
                                color: 'white',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '12px',
                                fontSize: '1.25rem',
                                fontWeight: '700',
                                marginTop: '0.5rem'
                            }}>
                                AI Score: {aiScore.toFixed(1)}/10
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Interview Transcript</h3>
                        <div style={{
                            background: 'var(--light-bg)',
                            padding: '1rem',
                            borderRadius: 'var(--border-radius-sm)',
                            whiteSpace: 'pre-wrap',
                            fontSize: '0.9rem',
                            lineHeight: '1.6',
                            color: 'var(--text-primary)'
                        }}>
                            {transcript}
                        </div>
                    </div>
                </div>
                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <a href={`${config.apiBaseUrl}/candidates/${application.id}/report/interview`} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Download PDF</a>
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Screening Report: {candidateName}</h2>
                    <button className="modal-close-btn" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>
                <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>Score:</strong>
                        <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary-color)' }}>{report.score}/100</span>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <strong>Summary:</strong>
                        <p style={{ marginTop: '0.5rem', lineHeight: '1.5' }}>{report.summary}</p>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <strong>Recommendation:</strong>
                        <p style={{ marginTop: '0.5rem', fontWeight: '500' }}>{report.recommendation}</p>
                    </div>
                    {report.keyStrengths && (
                        <div style={{ marginBottom: '1rem' }}>
                            <strong>Key Strengths:</strong>
                            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                                {report.keyStrengths.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <a href={`${config.apiBaseUrl}/candidates/${application.id}/report/screening`} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Download PDF</a>
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

// Candidate Profile Modal (with Screening Results)
const CandidateProfileModal = ({ application, screeningData, isLoading, onClose }) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Candidate Profile: {application.candidateName}</h2>
                    <button className="modal-close-btn" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>
                <div className="modal-body">
                    <div style={{ marginBottom: '1.5rem' }}>
                        <p><strong>Job:</strong> {application.jobTitle}</p>
                        <p><strong>Status:</strong> {application.status}</p>
                    </div>

                    <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Initial Screening Results</h3>

                    {isLoading ? (
                        <p>Loading screening data...</p>
                    ) : screeningData && screeningData.completed ? (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{
                                    width: '60px', height: '60px', borderRadius: '50%',
                                    background: screeningData.score >= 70 ? '#dcfce7' : '#fef3c7',
                                    color: screeningData.score >= 70 ? '#166534' : '#92400e',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 'bold', fontSize: '1.2rem'
                                }}>
                                    {screeningData.score}
                                </div>
                                <div>
                                    <strong>Screening Score</strong>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Completed on {new Date(screeningData.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                            {/* We might not have summary here if the endpoint only returns score/date. 
                                Let's check the endpoint. It returns score, date. 
                                If we want summary, we need to update the endpoint or fetch it differently.
                                For now, let's show what we have. 
                            */}
                            <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                                Detailed screening report is available in the Screening phase.
                            </p>
                        </div>
                    ) : (
                        <p>No screening data available for this candidate.</p>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
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
                <button className="btn btn-secondary btn-sm" onClick={() => onViewProfile(application)}>View Profile</button>
            );
        }
        if (status === 'Screening') {
            if (screeningStatus === 'completed') {
                return (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => onViewScreeningReport(application)}>Report</button>
                        <button className="btn btn-primary btn-sm" onClick={() => onScheduleInterview(application)}>Schedule Interview</button>
                    </div>
                );
            } else {
                // Show Setup Interview button if not completed
                return (
                    <button className="btn btn-primary btn-sm" onClick={() => onScheduleInterview(application)}>Setup Screening</button>
                );
            }
        }
        if (status === 'Interviewing' && !interviewStatus) {
            return (
                <button className="btn btn-secondary btn-sm" onClick={() => onScheduleInterview(application)}>Setup Interview</button>
            );
        }
        if (interviewStatus === 'assessment_pending' || interviewStatus === 'pending') {
            return (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Assessment Pending</span>
            );
        }
        if (interviewStatus === 'assessment_completed' || interviewStatus === 'started') {
            return (
                <button className="btn btn-primary btn-sm" onClick={() => onStartInterview(application)}>
                    {interviewStatus === 'started' ? 'Continue Interview' : 'Start Interview'}
                </button>
            );
        }
        if (interviewStatus === 'finished') {
            return (
                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => onViewResults(application)}>View Report</button>
                    {status === 'Interviewing' && (
                        <button className="btn btn-primary btn-sm" onClick={() => onUpdateStatus(id, 'Offer')}>Move to Offer</button>
                    )}
                </div>
            );
        }
        if (status === 'Offer') {
            return (
                <button className="btn btn-primary btn-sm" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }} onClick={() => onUpdateStatus(id, 'Hired')}>Mark as Hired</button>
            );
        }
        return null;
    };


    return (
        <div className="candidate-card" draggable={true} onDragStart={(e) => onDragStart(e, id)}>
            {aiScore !== null && (<div className="candidate-card-score">{aiScore.toFixed(1)}/10</div>)}
            <h4>{candidateName}</h4>
            <p>{jobTitle}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {interviewType === 'livekit' ? 'AI Avatar Interview (Tavus)' :
                    interviewType === 'video' ? 'Video Interview (Gemini)' : 'Audio Interview (Gemini)'}
            </p>
            <div className="candidate-card-footer">
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

        return candidatesData.map(candidateApp => {
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
        const droppedApp = candidatesData.find(app => app.id === applicationId);
        if (droppedApp && droppedApp.status !== newStatus) {
            onUpdateApplicationStatus(applicationId, newStatus);
        }
    };

    const handleSaveAndExit = (candidateData) => { onSaveCandidate(candidateData); setView('pipeline'); };
    const handleOpenSetupModal = (app: EnrichedApplication) => { setAppForSetup(app); setIsSetupModalOpen(true); };
    const handleCloseSetupModal = () => { setIsSetupModalOpen(false); setAppForSetup(null); };

    const handleSaveInterviewConfig = async (config: object) => {
        if (appForSetup) {
            const result = await onScheduleInterview(appForSetup.id, config);
            if (result.success) {
                // Only move to Interviewing if NOT in Screening phase (or if explicitly desired)
                // If in Screening phase, we stay there until screening is done.
                if (appForSetup.status !== 'Screening') {
                    onUpdateApplicationStatus(appForSetup.id, 'Interviewing');
                } else {
                    // Force refresh to show updated button state (e.g. "Assessment Pending")
                    // The parent component should handle refetch, but we might need to trigger it.
                    // onScheduleInterview usually triggers refetch in App.tsx.
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