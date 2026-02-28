import React, { useState } from 'react';
import { ChevronLeftIcon } from '../components/Icons';

export default function JobApplicationScreen({ selectedJob: job, currentUser: user, onApplyForJob, onNavigate }) {
    // Basic Info
    const [name, setName] = useState(user.name || '');
    const [mobile, setMobile] = useState(user.mobile || '');
    const [city, setCity] = useState(user.city || '');
    const [state, setState] = useState(user.state || '');
    const [linkedin, setLinkedin] = useState(user.linkedin_url || '');
    const [auth, setAuth] = useState(user.work_authorization || '');
    const [source, setSource] = useState('');
    const [noticePeriod, setNoticePeriod] = useState(user.notice_period || 'Immediate');
    const [dob, setDob] = useState('');

    // Application-specific
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [submitError, setSubmitError] = useState('');

    if (!job) {
        return (
            <div className="page-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <h2>Job not found</h2>
                <p style={{ color: 'var(--color-text-muted)' }}>The job you are trying to apply for could not be found. It may have been closed.</p>
                <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => onNavigate('find-jobs', 'find-jobs')}>Back to Jobs</button>
            </div>
        );
    }

    const handleCancel = () => {
        onNavigate('find-jobs', 'find-jobs');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Manual validation since button is outside form
        const missingFields = [];
        if (!name.trim()) missingFields.push('Full Name');
        if (!mobile.trim()) missingFields.push('Mobile Number');
        if (!city.trim()) missingFields.push('City');
        if (!state.trim()) missingFields.push('State');
        if (!dob) missingFields.push('Date of Birth');
        if (!auth) missingFields.push('Work Authorization');
        if (!source) missingFields.push('Source');

        if (missingFields.length > 0) {
            setSubmitError(`Please fill in all required fields: ${missingFields.join(', ')}`);
            return;
        }

        setIsLoading(true);
        setSubmitError('');

        const profileData = {
            name,
            summary,
            mobile: mobile,
            city,
            state,
            linkedin_url: linkedin,
            work_authorization: auth,
            source,
            notice_period: noticePeriod,
            dob,
        };

        const result = await onApplyForJob(job, profileData);
        if (result && result.success) {
            if (job.screening_enabled || (job.title && job.title.includes('(Demo)'))) {
                const applicationId = result.applicationId || result.data?.id;
                if (applicationId) {
                    onNavigate('pre-interview-assessment', 'dashboard', { candidateId: applicationId, applicationId: applicationId });
                } else {
                    onNavigate('dashboard', 'dashboard');
                }
            } else {
                onNavigate('dashboard', 'dashboard');
            }
        } else {
            setIsLoading(false);
            setSubmitError(result?.error || 'There was an error submitting your application. Please try again.');
        }
    };

    return (
        <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <button
                    className="btn btn-ghost"
                    onClick={handleCancel}
                    style={{ paddingLeft: 0, color: 'var(--color-text-muted)' }}
                >
                    <ChevronLeftIcon style={{ width: '16px', marginRight: '0.5rem' }} /> Back to Jobs
                </button>
            </div>

            <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Apply for {job.title}</h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>
                    at <strong style={{ color: 'var(--color-primary)' }}>{job.employer}</strong>
                </p>
            </header>

            {submitError && (
                <div style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    color: '#b91c1c',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    ⚠️ {submitError}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-lg)',
                padding: '2.5rem',
                border: '1px solid var(--color-border)'
            }}>
                <div style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', color: 'var(--color-text-main)' }}>Personal Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="form-label">Full Name*</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex. John Doe" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date of Birth*</label>
                            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mobile Number*</label>
                            <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} required placeholder="+1 (555) 000-0000" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input type="email" value={user.email || ''} disabled style={{ background: 'var(--slate-100)', color: 'var(--slate-500)', cursor: 'not-allowed' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">City*</label>
                            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">State*</label>
                            <input type="text" value={state} onChange={(e) => setState(e.target.value)} required />
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', color: 'var(--color-text-main)' }}>Professional Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="form-label">Work Authorization*</label>
                            <select value={auth} onChange={(e) => setAuth(e.target.value)} required>
                                <option value="" disabled>Select Status...</option>
                                <option>US Citizen</option>
                                <option>Green Card Holder</option>
                                <option>Have H1 Visa</option>
                                <option>Need H1 Visa</option>
                                <option>Employment Auth. Document</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notice Period*</label>
                            <select value={noticePeriod} onChange={(e) => setNoticePeriod(e.target.value)} required>
                                <option value="Immediate">Immediate</option>
                                <option value="15 Days">15 Days</option>
                                <option value="30 Days">30 Days</option>
                                <option value="60 Days">60 Days</option>
                                <option value="90 Days">90 Days</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Source*</label>
                            <select value={source} onChange={(e) => setSource(e.target.value)} required>
                                <option value="" disabled>How did you hear about us?</option>
                                <option>LinkedIn</option>
                                <option>Dice</option>
                                <option>Indeed</option>
                                <option>Company Website</option>
                                <option>Referral</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">LinkedIn Profile URL</label>
                            <input type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/username" />
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', color: 'var(--color-text-main)' }}>Summary & Cover Letter</h3>
                    <div className="form-group">
                        <textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder="Briefly describe why you're a good fit for this role. Mention key projects or skills relevant to the job description."
                            style={{ minHeight: '150px', resize: 'vertical' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={handleCancel}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isLoading}
                        style={{ minWidth: '150px' }}
                    >
                        {isLoading ? 'Submitting Application...' : 'Submit Application'}
                    </button>
                </div>
            </form>
        </div>
    );
}