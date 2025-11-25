

import React, { useState, useMemo } from 'react';
import AddCandidateScreen from './AddCandidateScreen';

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
            <div className="modal-content" style={{maxWidth: '500px'}}>
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

// Application Card Component
type ApplicationCardProps = {
    application: EnrichedApplication;
    onDragStart: (e: React.DragEvent, applicationId: number) => void;
    onScheduleInterview: (app: EnrichedApplication) => void;
    onViewResults: (app: EnrichedApplication) => void;
    onStartInterview: (app: EnrichedApplication) => void; // New prop for starting interviews directly
};
const ApplicationCard: React.FC<ApplicationCardProps> = ({ application, onDragStart, onScheduleInterview, onViewResults, onStartInterview }) => {
    const { id, candidateName, jobTitle, aiScore, status } = application;
    const interviewStatus = application.interview_config?.interviewStatus;
    const interviewType = application.interview_config?.interviewType || 'audio'; // Default to audio

    const renderActionButton = () => {
        if (status === 'Screening' && !interviewStatus) {
            return (
                <button className="btn btn-secondary btn-sm" onClick={() => onScheduleInterview(application)}>Setup Interview</button>
            );
        }
        if (interviewStatus === 'assessment_pending' || interviewStatus === 'pending') {
            return (
                <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Assessment Pending</span>
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
                <button className="btn btn-secondary btn-sm" onClick={() => onViewResults(application)}>View Report</button>
            );
        }
        return null;
    };


    return (
        <div className="candidate-card" draggable={true} onDragStart={(e) => onDragStart(e, id)}>
            {aiScore !== null && (<div className="candidate-card-score">{aiScore.toFixed(1)}/10</div>)}
            <h4>{candidateName}</h4>
            <p>{jobTitle}</p>
            <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem'}}>
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
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, newStatus: string) => void;
    onDragStart: (e: React.DragEvent, applicationId: number) => void;
    onScheduleInterview: (app: EnrichedApplication) => void;
    onViewResults: (app: EnrichedApplication) => void;
    onStartInterview: (app: EnrichedApplication) => void; // New prop for starting interviews directly
};
const PipelineColumn: React.FC<PipelineColumnProps> = ({ title, applications, onDragOver, onDrop, onDragStart, onScheduleInterview, onViewResults, onStartInterview }) => {
    return (
        <div className="pipeline-column" onDragOver={onDragOver} onDrop={(e) => onDrop(e, title)}>
            <div className="pipeline-column-header" data-status={title}><h3>{title}</h3><span className="candidate-count">{applications.length}</span></div>
            <div className="pipeline-column-body">
                {applications.map(app => (
                    <ApplicationCard
                        key={app.id}
                        application={app}
                        onDragStart={onDragStart}
                        onScheduleInterview={onScheduleInterview}
                        onViewResults={onViewResults}
                        onStartInterview={onStartInterview}
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
    onStartInterviewSession, // Added onStartInterviewSession
}: CandidatesScreenProps & { onStartInterviewSession: (applicationId: number) => Promise<{ success: boolean }> }) {
    const [view, setView] = useState('pipeline');
    const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
    const [appForSetup, setAppForSetup] = useState<EnrichedApplication | null>(null);

    const jobsForFilter = useMemo(() => {
        let filteredJobs = jobsData;
        if (currentUser?.role === 'Employer') {
            filteredJobs = jobsData.filter(job => job.employer === currentUser.name);
        }

        // Filter these jobs to only include those that have at least one candidate application
        const jobsWithCandidates = new Set(candidatesData.map(c => c.jobId));
        return filteredJobs.filter(job => jobsWithCandidates.has(job.id));
    }, [jobsData, currentUser, candidatesData]);
    
    // The 'candidates' table now serves as the applications list. This logic processes it for display.
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
                candidate_id: candidateApp.id, // The candidate record ID is the application ID now
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
                onUpdateApplicationStatus(appForSetup.id, 'Interviewing');
            }
            handleCloseSetupModal();
        }
    };

    const handleStartInterview = async (app: EnrichedApplication) => {
        if (!app.interview_config) {
            console.error("Interview config not found for application:", app.id);
            return;
        }
        // Call the parent handler to update session status
        const result = await onStartInterviewSession(app.id);
        if (result.success) {
            // Determine page based on interview type
            let page = 'interview'; // default audio
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
        if (onNavigate) {
            const parentPage = currentUser?.role === 'Employer' ? 'recruitment' : 'candidates';
            onNavigate('interview-report', parentPage, { candidateId: app.candidate_id, applicationId: app.id });
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
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onDragStart={handleDragStart}
                        onScheduleInterview={handleOpenSetupModal}
                        onViewResults={handleViewResults}
                        onStartInterview={handleStartInterview} // Pass the new handler
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
        </>
    );
}