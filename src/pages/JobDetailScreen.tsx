import React from 'react';

export default function JobDetailScreen({ job, onBack, onEdit }) {
    if (!job) {
        return (
            <div className="form-panel">
                <h2>Job not found</h2>
                <p>The selected job could not be found. It might have been removed.</p>
                <br/>
                <button className="btn btn-secondary" onClick={onBack}>Back to List</button>
            </div>
        );
    }
    
    // Helper to format salary
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
    }

    return (
        <>
            <header className="page-header">
                <h1>{job.title}</h1>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={onBack}>Back to List</button>
                    <button className="btn btn-primary" onClick={() => onEdit(job)}>Edit Job</button>
                </div>
            </header>
            <div className="job-posting-grid">
                <div className="form-panel">
                    <div className="job-detail-section">
                        <h4>Job Location</h4>
                        <p>{job.location}</p>
                    </div>
                    <div className="job-detail-section">
                        <h4>Salary Range</h4>
                        <p>{formatCurrency(job.salaryMin)} - {formatCurrency(job.salaryMax)}</p>
                    </div>
                    <div className="job-detail-section">
                        <h4>Job Description</h4>
                        <div className="markdown-content">
                           <p>{job.description}</p>
                        </div>
                    </div>
                     <div className="job-detail-section">
                        <h4>Required Qualifications</h4>
                        <div className="markdown-content" style={{whiteSpace: 'pre-wrap'}}>
                           {job.qualifications}
                        </div>
                    </div>
                </div>
                <div className="form-panel">
                     <div className="job-detail-section">
                        <h4>Required Skills</h4>
                        <div className="skills-tags">
                            {job.skills?.map(skill => (
                                <div key={skill} className="tag">{skill}</div>
                            ))}
                        </div>
                    </div>
                     <div className="job-detail-section">
                        <h4>Status</h4>
                        <p>
                            <span className={`status-badge status-${job.status.toLowerCase().replace(' ', '-')}`}>
                                {job.status}
                            </span>
                        </p>
                    </div>
                     <div className="job-detail-section">
                        <h4>Internal ID</h4>
                        <p>{job.title.replace(/\s+/g, '-').toLowerCase()}-{job.employer.substring(0,3).toLowerCase()}</p>
                    </div>
                </div>
            </div>
        </>
    );
}