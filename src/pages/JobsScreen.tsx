import React from 'react';
import JobCreationScreen from './JobCreationScreen';
import JobDetailScreen from './JobDetailScreen';

// Note: The JobListScreen is no longer the primary view for most roles.
// This component now primarily handles the 'create' and 'detail' views
// which are navigated to from other parts of the application.

export default function JobsScreen({ jobScreenView, selectedJob, onCancelJobAction, onEditJob, onSaveJob, onNavigate, usersData, currentUser }) {
    // For employers, the "Jobs" menu item lands here with 'list' view, which should be the creation screen.
    // For editing, jobScreenView is 'create' from the start.
    const effectiveView = currentUser?.role === 'Employer' && jobScreenView === 'list' ? 'create' : jobScreenView;
    
    // An employer clicking "Create New Job" FAB will also come here with jobScreenView = 'create'.
    if (effectiveView === 'create') {
        const handleSaveAndExit = async (jobData) => {
            const result = await onSaveJob(jobData);
            if (result && result.success) {
                // After creating a job, navigate the user to the job list to see their new posting.
                onNavigate('employer-jobs-list', 'recruitment');
            }
        };
        return <JobCreationScreen 
            onCancelJobAction={onCancelJobAction} 
            jobToEdit={selectedJob} 
            onSaveJob={handleSaveAndExit} 
            usersData={usersData} 
            currentUser={currentUser}
        />;
    }

    if (jobScreenView === 'detail' && selectedJob) {
        return <JobDetailScreen job={selectedJob} onBack={onCancelJobAction} onEdit={onEditJob} />;
    }
    
    // Default fallback, which was the original behavior for 'list' view.
    return (
        <div>
            <h2>Manage Jobs</h2>
            <p>Select an action from the dashboard or sidebar.</p>
        </div>
    );
}