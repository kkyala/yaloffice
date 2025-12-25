import React from 'react';
import { UsersIcon, BuildingIcon, BriefcaseIcon, CheckCircleIcon, CheckCircleIcon as ClockIcon } from '../components/Icons'; // Assuming generic icons are available

// Metric Card Component
const MetricCard = ({ title, value, icon, colorClass }) => (
    <div className="metric-card" style={{
        background: 'white',
        borderRadius: 'var(--border-radius)',
        padding: '1.5rem',
        boxShadow: 'var(--box-shadow)',
        borderLeft: `4px solid ${colorClass}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    }}>
        <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>{title}</h3>
            <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>{value}</p>
        </div>
        <div style={{
            background: 'var(--background-color)',
            padding: '1rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colorClass
        }}>
            {React.cloneElement(icon, { width: 24, height: 24 })}
        </div>
    </div>
);

// Simple CSS Donut Chart
const DonutChart = () => (
    <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto' }}>
        <div style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'conic-gradient(var(--primary-color) 0% 35%, var(--secondary-color) 35% 60%, var(--warning-color) 60% 85%, var(--success-color) 85% 100%)'
        }}></div>
        <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '140px',
            height: '140px',
            background: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
        }}>
            <span style={{ fontSize: '2rem', fontWeight: '700' }}>4</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Departments</span>
        </div>
    </div>
);

// Simple CSS Bar Chart
const BarChart = () => (
    <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        {[60, 80, 45, 90, 70, 50, 85].map((h, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                    width: '100%',
                    height: `${h}%`,
                    background: i % 2 === 0 ? 'var(--primary-color)' : 'var(--secondary-color)',
                    borderRadius: '4px 4px 0 0',
                    opacity: 0.8
                }}></div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Day {i + 1}</span>
            </div>
        ))}
    </div>
);

export default function AdminDashboardScreen({ usersData = [], jobsData = [] }) {
    const totalUsers = usersData.length || 124;
    const activeJobs = jobsData.filter(job => job.status === 'Active').length || 45;
    const activeCompanies = new Set(jobsData.map(job => job.employer)).size || 12;

    return (
        <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Page Header */}
            <header className="page-header" style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Dashboard Overview</h1>
                <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>Welcome to your HR control center.</p>
            </header>

            {/* Metrics Row */}
            <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <MetricCard title="Total Employees" value={totalUsers} icon={<UsersIcon />} colorClass="var(--primary-color)" />
                <MetricCard title="Active Jobs" value={activeJobs} icon={<BriefcaseIcon />} colorClass="var(--secondary-color)" />
                <MetricCard title="Companies" value={activeCompanies} icon={<BuildingIcon />} colorClass="var(--warning-color)" />
                <MetricCard title="Onboarded" value="28" icon={<CheckCircleIcon />} colorClass="var(--success-color)" />
            </div>

            {/* Charts Row */}
            <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>

                {/* Department Chart */}
                <div className="chart-card" style={{ background: 'white', borderRadius: 'var(--border-radius)', padding: '1.5rem', boxShadow: 'var(--box-shadow)' }}>
                    <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: '600' }}>Department Distribution</h3>
                    <DonutChart />
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ width: 10, height: 10, background: 'var(--primary-color)', borderRadius: '50%' }}></span> IT</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ width: 10, height: 10, background: 'var(--secondary-color)', borderRadius: '50%' }}></span> HR</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ width: 10, height: 10, background: 'var(--warning-color)', borderRadius: '50%' }}></span> Sales</div>
                    </div>
                </div>

                {/* Work Hours Chart */}
                <div className="chart-card" style={{ background: 'white', borderRadius: 'var(--border-radius)', padding: '1.5rem', boxShadow: 'var(--box-shadow)' }}>
                    <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: '600' }}>Work Hours (Weekly)</h3>
                    <BarChart />
                </div>
            </div>

            {/* Recent Table Section */}
            <div className="table-section" style={{ background: 'white', borderRadius: 'var(--border-radius)', padding: '1.5rem', boxShadow: 'var(--box-shadow)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Recent Job Applications</h3>
                    <button style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: '600', cursor: 'pointer' }}>View All</button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--background-color)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', borderRadius: '4px 0 0 4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Candidate</th>
                            <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Role</th>
                            <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Date</th>
                            <th style={{ padding: '1rem', borderRadius: '0 4px 4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[1, 2, 3].map(i => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: 32, height: 32, background: '#eee', borderRadius: '50%' }}></div>
                                        <span style={{ fontWeight: '500' }}>Candidate Name {i}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Senior React Developer</td>
                                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Dec 12, 2024</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '999px',
                                        fontSize: '0.75rem',
                                        background: 'rgba(46, 204, 113, 0.1)',
                                        color: 'var(--success-color)',
                                        fontWeight: '600'
                                    }}>Applied</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}