import React from 'react';

// This screen is a placeholder for a recruiter-specific dashboard.
// For now, it mirrors the Agent dashboard for consistency.
export default function RecruiterDashboardScreen({ jobsData = [], candidatesData = [] }) {
    const activeJobs = jobsData.filter(job => job.status === 'Active').length;
    const candidatesInPipeline = candidatesData.length;
    const interviewsScheduled = candidatesData.filter(c => c.status === 'Interviewing' || c.status === 'Offer').length;
    const placements = candidatesData.filter(c => c.status === 'Hired').length;

    return (
        <>
            <header className="page-header">
                <h1>Recruiter Dashboard</h1>
            </header>
            <div className="dashboard-grid">
                <div className="kpi-card">
                    <h3>Active Jobs Assigned</h3>
                    <p>{activeJobs}</p>
                </div>
                <div className="kpi-card">
                    <h3>Candidates in Pipeline</h3>
                    <p>{candidatesInPipeline}</p>
                </div>
                <div className="kpi-card">
                    <h3>Interviews Scheduled</h3>
                    <p>{interviewsScheduled}</p>
                </div>
                <div className="kpi-card">
                    <h3>Placements Made</h3>
                    <p>{placements}</p>
                </div>
            </div>
        </>
    );
}