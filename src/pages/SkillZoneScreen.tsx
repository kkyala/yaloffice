import React from 'react';

// Mock data for demonstration purposes
const mockAssessments = [
    { id: 1, name: 'React Hooks Proficiency Test', job: 'Senior Software Engineer', candidatesTaken: 12, avgScore: 88.5, status: 'Active' },
    { id: 2, name: 'AWS Cloud Architecture Challenge', job: 'AWS Cloud Engineer', candidatesTaken: 8, avgScore: 76.2, status: 'Active' },
    { id: 3, name: 'REST API Design Principles', job: 'Senior Software Engineer', candidatesTaken: 0, avgScore: null, status: 'Draft' },
    { id: 4, name: 'Product Management Case Study', job: 'Product Manager', candidatesTaken: 5, avgScore: 91.0, status: 'Closed' },
];

export default function SkillZoneScreen() {
    const handleCreateAssessment = () => {
        alert('This feature will allow you to create new skill assessments for your jobs.');
    };

    const handleViewResults = (assessmentName: string) => {
        alert(`This will show the detailed results for the "${assessmentName}" assessment.`);
    };

    return (
        <>
            <header className="page-header">
                <h1>Skill Zone</h1>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={handleCreateAssessment}>
                        Create New Assessment
                    </button>
                </div>
            </header>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Create, manage, and review skill assessments to evaluate candidate proficiency for your job openings.
            </p>
            <div className="table-container">
                <table className="jobs-table">
                    <thead>
                        <tr>
                            <th>Assessment Name</th>
                            <th>Associated Job</th>
                            <th>Candidates Assessed</th>
                            <th>Average Score</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockAssessments.length > 0 ? mockAssessments.map(assessment => (
                            <tr key={assessment.id}>
                                <td><strong>{assessment.name}</strong></td>
                                <td>{assessment.job}</td>
                                <td>{assessment.candidatesTaken}</td>
                                <td>{assessment.avgScore ? `${assessment.avgScore.toFixed(1)}%` : 'N/A'}</td>
                                <td>
                                    <span className={`status-badge status-${assessment.status.toLowerCase()}`}>
                                        {assessment.status}
                                    </span>
                                </td>
                                <td className="actions-cell">
                                    <button 
                                        className="btn btn-secondary btn-sm" 
                                        onClick={() => handleViewResults(assessment.name)}
                                        disabled={assessment.candidatesTaken === 0}
                                    >
                                        View Results
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                                    No skill assessments have been created yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}