import React from 'react';
import JobListScreen from './JobListScreen';

// This screen is specifically for Agents to view and manage all job listings.
// It differs from the Employer's view by not filtering jobs by the current user.
export default function AgentJobsListScreen({ jobsData, onCreateNewJob, onEditJob, onPublishJob }) {
    return (
        <JobListScreen 
            jobsData={jobsData}
            onCreateNew={onCreateNewJob}
            onEditJob={onEditJob}
            onPublishJob={onPublishJob}
            showEmployerColumn={true}
        />
    );
}