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
        if (!dob) {
            setSubmitError('Date of Birth is a required field.');
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

    return (
        <>
            <header className="page-header">
                <h1>Apply for {job.title}</h1>
                <div className="header-actions">
                    <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={isLoading}>Cancel</button>
                    <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? 'Submitting...' : 'Submit Application'}
                    </button>
                </div>
            </header>
            <form onSubmit={handleSubmit}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Please complete your profile to apply for the <strong>{job.title}</strong> position at <strong>{job.employer}</strong>. This information will be saved for future applications.
                </p>

                {submitError && <div className="login-error" style={{ marginBottom: '1.5rem' }}>{submitError}</div>}

                <fieldset disabled={isLoading}>
                    <div className="form-grid-2-col">
                        <div className="form-group"><label htmlFor="applicant-name">Full Name*</label><input id="applicant-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required /></div>
                        <div className="form-group"><label htmlFor="applicant-mobile">Mobile Number*</label><input id="applicant-mobile" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} required /></div>
                        <div className="form-group"><label htmlFor="applicant-city">City*</label><input id="applicant-city" type="text" value={city} onChange={(e) => setCity(e.target.value)} required /></div>
                        <div className="form-group"><label htmlFor="applicant-state">State*</label><input id="applicant-state" type="text" value={state} onChange={(e) => setState(e.target.value)} required /></div>
                        <div className="form-group"><label htmlFor="applicant-dob">Date of Birth*</label><input id="applicant-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required /></div>
                        <div className="form-group"><label htmlFor="applicant-auth">Work Authorization*</label><select id="applicant-auth" value={auth} onChange={(e) => setAuth(e.target.value)} required><option value="" disabled>Select...</option><option>US Citizen</option><option>Green Card Holder</option><option>Have H1 Visa</option><option>Need H1 Visa</option><option>Employment Auth. Document</option></select></div>
                        <div className="form-group grid-col-span-2"><label htmlFor="applicant-linkedin">LinkedIn Profile URL</label><input id="applicant-linkedin" type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} /></div>
                        <div className="form-group grid-col-span-2"><label htmlFor="applicant-source">Source*</label><select id="applicant-source" value={source} onChange={(e) => setSource(e.target.value)} required><option value="" disabled>How did you hear about us?</option><option>LinkedIn</option><option>Dice</option><option>Indeed</option><option>Company Website</option><option>Referral</option><option>Other</option></select></div>
                    </div>

                    <div className="form-group"><label htmlFor="applicant-summary">Resume Summary / Cover Letter</label><textarea id="applicant-summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} placeholder="Briefly describe why you're a good fit for this role." /></div>
                </fieldset>
            </form>
        </>
    );
}