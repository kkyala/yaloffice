import React, { useMemo, useState, useEffect } from 'react';

// Type definitions for props and data objects
type Candidate = {
    id: number;
    jobId: number | null;
    name: string;
    role: string;
    status: string;
    tags?: string[]; // Add tags to store skills
};
type Job = { 
    id: number; 
    title: string;
    employer?: string; // Add employer to job type
};
type AllCandidatesScreenProps = {
    candidatesData: Candidate[];
    jobsData: Job[];
    currentUser: any; // Add currentUser for role-based filtering
    onRemoveCandidateFromPipeline: (candidateId: number) => void;
    onDeleteCandidate: (candidateId: number) => Promise<{ success: boolean; error?: string }>;
};

const ITEMS_PER_PAGE = 15;

export default function AllCandidatesScreen({ candidatesData = [], jobsData = [], currentUser, onRemoveCandidateFromPipeline, onDeleteCandidate }: AllCandidatesScreenProps) {
    const [filterName, setFilterName] = useState('');
    const [filterJobId, setFilterJobId] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    
    // Dynamically generate the list of unique statuses from the data
    const candidateStatuses = useMemo(() => {
        const statuses = new Set(candidatesData.map(c => c.status));
        return ['all', ...Array.from(statuses)];
    }, [candidatesData]);

    // For Employers, filter the jobs dropdown to only show their jobs.
    const employerJobs = useMemo(() => {
        if (currentUser.role !== 'Employer') {
            return jobsData;
        }
        return jobsData.filter(job => job.employer === currentUser.name);
    }, [jobsData, currentUser]);
    
    const processedCandidates = useMemo(() => {
        // Get the set of job IDs for the current employer. This is the core of the security fix.
        const employerJobIds = currentUser.role === 'Employer'
            ? new Set(jobsData.filter(job => job.employer === currentUser.name).map(job => job.id))
            : null;

        const jobsMap = new Map(jobsData.map(job => [job.id, job.title]));
        
        const filtered = candidatesData
            .filter(candidate => {
                // If the user is an employer, only show candidates assigned to one of their jobs.
                if (employerJobIds) {
                    if (candidate.jobId === null || !employerJobIds.has(candidate.jobId)) {
                        return false;
                    }
                }

                // Apply the user's selected filters from the UI
                const nameMatch = filterName ? candidate.name.toLowerCase().includes(filterName.toLowerCase()) : true;
                const jobMatch = filterJobId === 'all' ? true : candidate.jobId === parseInt(filterJobId, 10);
                const statusMatch = filterStatus === 'all' ? true : candidate.status === filterStatus;
                return nameMatch && jobMatch && statusMatch;
            });

        return filtered.map(candidate => {
            const effectiveJobId = candidate.jobId;
            return {
                ...candidate,
                jobTitle: effectiveJobId ? jobsMap.get(effectiveJobId) || 'Unknown Job' : 'Not Assigned',
            }
        }).sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by name
    }, [candidatesData, jobsData, filterName, filterJobId, filterStatus, currentUser]);

    // Reset to page 1 whenever filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterName, filterJobId, filterStatus]);

    // Pagination Logic
    const totalPages = Math.ceil(processedCandidates.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedCandidates = processedCandidates.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <>
            <header className="page-header">
                <h1>All Candidates</h1>
                <div className="header-actions" style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                        type="text"
                        className="header-filter"
                        placeholder="Filter by name..."
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                    />
                    <select className="header-filter" value={filterJobId} onChange={(e) => setFilterJobId(e.target.value)}>
                        <option value="all">All Jobs</option>
                        {employerJobs.map(job => (
                            <option key={job.id} value={job.id}>{job.title}</option>
                        ))}
                    </select>
                    <select className="header-filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        {candidateStatuses.map(status => (
                            <option key={status} value={status}>
                                {status === 'all' ? 'All Statuses' : status}
                            </option>
                        ))}
                    </select>
                </div>
            </header>
            <div className="table-container">
                <table className="jobs-table">
                    <thead>
                        <tr>
                            <th>Candidate Name</th>
                            <th>Associated Job</th>
                            <th>Skills</th>
                            <th>Current Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedCandidates.length > 0 ? paginatedCandidates.map((candidate) => (
                            <tr key={candidate.id}>
                                <td>{candidate.name}</td>
                                <td>{candidate.jobTitle}</td>
                                <td>{candidate.tags?.join(', ') || 'N/A'}</td>
                                <td>
                                    <span className={`status-badge status-${candidate.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                        {candidate.status}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                                    No candidates match the current filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                 {totalPages > 1 && (
                    <div className="pagination-controls" style={{marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem'}}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </button>
                        <span>
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}