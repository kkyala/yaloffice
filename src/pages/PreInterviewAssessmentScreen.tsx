import React, { useState } from 'react';

// Types to match App.tsx props
type Candidate = {
    id: number;
    name: string;
    jobId: number;
};
type Job = {
    id: number;
    title: string;
    screening_enabled?: boolean;
};
type PreInterviewAssessmentScreenProps = {
    interviewingCandidate: Candidate | null;
    currentApplicationId: number | null;
    jobsData: Job[];
    onSaveAssessmentResults: (applicationId: number, assessmentData: object) => Promise<{ success: boolean }>;
    onNavigate: (page: string, parent: string) => void;
};

export default function PreInterviewAssessmentScreen({
    interviewingCandidate,
    currentApplicationId,
    jobsData,
    onSaveAssessmentResults,
    onNavigate,
}: PreInterviewAssessmentScreenProps) {
    const [noticePeriod, setNoticePeriod] = useState('');
    const [salaryExpectation, setSalaryExpectation] = useState('');
    const [workAuthorization, setWorkAuthorization] = useState('');
    const [canRelocate, setCanRelocate] = useState('');
    const [interestReason, setInterestReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const job = interviewingCandidate ? jobsData.find(j => j.id === interviewingCandidate.jobId) : null;

    if (!interviewingCandidate || !job) {
        return (
            <div className="page-content">
                <h2>Assessment Not Found</h2>
                <p>The pre-interview assessment could not be loaded. Please return to your dashboard.</p>
                <button className="btn btn-secondary" onClick={() => onNavigate('dashboard', 'dashboard')}>Back to Dashboard</button>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noticePeriod || !salaryExpectation || !workAuthorization || !canRelocate || !interestReason) {
            setError('Please answer all questions before submitting.');
            return;
        }
        if (!currentApplicationId) {
            setError('Could not identify the application. Please go back and try again.');
            return;
        }
        setIsLoading(true);
        setError('');

        const assessmentData = {
            'Notice Period': noticePeriod,
            'Salary Expectation': salaryExpectation,
            'Work Authorization': workAuthorization,
            'Willing to Relocate': canRelocate,
            'Reason for Interest': interestReason,
        };

        const result = await onSaveAssessmentResults(currentApplicationId, assessmentData);
        if (result.success) {
            // Check if job requires AI screening
            // Note: job object is available in scope
            if (job.screening_enabled) {
                // Redirect to AI Screening Session
                onNavigate('screening-session', 'dashboard');
            } else {
                onNavigate('dashboard', 'dashboard');
            }
        } else {
            setError('There was an error submitting your assessment. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <>
            <header className="page-header">
                <h1>Pre-Interview Assessment</h1>
            </header>
            <div className="form-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '1.25rem' }}>For: {job.title}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    Please complete this short questionnaire before your AI interview. Your answers will help us understand your profile better.
                </p>

                <form onSubmit={handleSubmit}>
                    <fieldset disabled={isLoading}>
                        <div className="form-group">
                            <label htmlFor="notice-period">What is your notice period?</label>
                            <select id="notice-period" value={noticePeriod} onChange={(e) => setNoticePeriod(e.target.value)} required>
                                <option value="" disabled>Select...</option>
                                <option>Immediately available</option>
                                <option>2 weeks</option>
                                <option>1 month</option>
                                <option>More than 1 month</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="salary-expectation">What is your annual salary expectation (USD)?</label>
                            <input id="salary-expectation" type="text" value={salaryExpectation} onChange={(e) => setSalaryExpectation(e.target.value)} placeholder="e.g., $120,000" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="work-authorization">What is your work authorization in the US?</label>
                            <select id="work-authorization" value={workAuthorization} onChange={(e) => setWorkAuthorization(e.target.value)} required>
                                <option value="" disabled>Select...</option>
                                <option>US Citizen</option>
                                <option>Green Card Holder</option>
                                <option>H1-B Visa</option>
                                <option>Other (requires sponsorship)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Are you willing to relocate for this position?</label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <label><input type="radio" name="relocate" value="Yes" checked={canRelocate === 'Yes'} onChange={(e) => setCanRelocate(e.target.value)} required /> Yes</label>
                                <label><input type="radio" name="relocate" value="No" checked={canRelocate === 'No'} onChange={(e) => setCanRelocate(e.target.value)} /> No</label>
                                <label><input type="radio" name="relocate" value="Maybe" checked={canRelocate === 'Maybe'} onChange={(e) => setCanRelocate(e.target.value)} /> Maybe / Open to discussion</label>
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="interest-reason">Why are you interested in this role?</label>
                            <textarea id="interest-reason" value={interestReason} onChange={(e) => setInterestReason(e.target.value)} rows={5} placeholder="Briefly describe your motivation..." required />
                        </div>

                        {error && <p className="login-error" style={{ marginBottom: '1rem' }}>{error}</p>}

                        <div style={{ textAlign: 'right', marginTop: '1.5rem' }}>
                            <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
                                {isLoading ? 'Submitting...' : 'Submit Assessment'}
                            </button>
                        </div>
                    </fieldset>
                </form>
            </div>
        </>
    );
}