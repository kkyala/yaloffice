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
    onSaveAssessmentResults: (applicationId: number, assessmentData: object) => Promise<{ success: boolean; error?: string }>;
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
            setError(result.error || 'There was an error submitting your assessment. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '900px', margin: '3rem auto', padding: '0 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-primary)' }}>Pre-Interview Assessment</h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                    Application for <span style={{ color: 'var(--primary-color)', fontWeight: '600' }}>{job.title}</span>
                </p>
            </div>

            <form onSubmit={handleSubmit} style={{ animation: 'fade-in 0.5s ease-out' }}>
                <fieldset disabled={isLoading} style={{ border: 'none', padding: 0, margin: 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2.5rem', marginBottom: '2.5rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="notice-period" style={{ display: 'block', fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>What is your notice period?</label>
                            <div className="select-wrapper">
                                <select
                                    id="notice-period"
                                    value={noticePeriod}
                                    onChange={(e) => setNoticePeriod(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--background-color)', transition: 'border-color 0.2s' }}
                                >
                                    <option value="" disabled>Select option...</option>
                                    <option>Immediately available</option>
                                    <option>2 weeks</option>
                                    <option>1 month</option>
                                    <option>More than 1 month</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="salary-expectation" style={{ display: 'block', fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Annual salary expectation (USD)</label>
                            <input
                                id="salary-expectation"
                                type="text"
                                value={salaryExpectation}
                                onChange={(e) => setSalaryExpectation(e.target.value)}
                                placeholder="e.g. 120,000"
                                required
                                style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--background-color)' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="work-authorization" style={{ display: 'block', fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Work authorization in the US</label>
                            <div className="select-wrapper">
                                <select
                                    id="work-authorization"
                                    value={workAuthorization}
                                    onChange={(e) => setWorkAuthorization(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--background-color)' }}
                                >
                                    <option value="" disabled>Select option...</option>
                                    <option>US Citizen</option>
                                    <option>Green Card Holder</option>
                                    <option>H1-B Visa</option>
                                    <option>Other (requires sponsorship)</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'block', fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Willingness to relocate</label>
                            <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem 0' }}>
                                {['Yes', 'No', 'Maybe'].map((option) => (
                                    <label key={option} style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0.8rem',
                                        borderRadius: '10px',
                                        border: `1px solid ${canRelocate === option ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                        backgroundColor: canRelocate === option ? 'var(--primary-light-color)' : 'transparent',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        fontWeight: canRelocate === option ? '600' : '400',
                                        color: canRelocate === option ? 'var(--primary-dark-color)' : 'var(--text-primary)'
                                    }}>
                                        <input
                                            type="radio"
                                            name="relocate"
                                            value={option}
                                            checked={canRelocate === option}
                                            onChange={(e) => setCanRelocate(e.target.value)}
                                            required
                                            style={{ display: 'none' }}
                                        />
                                        {option}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                        <label htmlFor="interest-reason" style={{ display: 'block', fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Why are you interested in this role?</label>
                        <textarea
                            id="interest-reason"
                            value={interestReason}
                            onChange={(e) => setInterestReason(e.target.value)}
                            rows={6}
                            placeholder="Tell us about your motivation and how your skills align with this position..."
                            required
                            style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--background-color)', resize: 'vertical', lineHeight: '1.6' }}
                        />
                    </div>

                    {error && (
                        <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#b91c1c', marginBottom: '1.5rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ textAlign: 'center' }}>
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                padding: '1rem 3rem',
                                fontSize: '1.1rem',
                                fontWeight: '600',
                                borderRadius: '12px',
                                border: 'none',
                                backgroundColor: 'var(--primary-color)',
                                color: 'white',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                opacity: isLoading ? 0.7 : 1,
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                transition: 'all 0.2s',
                                transform: isLoading ? 'none' : 'translateY(0)'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            {isLoading ? 'Submitting...' : 'Submit Assessment'}
                        </button>
                    </div>
                </fieldset>
            </form>
        </div>
    );
}