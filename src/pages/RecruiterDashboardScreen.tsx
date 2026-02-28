import React, { useMemo } from 'react';
import { BriefcaseIcon, UsersIcon, CalendarIcon, CheckCircleIcon, PlusIcon } from '../components/Icons';

export default function RecruiterDashboardScreen({ jobsData = [], candidatesData = [], currentUser, onNavigate }) {
    // Metrics Calculation
    const activeJobsCount = jobsData.filter(job => job.status === 'Active').length;

    const pipelineCounts = useMemo(() => {
        const counts = {
            Total: candidatesData.length,
            Screening: candidatesData.filter(c => c.status === 'Screening').length,
            Interviewing: candidatesData.filter(c => c.status === 'Interviewing').length,
            Offer: candidatesData.filter(c => c.status === 'Offer').length,
            Hired: candidatesData.filter(c => c.status === 'Hired').length,
        };
        return counts;
    }, [candidatesData]);

    const upcomingInterviews = useMemo(() => {
        // Mock logic for upcoming interviews based on status 'Interviewing'
        // In a real app, this would filter by actual scheduled dates
        return candidatesData
            .filter(c => c.status === 'Interviewing')
            .slice(0, 5);
    }, [candidatesData]);

    const recentPlacements = useMemo(() => {
        return candidatesData
            .filter(c => c.status === 'Hired')
            .slice(0, 5);
    }, [candidatesData]);

    const MetricCard = ({ title, value, icon, color, trend = null }) => (
        <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                    width: '48px', height: '48px',
                    borderRadius: '12px',
                    background: `${color}15`, // 15% opacity
                    color: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    {icon}
                </div>
                {trend && (
                    <span style={{
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: 'var(--status-success)',
                        background: 'var(--success-50)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-full)'
                    }}>
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <h3 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-text-main)', margin: 0 }}>{value}</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0.2rem 0 0' }}>{title}</p>
            </div>
        </div>
    );

    return (
        <div className="dashboard-container">
            <header className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em' }}>Recruiter Dashboard</h1>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                        Welcome back, {currentUser?.name || 'Recruiter'}. Here's what's happening today.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-primary" onClick={() => onNavigate && onNavigate('job-creation', 'recruitment')}>
                        <PlusIcon style={{ width: '18px', marginRight: '0.5rem' }} /> Post Job
                    </button>
                    <button className="btn btn-secondary" onClick={() => onNavigate && onNavigate('add-candidate', 'recruitment')}>
                        <UsersIcon style={{ width: '18px', marginRight: '0.5rem' }} /> Add Candidate
                    </button>
                </div>
            </header>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                <MetricCard
                    title="Active Jobs"
                    value={activeJobsCount}
                    icon={<BriefcaseIcon />}
                    color="var(--color-primary)"
                    trend="+2 this week"
                />
                <MetricCard
                    title="Active Candidates"
                    value={pipelineCounts.Total - pipelineCounts.Hired}
                    icon={<UsersIcon />}
                    color="#f59e0b"
                    trend="+12% vs last month"
                />
                <MetricCard
                    title="Interviews Scheduled"
                    value={pipelineCounts.Interviewing}
                    icon={<CalendarIcon />}
                    color="#8b5cf6"
                />
                <MetricCard
                    title="Total Hired"
                    value={pipelineCounts.Hired}
                    icon={<CheckCircleIcon />}
                    color="var(--status-success)"
                    trend="+5 this month"
                />
            </div>

            <div className="dashboard-grid" style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '1.5rem'
            }}>
                {/* Left Column: Pipeline & Activity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Pipeline Summary */}
                    <div style={{
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-sm)',
                        padding: '1.5rem'
                    }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Pipeline Overview</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                            {['Screening', 'Interviewing', 'Offer', 'Hired'].map(stage => (
                                <div key={stage} style={{ textAlign: 'center', padding: '1rem', background: 'var(--slate-50)', borderRadius: 'var(--radius-lg)' }}>
                                    <div style={{
                                        marginBottom: '0.5rem',
                                        fontWeight: '600',
                                        color: 'var(--color-text-muted)',
                                        fontSize: '0.9rem'
                                    }}>{stage}</div>
                                    <div style={{
                                        fontSize: '1.75rem',
                                        fontWeight: '800',
                                        color: stage === 'Hired' ? 'var(--status-success)' : 'var(--color-primary)'
                                    }}>{pipelineCounts[stage]}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Upcoming Interviews List */}
                    <div style={{
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-sm)',
                        padding: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Upcoming Interviews</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate && onNavigate('calendar', 'recruitment')}>View Calendar</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {upcomingInterviews.length > 0 ? upcomingInterviews.map(c => (
                                <div key={c.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    background: 'var(--slate-50)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--slate-200)'
                                }}>
                                    <div style={{
                                        width: '40px', height: '40px',
                                        borderRadius: '50%',
                                        background: 'var(--primary-100)',
                                        color: 'var(--color-primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: '700',
                                        fontSize: '1.2rem',
                                        marginRight: '1rem'
                                    }}>
                                        {c.name.charAt(0)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', color: 'var(--color-text-main)' }}>{c.name}</h4>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{c.role}</p>
                                    </div>
                                    <button className="btn btn-primary btn-sm" onClick={() => onNavigate && onNavigate('recruitment-pipeline', 'recruitment')}>
                                        Join
                                    </button>
                                </div>
                            )) : (
                                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>No upcoming interviews scheduled.</p>
                            )}
                        </div>
                    </div>

                </div>

                {/* Right Column: Recent Placements / Notifications */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-sm)',
                        padding: '1.5rem',
                        height: '100%'
                    }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Recent Placements</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {recentPlacements.length > 0 ? recentPlacements.map(c => (
                                <div key={c.id} style={{
                                    paddingBottom: '1rem',
                                    borderBottom: '1px solid var(--slate-100)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem'
                                }}>
                                    <div style={{ color: 'var(--status-success)' }}><CheckCircleIcon style={{ width: '20px' }} /></div>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{c.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Hired as {c.role}</div>
                                    </div>
                                </div>
                            )) : (
                                <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No placements yet.</p>
                            )}
                        </div>

                        <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--primary-50)', borderRadius: 'var(--radius-lg)' }}>
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-800)', margin: '0 0 0.5rem 0' }}>Pro Tip</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--primary-700)', margin: 0 }}>
                                Use the AI Screening feature to automatically qualify candidates before scheduling interviews.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}