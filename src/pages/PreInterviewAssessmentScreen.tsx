import React, { useState } from 'react';
import { ChevronLeftIcon } from '../components/Icons';

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
            <div className="page-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <h2>Assessment Not Found</h2>
                <p style={{ color: 'var(--color-text-muted)' }}>The pre-interview assessment could not be loaded. Please return to your dashboard.</p>
                <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => onNavigate('dashboard', 'dashboard')}>Back to Dashboard</button>
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
            if (job.screening_enabled || (job.title && job.title.includes('(Demo)'))) {
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
        <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Pre-Interview Assessment</h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>
                    Application for <strong style={{ color: 'var(--color-primary)' }}>{job.title}</strong>
                </p>
            </div>

            {error && (
                <div style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    color: '#b91c1c',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: '500',
                    textAlign: 'center'
                }}>
                    ⚠️ {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-lg)',
                padding: '2.5rem',
                border: '1px solid var(--color-border)'
            }}>
                <fieldset disabled={isLoading} style={{ border: 'none', padding: 0, margin: 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
                        <div className="form-group">
                            <label htmlFor="notice-period" className="form-label">What is your notice period?</label>
                            <select
                                id="notice-period"
                                value={noticePeriod}
                                onChange={(e) => setNoticePeriod(e.target.value)}
                                required
                            >
                                <option value="" disabled>Select option...</option>
                                <option>Immediately available</option>
                                <option>2 weeks</option>
                                <option>1 month</option>
                                <option>More than 1 month</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="salary-expectation" className="form-label">Annual salary expectation (USD)</label>
                            <input
                                id="salary-expectation"
                                type="text"
                                value={salaryExpectation}
                                onChange={(e) => setSalaryExpectation(e.target.value)}
                                placeholder="e.g. 120,000"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="work-authorization" className="form-label">Work authorization in the US</label>
                            <select
                                id="work-authorization"
                                value={workAuthorization}
                                onChange={(e) => setWorkAuthorization(e.target.value)}
                                required
                            >
                                <option value="" disabled>Select option...</option>
                                <option>US Citizen</option>
                                <option>Green Card Holder</option>
                                <option>H1-B Visa</option>
                                <option>Other (requires sponsorship)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Willingness to relocate</label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                {['Yes', 'No', 'Maybe'].map((option) => (
                                    <label key={option} style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: `1px solid ${canRelocate === option ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        backgroundColor: canRelocate === option ? 'var(--primary-50)' : 'transparent',
                                        cursor: 'pointer',
                                        transition: 'all var(--duration-fast)',
                                        fontWeight: canRelocate === option ? '600' : '400',
                                        color: canRelocate === option ? 'var(--color-primary)' : 'var(--color-text-main)'
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
                        <label htmlFor="interest-reason" className="form-label">Why are you interested in this role?</label>
                        <textarea
                            id="interest-reason"
                            value={interestReason}
                            onChange={(e) => setInterestReason(e.target.value)}
                            rows={6}
                            placeholder="Tell us about your motivation and how your skills align with this position..."
                            required
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isLoading}
                            style={{
                                padding: '1rem 3rem',
                                fontSize: '1.1rem',
                                width: '100%',
                                maxWidth: '400px'
                            }}
                        >
                            {isLoading ? 'Submitting...' : 'Submit Assessment'}
                        </button>
                    </div>
                </fieldset>
            </form>
        </div>
    );
}