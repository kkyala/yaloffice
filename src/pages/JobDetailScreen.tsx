import React from 'react';
import { ChevronLeftIcon, BriefcaseIcon, MapPinIcon, DollarSignIcon } from '../components/Icons';

export default function JobDetailScreen({ job, onBack, onEdit }) {
    if (!job) {
        return (
            <div className="page-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <h2>Job not found</h2>
                <p style={{ color: 'var(--color-text-muted)' }}>The selected job could not be found.</p>
                <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={onBack}>Back to List</button>
            </div>
        );
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
    }

    return (
        <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                    className="btn btn-ghost"
                    onClick={onBack}
                    style={{ paddingLeft: 0, color: 'var(--color-text-muted)' }}
                >
                    <ChevronLeftIcon style={{ width: '16px', marginRight: '0.5rem' }} /> Back to Jobs
                </button>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-primary" onClick={() => onEdit(job)}>Edit Job</button>
                </div>
            </div>

            <header style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0, color: 'var(--color-text-main)' }}>{job.title}</h1>
                    <span className={`status-badge status-${job.status.toLowerCase().replace(' ', '-')}`} style={{
                        fontSize: '0.85rem', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontWeight: '600',
                        background: job.status === 'Active' ? 'var(--success-50)' : 'var(--slate-100)',
                        color: job.status === 'Active' ? 'var(--status-success)' : 'var(--color-text-main)'
                    }}>
                        {job.status}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BriefcaseIcon style={{ width: '16px' }} /> {job.employer}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPinIcon style={{ width: '16px' }} /> {job.location}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><DollarSignIcon style={{ width: '16px' }} /> {formatCurrency(job.salaryMin)} - {formatCurrency(job.salaryMax)}</span>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: '2rem' }}>
                {/* Main Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '2rem',
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid var(--color-border)'
                    }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--color-text-main)' }}>Job Description</h3>
                        <div className="markdown-content" style={{ lineHeight: '1.6', color: 'var(--color-text-main)' }}>
                            <p>{job.description}</p>
                        </div>
                    </div>

                    <div style={{
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '2rem',
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid var(--color-border)'
                    }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--color-text-main)' }}>Required Qualifications</h3>
                        <div className="markdown-content" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--color-text-main)' }}>
                            {job.qualifications}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '1.5rem',
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid var(--color-border)'
                    }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--color-text-main)' }}>Required Skills</h4>
                        <div className="skills-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {job.skills?.map(skill => (
                                <div key={skill} className="tag" style={{
                                    background: 'var(--primary-50)',
                                    color: 'var(--color-primary)',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.85rem',
                                    fontWeight: '500'
                                }}>{skill}</div>
                            ))}
                        </div>
                    </div>

                    <div style={{
                        background: 'var(--slate-50)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '1.5rem',
                        border: '1px solid var(--slate-200)'
                    }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Internal ID</h4>
                        <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--color-text-main)' }}>
                            {job.title.replace(/\s+/g, '-').toLowerCase()}-{job.employer ? job.employer.substring(0, 3).toLowerCase() : 'unk'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}