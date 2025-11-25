import React from 'react';

export default function AdminDashboardScreen({ usersData = [], jobsData = [] }) {
    const totalUsers = usersData.length;
    const activeJobs = jobsData.filter(job => job.status === 'Active').length;
    // Calculate unique employers to represent 'Active Companies'
    const activeCompanies = new Set(jobsData.map(job => job.employer)).size;

    return (
         <>
            <header className="page-header"><h1>Platform Overview</h1></header>
            <div className="dashboard-grid">
                <div className="kpi-card"><h3>Total Users</h3><p>{totalUsers}</p></div>
                <div className="kpi-card"><h3>Active Companies</h3><p>{activeCompanies}</p></div>
                <div className="kpi-card"><h3>Total Active Jobs</h3><p>{activeJobs}</p></div>
                <div className="kpi-card"><h3>API Status</h3><p style={{color: '#238636', fontSize: '2rem'}}>Healthy</p></div>
            </div>
        </>
    );
}