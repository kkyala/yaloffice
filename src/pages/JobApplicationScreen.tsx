import React, { useState } from 'react';

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
    const [dob, setDob] = useState(''); // NEW: Date of Birth to match schema

    // Application-specific
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [submitError, setSubmitError] = useState('');

    if (!job) {
        return (
            <div className="page-content">
                <h2>Job not found</h2>
                <p>The job you are trying to apply for could not be found. It may have been closed.</p>
                <button className="btn btn-secondary" onClick={() => onNavigate('find-jobs', 'find-jobs')}>Back to Jobs</button>
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
            if (job.screening_enabled) {
                // Redirect to screening if required
                // Assuming result.applicationId or result.data.id is available
                const applicationId = result.applicationId || result.data?.id;
                if (applicationId) {
                    onNavigate('pre-interview-assessment', 'dashboard', { candidateId: applicationId, applicationId: applicationId });
                } else {
                    // Fallback if ID missing
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

    const compactInputStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.5rem 0.75rem',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        background: '#f8fafc',
        fontSize: '0.85rem',
        transition: 'border-color 0.2s',
        outline: 'none',
    };

    return (
        <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', maxWidth: '1400px', margin: '0 auto' }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid #f1f5f9',
                flexShrink: 0
            }}>
                <div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.2rem', lineHeight: '1.2' }}>Apply for {job.title}</h1>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                        Position at <strong style={{ color: '#334155' }}>{job.employer}</strong> &bull; Complete your profile
                    </p>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        type="button"
                        className="btn"
                        onClick={handleCancel}
                        disabled={isLoading}
                        style={{
                            background: 'white',
                            border: '1px solid #cbd5e1',
                            color: '#475569',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        style={{
                            background: 'var(--primary-color)',
                            border: 'none',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            boxShadow: '0 2px 4px rgba(231, 76, 60, 0.2)',
                            cursor: 'pointer'
                        }}
                    >
                        {isLoading ? 'Submitting...' : 'Submit'}
                    </button>
                </div>
            </header>

            <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {submitError && (
                    <div style={{
                        marginBottom: '0.5rem',
                        padding: '0.5rem 1rem',
                        background: '#fef2f2',
                        borderLeft: '3px solid #ef4444',
                        color: '#b91c1c',
                        borderRadius: '4px',
                        fontWeight: '500',
                        fontSize: '0.85rem'
                    }}>
                        {submitError}
                    </div>
                )}

                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    overflowY: 'auto',
                    gap: '1rem'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                        {/* Row 1 */}
                        <div className="form-group">
                            <label htmlFor="applicant-name" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>Full Name*</label>
                            <input id="applicant-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required style={compactInputStyle} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="applicant-mobile" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>Mobile Number*</label>
                            <input id="applicant-mobile" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} required style={compactInputStyle} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="applicant-city" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>City*</label>
                            <input id="applicant-city" type="text" value={city} onChange={(e) => setCity(e.target.value)} required style={compactInputStyle} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="applicant-state" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>State*</label>
                            <input id="applicant-state" type="text" value={state} onChange={(e) => setState(e.target.value)} required style={compactInputStyle} />
                        </div>

                        {/* Row 2 */}
                        <div className="form-group">
                            <label htmlFor="applicant-dob" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>Date of Birth*</label>
                            <input id="applicant-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required style={compactInputStyle} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="applicant-auth" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>Work Authorization*</label>
                            <select id="applicant-auth" value={auth} onChange={(e) => setAuth(e.target.value)} required style={compactInputStyle}>
                                <option value="" disabled>Select...</option>
                                <option>US Citizen</option>
                                <option>Green Card Holder</option>
                                <option>Have H1 Visa</option>
                                <option>Need H1 Visa</option>
                                <option>Employment Auth. Document</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="applicant-source" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>Source*</label>
                            <select id="applicant-source" value={source} onChange={(e) => setSource(e.target.value)} required style={compactInputStyle}>
                                <option value="" disabled>Source?</option>
                                <option>LinkedIn</option>
                                <option>Dice</option>
                                <option>Indeed</option>
                                <option>Company Website</option>
                                <option>Referral</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="applicant-notice-period" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>Notice Period*</label>
                            <select id="applicant-notice-period" value={noticePeriod} onChange={(e) => setNoticePeriod(e.target.value)} required style={compactInputStyle}>
                                <option value="Immediate">Immediate</option>
                                <option value="15 Days">15 Days</option>
                                <option value="30 Days">30 Days</option>
                                <option value="60 Days">60 Days</option>
                                <option value="90 Days">90 Days</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="applicant-linkedin" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>LinkedIn Profile URL</label>
                            <input id="applicant-linkedin" type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/..." style={compactInputStyle} />
                        </div>
                    </div>

                    {/* Resume Summary - Fills remaining space */}
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100px' }}>
                        <label htmlFor="applicant-summary" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>Resume Summary / Cover Letter</label>
                        <textarea
                            id="applicant-summary"
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder="Briefly describe why you're a good fit for this role..."
                            style={{ ...compactInputStyle, height: '100%', resize: 'none' }}
                        />
                    </div>
                </div>
            </form >
        </div >
    );
}