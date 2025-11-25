import React, { useState } from 'react';

export default function AddCandidateScreen({ onSave, onCancel, jobs = [] }) {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [tags, setTags] = useState('');
    const [jobId, setJobId] = useState(jobs[0]?.id || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name || !role || !jobId) {
            alert('Please fill out Name, Role, and select a Job.');
            return;
        }
        const newCandidate = {
            name,
            role,
            jobId: parseInt(jobId, 10),
            tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        };
        onSave(newCandidate);
    };

    return (
        <>
            <header className="page-header">
                <h1>Add New Candidate</h1>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit}>Save Candidate</button>
                </div>
            </header>
            <div className="settings-container">
                <div className="settings-section">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="job-select">Associate with Job</label>
                            <select id="job-select" value={jobId} onChange={(e) => setJobId(e.target.value)} required>
                                <option value="" disabled>Select a job...</option>
                                {jobs.map(job => (
                                    <option key={job.id} value={job.id}>{job.title}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="full-name">Full Name</label>
                            <input 
                                type="text" 
                                id="full-name" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                placeholder="e.g., Jane Doe"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="role">Role / Position Applied For</label>
                            <input 
                                type="text" 
                                id="role" 
                                value={role} 
                                onChange={(e) => setRole(e.target.value)}
                                placeholder="e.g., Senior Backend Engineer"
                                required
                            />
                        </div>
                        <div className="form-group full-width">
                            <label htmlFor="tags">Tags (comma-separated)</label>
                            <input 
                                type="text"
                                id="tags"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                placeholder="e.g., Java, Python, AWS"
                            />
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}