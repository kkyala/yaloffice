import React, { useMemo } from 'react';
import JobListScreen from './JobListScreen';

export default function EmployerJobsListScreen({ jobsData, currentUser, onCreateNewJob, onEditJob, onPublishJob }) {
    // Filter the jobs to only show those created by the current employer.
    const employerJobs = useMemo(() => {
        if (!jobsData || !currentUser?.name) {
            return [];
        }
        return jobsData.filter(job => job.employer === currentUser.name);
    }, [jobsData, currentUser]);

    // If there are no jobs for this employer, show a specific message and call to action.
    if (employerJobs.length === 0) {
        return (
            <>
                <header className="page-header">
                    <h1>Job Postings</h1>
                    <div className="header-actions">
                        <button className="btn btn-primary" onClick={onCreateNewJob}>Create New Job</button>
                    </div>
                </header>
                <div className="table-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flexDirection: 'column', minHeight: '300px' }}>
                    <div>
                        <h2 style={{fontSize: '1.25rem', marginTop: 0}}>You haven't posted any jobs yet.</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '400px' }}>
                            Get started by creating your first job posting to attract top talent.
                        </p>
                        <button className="btn btn-primary" onClick={onCreateNewJob}>
                            Create Your First Job
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <JobListScreen 
            jobsData={employerJobs}
            onCreateNew={onCreateNewJob}
            onEditJob={onEditJob}
            onPublishJob={onPublishJob}
            showEmployerColumn={false}
        />
    );
}