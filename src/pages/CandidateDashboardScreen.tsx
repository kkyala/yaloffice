
import React, { useMemo, useState, useEffect } from 'react';

import { SearchIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/Icons';

// Define types for props to ensure data consistency
type CandidateApplication = {
    id: number;
    jobId: number;
    user_id: string;
    status: string;
    interview_config?: any;
    // Enriched fields for UI
    jobTitle?: string;
    company?: string;
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

    // Separate scheduled interview applications from others
    const scheduledApps = myApplications.filter(app => {
        const status = app.interview_config?.interviewStatus;
        return status && ['pending', 'assessment_pending', 'assessment_completed', 'started'].includes(status);
    });
    const otherApps = myApplications.filter(app => !scheduledApps.includes(app));
    // Import CSS module for card styling
    // (Assumes src/pages/CandidateDashboardScreen.module.css exists)


    // 2. Filter & Sort
    const processedApplications = useMemo(() => {
        let data = [...myApplications];

        // Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            data = data.filter(app =>
                (app.jobTitle && app.jobTitle.toLowerCase().includes(lowerTerm)) ||
                (app.company && app.company.toLowerCase().includes(lowerTerm)) ||
                app.status.toLowerCase().includes(lowerTerm)
            );
        }

        // Sort
        if (sortConfig.key) {
            data.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof CandidateApplication];
                const bValue = b[sortConfig.key as keyof CandidateApplication];

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

    const handleTakeInterview = (app: CandidateApplication) => {
        onNavigate('interview', 'dashboard', { candidateId: app.id, applicationId: app.id });
    };

    const handleStartAssessment = (app: CandidateApplication) => {
        onNavigate('pre-interview-assessment', 'dashboard', { candidateId: app.id, applicationId: app.id });
    };

    const handleViewReport = (app: CandidateApplication) => {
        onNavigate('interview-report', 'dashboard', { candidateId: app.id, applicationId: app.id });
    };

    const renderActionButton = (app: CandidateApplication) => {
        const interviewStatus = app.interview_config?.interviewStatus;

        if (interviewStatus === 'finished') {
            return (
                <span style={{
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#0284c7',
                    background: '#e0f2fe',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    border: '1px solid #bae6fd'
                }}>
                    In Employer Review
                </span>
            );
        }

        if (interviewStatus === 'assessment_completed' || interviewStatus === 'started') {
            return (
                <button className="btn btn-primary btn-sm" onClick={() => handleTakeInterview(app)}>
                    Continue {app.status === 'Screening' ? 'Screening' : 'Interview'}
                </button>
            );
        }

        // Screening: Allow start if not finished/started (even if setup is pending or missing)
        if (app.status === 'Screening') {
            return (
                <button className="btn btn-primary btn-sm" onClick={() => handleStartAssessment(app)}>
                    Start Screening Interview
                </button>
            );
        }

        // Interviewing: Needs explicit setup
        if (app.status === 'Interviewing') {
            if (interviewStatus === 'assessment_pending' || interviewStatus === 'pending') {
                return (
                    <button className="btn btn-primary btn-sm" onClick={() => handleStartAssessment(app)}>
                        Start Interview
                    </button>
                );
            }
            // If no status, it means awaiting setup
            return <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Awaiting Interview Setup</span>;
        }

        return null;
    };

    // Sorting UI
    const renderSortIcon = (key: string) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    };

    return (
        <>
            {/* Header */}
            <header className="page-header">
                <h1>My Applications</h1>
            </header>

            <div className="table-controls" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="search-bar glass-panel" style={{ position: 'relative', width: '350px', padding: '0', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden' }}>
                    <input
                        type="text"
                        placeholder="Search by job, company, or status..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            paddingLeft: '2.75rem',
                            width: '100%',
                            border: 'none',
                            background: 'transparent',
                            height: '46px'
                        }}
                    />
                    <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-color)' }}>
                        <SearchIcon style={{ width: '18px', height: '18px' }} />
                    </div>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    Showing <strong style={{ color: 'var(--text-primary)' }}>{currentItems.length}</strong> of {processedApplications.length} applications
                </div>
            </div>

            <div className="table-container">
                <table className="jobs-table" style={{ fontSize: '0.9rem' }}>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('jobTitle')} style={{ cursor: 'pointer', userSelect: 'none' }}>Job Title {renderSortIcon('jobTitle')}</th>
                            <th onClick={() => handleSort('company')} style={{ cursor: 'pointer', userSelect: 'none' }}>Company {renderSortIcon('company')}</th>
                            <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>Status {renderSortIcon('status')}</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.length > 0 ? currentItems.map(app => (
                            <tr key={app.id} className="animate-fade-in">
                                <td>
                                    <strong style={{ fontSize: '0.95rem', color: 'var(--primary-dark-color)' }}>{app.jobTitle}</strong>
                                </td>
                                <td>{app.company}</td>
                                <td>
                                    <span className={`status-badge status-${app.status?.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}>
                                        {app.status}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    {renderActionButton(app)}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                                    {searchTerm ? 'No applications match your search.' : 'You have not applied to any jobs yet.'}
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

