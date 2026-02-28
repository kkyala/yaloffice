
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const AdminDashboardScreen = ({ currentUser, onNavigate }) => {
    const [stats, setStats] = useState({
        users: 0,
        jobs: 0,
        candidates: 0,
        interviews: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                // Fetch counts - simple parallel fetch
                const [users, jobs, candidates] = await Promise.all([
                    api.get('/users').then(r => r.data?.length || 0),
                    api.get('/jobs').then(r => r.data?.length || 0),
                    api.get('/candidates').then(r => r.data?.length || 0)
                ]);
                setStats({ users, jobs, candidates, interviews: 0 }); // Interviews count logic needed
            } catch (err) {
                console.error("Failed to fetch admin stats", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const Widget = ({ title, count, color, icon, onClick }) => (
        <div
            onClick={onClick}
            style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                borderLeft: `4px solid ${color}`
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'none'}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{title}</h3>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a' }}>{loading ? '...' : count}</div>
                </div>
                <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: `${color}20`, color: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem'
                }}>
                    {icon}
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ padding: '2rem' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Admin Dashboard</h1>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>System Overview and Configuration</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <Widget title="Total Users" count={stats.users} color="#3b82f6" icon="👥" onClick={() => onNavigate('users', 'dashboard')} />
                <Widget title="Active Jobs" count={stats.jobs} color="#10b981" icon="💼" onClick={() => onNavigate('jobs', 'dashboard')} />
                <Widget title="Candidates" count={stats.candidates} color="#f59e0b" icon="📄" onClick={() => onNavigate('recruitment-pipeline', 'dashboard')} />
                <Widget title="System Config" count="⚙️" color="#6366f1" icon="🔧" onClick={() => onNavigate('settings', 'settings')} />
            </div>

            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem' }}>Quick Actions</h2>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => onNavigate('settings', 'settings')}
                        style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
                    >
                        Manage Environment Keys
                    </button>
                    <button
                        onClick={() => onNavigate('users', 'users')}
                        style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
                    >
                        Manage Users
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardScreen;