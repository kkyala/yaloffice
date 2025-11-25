import React, { useMemo } from 'react';
import { PlusIcon, BriefcaseIcon, UsersIcon, TargetIcon, CheckCircleIcon, FilePlusIcon, CalendarIcon } from '../components/Icons';

// Type definitions to ensure data consistency
type Job = { id: number; title: string; employer: string; status: string };
type CandidateApplication = { id: number; jobId: number; name: string; role: string; status: string; created_at: string; };
type User = { name: string };
type EmployerDashboardProps = {
    jobsData: Job[];
    candidatesData: CandidateApplication[];
    currentUser: User;
    onCreateNewJob: () => void;
    onNavigate: (page: string, parent: string) => void;
    onPipelineJobFilterChange: (filterValue: string | number) => void;
};

// --- Doughnut Chart Component (Embedded for simplicity) ---
const DoughnutChart = ({ data }) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    if (total === 0) {
        return <div className="no-data-message" style={{height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>No offer data available.</div>;
    }
    let cumulativePercentage = 0;
    const gradientParts = data.map(item => {
        const percentage = (item.value / total) * 100;
        const part = `${item.color} ${cumulativePercentage}% ${cumulativePercentage + percentage}%`;
        cumulativePercentage += percentage;
        return part;
    });
    const conicGradient = `conic-gradient(${gradientParts.join(', ')})`;
    return (
        <div className="doughnut-chart-container">
            <div className="doughnut-chart" style={{ background: conicGradient }} role="img" aria-label="Doughnut chart showing offer status breakdown"></div>
            <div className="doughnut-chart-legend">
                {data.map(item => (
                    <div key={item.name} className="legend-item">
                        <div className="legend-color-box" style={{ backgroundColor: item.color }}></div>
                        <span>{item.name} ({item.value})</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function EmployerDashboardScreen({ jobsData, candidatesData, currentUser, onCreateNewJob, onNavigate, onPipelineJobFilterChange }: EmployerDashboardProps) {
    
    const jobsMap = useMemo(() => new Map(jobsData.map(job => [job.id, job.title])), [jobsData]);

    const employerJobs = useMemo(() => {
        if (!jobsData || !currentUser?.name) return [];
        return jobsData.filter(job => job.employer === currentUser.name);
    }, [jobsData, currentUser]);

    const employerJobIds = useMemo(() => new Set(employerJobs.map(j => j.id)), [employerJobs]);

    // CORRECT: Use 'candidates' table as the source of truth for applications data.
    const employerApplications = useMemo(() => {
        if (!candidatesData || employerJobIds.size === 0) return [];
        return candidatesData.filter(app => employerJobIds.has(app.jobId));
    }, [candidatesData, employerJobIds]);

    // --- DATA CALCULATIONS BASED ON CORRECTED DATA SOURCE ---
    const totalVacancies = employerJobs.filter(j => j.status === 'Active').length;
    const candidatesInPipeline = employerApplications.filter(app => app.status !== 'Hired').length;
    const hiredCandidates = employerApplications.filter(app => app.status === 'Hired').length;

    const offerAcceptanceRate = useMemo(() => {
        const offersMade = employerApplications.filter(app => app.status === 'Offer' || app.status === 'Hired').length;
        const accepted = hiredCandidates;
        if (offersMade === 0) return 0;
        return ((accepted / offersMade) * 100).toFixed(0);
    }, [employerApplications, hiredCandidates]);

    const funnelData = useMemo(() => {
        const stages = { Screening: 0, Interviewing: 0, Offer: 0, Hired: 0 };
        employerApplications.forEach(app => {
            if (stages[app.status] !== undefined) stages[app.status]++;
        });
        const maxCandidatesInStage = Math.max(1, ...Object.values(stages));
        return Object.entries(stages).map(([name, value]) => ({ name, value, percentage: (value / maxCandidatesInStage) * 100 }));
    }, [employerApplications]);

    const offerStatusData = [
        { name: 'Sent', value: employerApplications.filter(app => app.status === 'Offer').length, color: 'var(--status-on-hold)' },
        { name: 'Accepted', value: hiredCandidates, color: 'var(--status-offer)' },
        { name: 'Rejected', value: 0, color: 'var(--status-closed)' }, // Hardcoded 0 as we don't track this yet
    ];

    const recruitmentHotspots = useMemo(() => {
        const activeJobs = employerJobs.filter(j => j.status === 'Active');
        return activeJobs.map(job => {
            const count = employerApplications.filter(app => app.jobId === job.id).length;
            return { ...job, candidateCount: count };
        }).sort((a, b) => b.candidateCount - a.candidateCount).slice(0, 5);
    }, [employerJobs, employerApplications]);

    const candidatesAwaitingReview = useMemo(() => {
        return employerApplications
            .filter(app => app.status === 'Applied' || app.status === 'Screening')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5);
    }, [employerApplications]);

    const recentActivity = useMemo(() => {
        return employerApplications
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 3)
            .map(app => {
                const timeDiffHours = Math.round((new Date().getTime() - new Date(app.created_at).getTime()) / (1000 * 60 * 60));
                const timeAgo = timeDiffHours > 24 ? `${Math.round(timeDiffHours/24)} days ago` : `${timeDiffHours} hours ago`;
                return { 
                    id: app.id, 
                    type: 'application', 
                    text: `New application from ${app.name || 'a candidate'} for ${jobsMap.get(app.jobId)}.`,
                    time: timeAgo,
                };
            });
    }, [employerApplications, jobsMap]);
    
    const handleHotspotClick = (jobId) => {
        onPipelineJobFilterChange(jobId);
        onNavigate('recruitment-pipeline', 'recruitment');
    };

    return (
        <>
            <div className="dashboard-container">
                <div className="kpi-grid">
                    <div className="kpi-card-new"><div className="kpi-icon"><BriefcaseIcon /></div><div className="kpi-content"><h3>Total Vacancies</h3><p>{totalVacancies}</p></div></div>
                    <div className="kpi-card-new"><div className="kpi-icon"><UsersIcon /></div><div className="kpi-content"><h3>Candidates in Pipeline</h3><p>{candidatesInPipeline}</p></div></div>
                    <div className="kpi-card-new"><div className="kpi-icon"><CheckCircleIcon /></div><div className="kpi-content"><h3>Total Hired</h3><p>{hiredCandidates}</p></div></div>
                    <div className="kpi-card-new"><div className="kpi-icon"><TargetIcon /></div><div className="kpi-content"><h3>Offer Acceptance Rate</h3><p>{offerAcceptanceRate}%</p></div></div>
                </div>

                <div className="dashboard-main-grid">
                    <div className="dashboard-widget grid-col-span-2">
                        <h3>Offer Status Breakdown</h3>
                        <DoughnutChart data={offerStatusData} />
                    </div>
                    
                    <div className="dashboard-widget grid-col-span-2">
                        <h3>Recruitment Hotspots</h3>
                        <div className="hotspots-list">
                            {recruitmentHotspots.length > 0 ? recruitmentHotspots.map(job => (
                                <div key={job.id} className="hotspot-item" onClick={() => handleHotspotClick(job.id)} role="button" tabIndex={0}>
                                    <div className="hotspot-info"><strong>{job.title}</strong><span>{job.candidateCount} Candidates</span></div>
                                </div>
                            )) : <p className="no-data-message">Post jobs to see candidate activity.</p>}
                        </div>
                    </div>

                    <div className="dashboard-widget grid-col-span-2">
                        <h3>Candidates Awaiting Review</h3>
                        <div className="candidate-review-list">
                             {candidatesAwaitingReview.length > 0 ? candidatesAwaitingReview.map(candidate => (
                                <div key={candidate.id} className="candidate-review-item">
                                    <img src={`https://i.pravatar.cc/40?u=${candidate.name}`} alt={candidate.name} />
                                    <div className="candidate-review-item-info">
                                        <strong>{candidate.name}</strong>
                                        <span>Applied for {jobsMap.get(candidate.jobId) || candidate.role}</span>
                                    </div>
                                </div>
                            )) : <p className="no-data-message">No new candidates to review.</p>}
                        </div>
                    </div>

                     <div className="dashboard-widget grid-col-span-3">
                        <h3>Candidate Funnel</h3>
                        <div className="funnel-chart">
                            {funnelData.map(stage => (
                                <div key={stage.name} className="funnel-stage">
                                    <div className="funnel-labels">
                                        <span>{stage.name}</span>
                                        <strong>{stage.value}</strong>
                                    </div>
                                    <div className="funnel-bar">
                                        <div className="funnel-bar-fill" style={{ width: `${stage.percentage}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="dashboard-widget grid-col-span-3">
                         <h3>Recent Activity</h3>
                         <div className="activity-feed-v2">
                            {recentActivity.length > 0 ? recentActivity.map(item => (
                                <div key={item.id} className="activity-item-v2">
                                    <div className={`activity-icon-v2 ${item.type}`}>
                                        <FilePlusIcon />
                                    </div>
                                    <p>{item.text}<br/><span>{item.time}</span></p>
                                </div>
                            )) : <p className="no-data-message">No recent activity to show.</p>}
                        </div>
                    </div>
                </div>
            </div>
            <button className="fab" onClick={onCreateNewJob} aria-label="Create New Job">
                <PlusIcon />
            </button>
        </>
    );
}