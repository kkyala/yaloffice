
import React, { useMemo, useState, useEffect } from 'react';
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/Icons';

// Define types for props to ensure data consistency
type CandidateApplication = {
    id: number;
    jobId: number;
    user_id: string;
    status: string;
    interview_config?: any;
};

type Job = {
    id: number;
    title: string;
    employer: string;
};

type User = {
    id: string;
    name: string;
};

type CandidateDashboardScreenProps = {
    candidatesData: CandidateApplication[];
    jobsData: Job[];
    currentUser: User;
    onNavigate: (page: string, parent: string, context?: { candidateId?: number, applicationId?: number }) => void;
};

const ITEMS_PER_PAGE = 10;

export default function CandidateDashboardScreen({ candidatesData = [], jobsData = [], currentUser, onNavigate }: CandidateDashboardScreenProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'id', direction: 'desc' });

    // 1. Data Enrichment
    const myApplications = useMemo(() => {
        if (!currentUser || !candidatesData || !jobsData) {
            return [];
        }

        const jobsMap = new Map(jobsData.map(j => [j.id, j]));
        const userApps = candidatesData.filter(app => app.user_id === currentUser.id);

        return userApps
            .map(app => {
                const job = jobsMap.get(app.jobId);
                return {
                    ...app,
                    jobTitle: job?.title || 'Unknown Job',
                    company: job?.employer || 'Unknown Company',
                };
            });
    }, [candidatesData, jobsData, currentUser]);

    // 2. Filter & Sort
    const processedApplications = useMemo(() => {
        let data = [...myApplications];

        // Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            data = data.filter(app => 
                app.jobTitle.toLowerCase().includes(lowerTerm) || 
                app.company.toLowerCase().includes(lowerTerm) ||
                app.status.toLowerCase().includes(lowerTerm)
            );
        }

        // Sort
        if (sortConfig.key) {
            data.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return data;
    }, [myApplications, searchTerm, sortConfig]);

    // Reset pagination when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // 3. Pagination
    const totalPages = Math.ceil(processedApplications.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentItems = processedApplications.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Handlers
    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleTakeInterview = (app: any) => {
        onNavigate('interview', 'dashboard', { candidateId: app.id, applicationId: app.id });
    };
    
    const handleStartAssessment = (app: any) => {
        onNavigate('pre-interview-assessment', 'dashboard', { candidateId: app.id, applicationId: app.id });
    };
    
    const handleViewReport = (app: any) => {
        onNavigate('interview-report', 'dashboard', { candidateId: app.id, applicationId: app.id });
    };

    const renderActionButton = (app: any) => {
        if (!['Applied', 'Sourced', 'Screening', 'Interviewing'].includes(app.status)) {
            return null;
        }

        const interviewStatus = app.interview_config?.interviewStatus;
        
        if (app.status === 'Screening' && !interviewStatus) {
            return <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Awaiting Interview Setup</span>;
        }

        if (interviewStatus === 'assessment_pending' || interviewStatus === 'pending') {
            return (
                <button className="btn btn-primary btn-sm" onClick={() => handleStartAssessment(app)}>
                    Start Pre-Interview Assessment
                </button>
            );
        }
        
        if (interviewStatus === 'assessment_completed') {
            return (
                <button className="btn btn-primary btn-sm" onClick={() => handleTakeInterview(app)}>
                    Start AI Interview
                </button>
            );
        }

        if (interviewStatus === 'started') {
            return (
                <button className="btn btn-primary btn-sm" onClick={() => handleTakeInterview(app)}>
                    Continue Interview
                </button>
            );
        }
        
        if (interviewStatus === 'finished') {
            return (
                <button className="btn btn-secondary btn-sm" onClick={() => handleViewReport(app)}>
                    View Report
                </button>
            );
        }
        
        return null;
    };

    const renderSortIcon = (key: string) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    };

    return (
        <>
            <header className="page-header">
                <h1>My Applications</h1>
            </header>

            <div className="table-controls" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="search-bar" style={{ position: 'relative', width: '300px' }}>
                    <input 
                        type="text" 
                        placeholder="Search by job or company..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '2.5rem', width: '100%' }}
                    />
                    <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                        <SearchIcon style={{ width: '16px', height: '16px' }} />
                    </div>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Showing {currentItems.length} of {processedApplications.length} applications
                </div>
            </div>

            <div className="table-container">
                <table className="jobs-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('jobTitle')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                Job Title {renderSortIcon('jobTitle')}
                            </th>
                            <th onClick={() => handleSort('company')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                Company {renderSortIcon('company')}
                            </th>
                            <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                Status {renderSortIcon('status')}
                            </th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.length > 0 ? currentItems.map(app => (
                            <tr key={app.id}>
                                <td>{app.jobTitle}</td>
                                <td>{app.company}</td>
                                <td>
                                    <span className={`status-badge status-${app.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                        {app.status}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    {renderActionButton(app)}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem' }}>
                                    {searchTerm ? 'No applications match your search.' : 'You have not applied for any jobs yet. Visit the "Find Jobs" page to get started.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                
                {totalPages > 1 && (
                    <div className="pagination-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                        <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeftIcon style={{ width: '16px', height: '16px' }} /> Previous
                        </button>
                        <span style={{ fontSize: '0.9rem' }}>Page {currentPage} of {totalPages}</span>
                        <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next <ChevronRightIcon style={{ width: '16px', height: '16px' }} />
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
