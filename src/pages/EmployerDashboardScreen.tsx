import React, { useMemo } from 'react';
import { PlusIcon, BriefcaseIcon, UsersIcon, TargetIcon, CheckCircleIcon, FilePlusIcon } from '../components/Icons';

// Type definitions
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

// --- Helper Components ---

const MetricCard = ({ title, value, icon, borderLeftColor, onClick }) => (
    <div className="metric-card" style={{ borderLeftColor: borderLeftColor, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
        <div>
            <h3>{title}</h3>
            <p>{value}</p>
        </div>
        <div style={{
            width: '48px', height: '48px', borderRadius: '8px',
            background: 'var(--background-color)', color: 'var(--primary-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            {icon}
        </div>
    </div>
);

// Simple Donut Chart Representation
const DonutChart = ({ data }) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    if (total === 0) return <div className="text-secondary" style={{ textAlign: 'center', padding: '2rem' }}>No data available</div>;

    let cumulative = 0;
    const gradient = data.map(item => {
        const start = cumulative;
        const end = cumulative + (item.value / total) * 100;
        cumulative = end;
        return `${item.color} ${start}% ${end}%`;
    }).join(', ');

    const conic = `conic-gradient(${gradient})`;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{
                width: '160px', height: '160px', borderRadius: '50%',
                background: conic, position: 'relative'
            }}>
                <div style={{
                    position: 'absolute', inset: '25%', background: 'white',
                    borderRadius: '50%', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center'
                }}>
                    <strong style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>{total}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Offers</span>
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: d.color }}></span>
                        <span>{d.name}: <strong>{d.value}</strong></span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function EmployerDashboardScreen(props: EmployerDashboardProps) {
    const { jobsData = [], candidatesData = [], currentUser, onCreateNewJob, onNavigate, onPipelineJobFilterChange } = props;

    // --- Data Logic ---
    const jobsMap = useMemo(() => new Map(jobsData.map(job => [job.id, job.title])), [jobsData]);

    const employerJobs = useMemo(() => {
        if (!jobsData || !currentUser?.name) return [];
        return jobsData.filter(job => job.employer === currentUser.name);
    }, [jobsData, currentUser]);

    const employerJobIds = useMemo(() => new Set(employerJobs.map(j => j.id)), [employerJobs]);

    const employerApplications = useMemo(() => {
        if (!candidatesData || employerJobIds.size === 0) return [];
        return candidatesData.filter(app => employerJobIds.has(app.jobId));
    }, [candidatesData, employerJobIds]);

    const totalVacancies = employerJobs.filter(j => j.status === 'Active').length;
    const candidatesInPipeline = employerApplications.filter(app => app.status !== 'Hired').length;
    const hiredCandidates = employerApplications.filter(app => app.status === 'Hired').length;

    const offerAcceptanceVal = useMemo(() => {
        const offers = employerApplications.filter(app => ['Offer', 'Hired'].includes(app.status)).length;
        if (offers === 0) return 0;
        return Math.round((hiredCandidates / offers) * 100);
    }, [hiredCandidates, employerApplications]);

    const offerStatusData = [
        { name: 'Sent', value: employerApplications.filter(a => a.status === 'Offer').length, color: 'var(--gold-color)' },
        { name: 'Accepted', value: hiredCandidates, color: 'var(--success-color)' },
        { name: 'Rejected', value: 0, color: 'var(--error-color)' }
    ];

    const recruitmentHotspots = useMemo(() => {
        const activeJobs = employerJobs.filter(j => j.status === 'Active');
        return activeJobs.map(job => {
            const count = employerApplications.filter(app => app.jobId === job.id).length;
            return { ...job, candidateCount: count };
        }).sort((a, b) => b.candidateCount - a.candidateCount).slice(0, 5);
    }, [employerJobs, employerApplications]);

    return (
        <div className="dashboard-container">
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Employer Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Welcome back, {currentUser?.name || 'User'}</p>
                </div>
                <button className="btn btn-primary" onClick={onCreateNewJob}>
                    <PlusIcon /> Post New Job
                </button>
            </header>

            <div className="metrics-grid">
                <MetricCard
                    title="Total Vacancies"
                    value={totalVacancies}
                    icon={<BriefcaseIcon />}
                    borderLeftColor="var(--primary-color)"
                    onClick={() => onNavigate('employer-jobs-list', 'recruitment')}
                />
                <MetricCard
                    title="Active Candidates"
                    value={candidatesInPipeline}
                    icon={<UsersIcon />}
                    borderLeftColor="var(--secondary-color)"
                    onClick={() => onNavigate('recruitment-pipeline', 'recruitment')}
                />
                <MetricCard
                    title="Total Hired"
                    value={hiredCandidates}
                    icon={<CheckCircleIcon />}
                    borderLeftColor="var(--success-color)"
                    onClick={() => onNavigate('recruitment-pipeline', 'recruitment')}
                />
                <MetricCard
                    title="Offer Acceptance"
                    value={`${offerAcceptanceVal}%`}
                    icon={<TargetIcon />}
                    borderLeftColor="var(--gold-color)"
                    onClick={() => onNavigate('recruitment-pipeline', 'recruitment')}
                />
            </div>

            <div className="dashboard-grid">
                {/* Chart Section */}
                <div className="chart-card">
                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Offer Status</h3>
                    </div>
                    <DonutChart data={offerStatusData} />
                </div>

                {/* Hotspots Section */}
                <div className="chart-card">
                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Recruitment Hotspots</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {recruitmentHotspots.length > 0 ? recruitmentHotspots.map(job => (
                            <div key={job.id}
                                onClick={() => { onPipelineJobFilterChange(job.id); onNavigate('recruitment-pipeline', 'recruitment'); }}
                                style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '0.75rem', borderRadius: 'var(--border-radius-sm)',
                                    background: 'var(--background-color)', cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-subtle)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--background-color)'}
                            >
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.title}</span>
                                <span className="text-success" style={{ fontWeight: 700 }}>{job.candidateCount}</span>
                            </div>
                        )) : (
                            <p className="text-secondary">No active jobs found.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="chart-card" style={{ marginTop: 'var(--spacing-lg)' }}>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Recent Applications</h3>
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Candidate</th>
                                <th>Job Role</th>
                                <th>Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employerApplications.slice(0, 5).map(app => (
                                <tr key={app.id}>
                                    <td style={{ fontWeight: 600 }}>{app.name}</td>
                                    <td>{jobsMap.get(app.jobId) || app.role}</td>
                                    <td>{new Date(app.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <span style={{
                                            padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem',
                                            background: app.status === 'Hired' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(52, 152, 219, 0.15)',
                                            color: app.status === 'Hired' ? 'var(--success-color)' : 'var(--info-color)',
                                            fontWeight: 700
                                        }}>
                                            {app.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {employerApplications.length === 0 && (
                                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No applications yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}