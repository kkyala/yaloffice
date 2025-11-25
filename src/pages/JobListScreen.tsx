import React from 'react';

export default function JobListScreen({ jobsData, onEditJob, onPublishJob, onCreateNew, showEmployerColumn = true }) {
    return (
        <>
            <header className="page-header">
                <h1>Job Postings</h1>
                <div className="header-actions"><button className="btn btn-primary" onClick={onCreateNew}>Create New Job</button></div>
            </header>
            <div className="table-container">
                <table className="jobs-table">
                    <thead>
                        <tr>
                            <th>Job Title</th>
                            {showEmployerColumn && <th>Employer</th>}
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobsData.map((job) => (
                            <tr key={job.id}>
                                <td>{job.title}</td>
                                {showEmployerColumn && <td>{job.employer}</td>}
                                <td><span className={`status-badge status-${job.status.toLowerCase().replace(' ', '-')}`}>{job.status}</span></td>
                                <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => onEditJob(job)}>Edit</button>
                                    {job.status === 'Draft' && (
                                        <button className="btn btn-primary btn-sm" onClick={() => onPublishJob(job.id)}>Publish</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}