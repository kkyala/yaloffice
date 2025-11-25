import React, { useMemo } from 'react';
import { BriefcaseIcon, UsersIcon, CheckCircleIcon, CalendarIcon, FilePlusIcon } from '../components/Icons';

// Type definitions to ensure data consistency
type Job = { id: number; title: string; status: string };
type Candidate = { id: number; name: string; role: string; jobId: number; status: string; created_at: string };

type AgentDashboardProps = {
    jobsData: Job[];
    candidatesData: Candidate[];
    onNavigate: (page: string, parent: string, context?: object) => void;
    onPipelineJobFilterChange: (filterValue: string | number) => void;
};

// --- Doughnut Chart Component (from Employer Dashboard) ---
const DoughnutChart = ({ data }) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    if (total === 0) {
        return <div className="no-data-message" style={{height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>No data available.</div>;
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
            <div className="doughnut-chart" style={{ background: conicGradient }} role="img" aria-label="Doughnut chart showing pipeline status breakdown"></div>
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

export default function AgentDashboardScreen({ jobsData = [], candidatesData = [], onNavigate, onPipelineJobFilterChange }: AgentDashboardProps) {
    // --- DATA CALCULATIONS ---
    const activeJobs = useMemo(() => jobsData.filter(job => job.status === 'Active').length, [jobsData]);
    const candidatesInPipeline = useMemo(() => candidatesData.filter(c => c.status !== 'Hired').length, [candidatesData]);
    const interviewsScheduled = useMemo(() => candidatesData.filter(c => c.status === 'Interviewing').length, [candidatesData]);
    const placements = useMemo(() => candidatesData.filter(c => c.status === 'Hired').length, [candidatesData]);

    const jobsMap = useMemo(() => new Map(jobsData.map(job => [job.id, job.title])), [jobsData]);

    const funnelData = useMemo(() => {
        const stages = { Screening: 0, Interviewing: 0, Offer: 0, Hired: 0 };
        candidatesData.forEach(c => {
            if (stages[c.status] !== undefined) stages[c.status]++;
        });
        const maxCandidatesInStage = Math.max(1, ...Object.values(stages));
        return Object.entries(stages).map(([name, value]) => ({ 
            name, 
            value, 
            percentage: (value / maxCandidatesInStage) * 100 
        }));
    }, [candidatesData]);

    const pipelineStatusData = [
        { name: 'Screening', value: candidatesData.filter(c => c.status === 'Screening').length, color: 'var(--status-screening)' },
        { name: 'Interviewing', value: interviewsScheduled, color: 'var(--status-interviewing)' },
        { name: 'Offer', value: candidatesData.filter(c => c.status === 'Offer').length, color: 'var(--status-offer)' },
    ];

    const recruitmentHotspots = useMemo(() => {
        const activeJobs = jobsData.filter(j => j.status === 'Active');
        const jobsWithCounts = activeJobs.map(job => {
            const count = candidatesData.filter(c => c.jobId === job.id).length;
            return { ...job, candidateCount: count };
        });
        return jobsWithCounts.sort((a, b) => b.candidateCount - a.candidateCount).slice(0, 5);
    }, [jobsData, candidatesData]);

    const candidatesAwaitingReview = useMemo(() => {
        return candidatesData
            .filter(c => c.status === 'Sourced' || c.status === 'Screening')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5);
    }, [candidatesData]);

    const recentActivity = useMemo(() => {
        return candidatesData
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 3)
            .map(c => {
                const timeDiffHours = Math.round((new Date().getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60));
                return {
                    id: c.id,
                    type: 'application',
                    text: `${c.name} was added to the pipeline for the ${jobsMap.get(c.jobId) || c.role} role.`,
                    time: timeDiffHours > 24 ? `${Math.round(timeDiffHours/24)} days ago` : `${timeDiffHours} hours ago`,
                }
            });
    }, [candidatesData, jobsMap]);

    const handleHotspotClick = (jobId) => {
        onPipelineJobFilterChange(jobId);
        onNavigate('candidates', 'candidates');
    };
    
    // --- RENDER LOGIC ---
    return (
        <>
            <div className="dashboard-container">
                <div className="kpi-grid">
                    <div className="kpi-card-new"><div className="kpi-icon"><BriefcaseIcon /></div><div className="kpi-content"><h3>Active Jobs</h3><p>{activeJobs}</p></div></div>
                    <div className="kpi-card-new"><div className="kpi-icon"><UsersIcon /></div><div className="kpi-content"><h3>Candidates in Pipeline</h3><p>{candidatesInPipeline}</p></div></div>
                    <div className="kpi-card-new"><div className="kpi-icon"><CalendarIcon /></div><div className="kpi-content"><h3>Interviews Scheduled</h3><p>{interviewsScheduled}</p></div></div>
                    <div className="kpi-card-new"><div className="kpi-icon"><CheckCircleIcon /></div><div className="kpi-content"><h3>Placements (YTD)</h3><p>{placements}</p></div></div>
                </div>

                <div className="dashboard-main-grid">
                    <div className="dashboard-widget grid-col-span-2">
                        <h3>Pipeline Status</h3>
                        <DoughnutChart data={pipelineStatusData} />
                    </div>
                    
                    <div className="dashboard-widget grid-col-span-2">
                        <h3>Recruitment Hotspots</h3>
                        <div className="hotspots-list">
                            {recruitmentHotspots.length > 0 ? recruitmentHotspots.map(job => (
                                <div key={job.id} className="hotspot-item" onClick={() => handleHotspotClick(job.id)} role="button" tabIndex={0}>
                                    <div className="hotspot-info"><strong>{job.title}</strong><span>{job.candidateCount} Candidates</span></div>
                                </div>
                            )) : <p className="no-data-message">No active jobs with candidates.</p>}
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
                            )) : <p className="no-data-message">No recent activity.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}