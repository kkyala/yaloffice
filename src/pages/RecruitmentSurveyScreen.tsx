import React from 'react';

// Mock data for demonstration
const mockSurveys = [
    { id: 1, title: 'Candidate Experience Survey Q3 2024', audience: 'Candidates', submissions: 152, status: 'Active', created: '2024-07-15' },
    { id: 2, title: 'New Hire Onboarding Feedback', audience: 'New Hires', submissions: 25, status: 'Active', created: '2024-07-01' },
    { id: 3, title: 'Exit Interview Questionnaire', audience: 'Departing Employees', submissions: 8, status: 'Closed', created: '2024-05-20' },
    { id: 4, title: 'Hiring Manager Satisfaction Survey', audience: 'Hiring Managers', submissions: 0, status: 'Draft', created: '2024-08-01' },
];

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

export default function RecruitmentSurveyScreen() {
    const handleCreateSurvey = () => {
        alert('This feature will allow you to build custom surveys for candidates and employees.');
    };

    const handleViewResults = (surveyTitle: string) => {
        alert(`This will show the aggregated results for the "${surveyTitle}" survey.`);
    };

    return (
        <>
            <header className="page-header">
                <h1>Recruitment Survey</h1>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={handleCreateSurvey}>
                        Create New Survey
                    </button>
                </div>
            </header>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Gather valuable feedback by creating and managing surveys for candidates, new hires, and hiring managers.
            </p>
            <div className="table-container">
                <table className="jobs-table">
                    <thead>
                        <tr>
                            <th>Survey Title</th>
                            <th>Target Audience</th>
                            <th>Submissions</th>
                            <th>Status</th>
                            <th>Date Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockSurveys.length > 0 ? mockSurveys.map(survey => (
                            <tr key={survey.id}>
                                <td><strong>{survey.title}</strong></td>
                                <td>{survey.audience}</td>
                                <td>{survey.submissions}</td>
                                <td>
                                    <span className={`status-badge status-${survey.status.toLowerCase()}`}>
                                        {survey.status}
                                    </span>
                                </td>
                                <td>{formatDate(survey.created)}</td>
                                <td className="actions-cell">
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleViewResults(survey.title)}
                                        disabled={survey.submissions === 0}
                                    >
                                        View Results
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                                    No surveys have been created yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}