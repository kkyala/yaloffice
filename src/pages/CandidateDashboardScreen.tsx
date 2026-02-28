
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
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
            {/* Header */}
            <header className="page-header" style={{ marginBottom: '1.5rem', paddingTop: '2.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--slate-800)', letterSpacing: '-0.03em' }}>My Applications</h1>
            </header>

            <div className="table-controls" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="search-bar" style={{
                    position: 'relative',
                    width: '380px',
                    borderRadius: 'var(--radius-full)',
                    background: 'white',
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--slate-200)',
                    overflow: 'hidden',
                    transition: 'all 0.2s'
                }}>
                    <input
                        type="text"
                        placeholder="Search by job, company, or status..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            padding: '0.875rem 1rem 0.875rem 3rem',
                            width: '100%',
                            border: 'none',
                            background: 'transparent',
                            fontSize: '0.95rem',
                            color: 'var(--slate-700)',
                            outline: 'none',
                            margin: 0 // Reset default input margin
                        }}
                    />
                    <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-500)', display: 'flex' }}>
                        <SearchIcon width={20} height={20} />
                    </div>
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--slate-500)', fontWeight: '500' }}>
                    Showing <strong style={{ color: 'var(--slate-900)' }}>{currentItems.length}</strong> of {processedApplications.length} applications
                </div>
            </div>

            <div className="table-container" style={{
                background: 'white',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--slate-200)',
                overflow: 'hidden'
            }}>
                <table className="jobs-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                    <thead>
                        <tr style={{ background: 'var(--slate-50)' }}>
                            <th onClick={() => handleSort('jobTitle')} style={{ padding: '1.25rem 1.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--slate-600)', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', borderBottom: '1px solid var(--slate-200)' }}>
                                Job Title {renderSortIcon('jobTitle')}
                            </th>
                            <th onClick={() => handleSort('company')} style={{ padding: '1.25rem 1.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--slate-600)', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', borderBottom: '1px solid var(--slate-200)' }}>
                                Company {renderSortIcon('company')}
                            </th>
                            <th onClick={() => handleSort('status')} style={{ padding: '1.25rem 1.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--slate-600)', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', borderBottom: '1px solid var(--slate-200)' }}>
                                Status {renderSortIcon('status')}
                            </th>
                            <th style={{ padding: '1.25rem 1.75rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--slate-600)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--slate-200)' }}>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.length > 0 ? currentItems.map((app, index) => (
                            <tr key={app.id} style={{ transition: 'background-color 0.2s', backgroundColor: index % 2 === 0 ? 'white' : 'var(--slate-50)' }} className="hover:bg-slate-50">
                                <td style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-900)', fontWeight: '600', fontSize: '1rem' }}>
                                    {app.jobTitle}
                                </td>
                                <td style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-600)', fontSize: '0.95rem' }}>{app.company}</td>
                                <td style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--slate-100)' }}>
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '9999px',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        textTransform: 'capitalize',
                                        backgroundColor: app.status === 'Hired' ? '#ecfdf5' :
                                            app.status === 'Interviewing' ? '#fff7ed' :
                                                app.status === 'Screening' ? '#eef2ff' : '#f1f5f9',
                                        color: app.status === 'Hired' ? '#059669' :
                                            app.status === 'Interviewing' ? '#ea580c' :
                                                app.status === 'Screening' ? '#4f46e5' : '#64748b'
                                    }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor', marginRight: '0.5rem' }}></span>
                                        {app.status}
                                    </span>
                                </td>
                                <td style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--slate-100)', textAlign: 'right' }}>
                                    {renderActionButton(app)}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--slate-500)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ background: 'var(--slate-100)', padding: '1rem', borderRadius: '50%' }}>
                                            <SearchIcon width={32} height={32} style={{ opacity: 0.5 }} />
                                        </div>
                                        <p style={{ fontSize: '1.1rem', margin: 0 }}>
                                            {searchTerm ? 'No applications match your search criteria.' : 'You have not applied to any jobs yet.'}
                                        </p>
                                        {!searchTerm && (
                                            <button className="btn btn-primary" onClick={() => onNavigate('find-jobs', 'find-jobs')}>
                                                Find Jobs
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <div className="pagination-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '1.5rem', background: 'white', borderTop: '1px solid var(--slate-200)' }}>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{ padding: '0.5rem 1rem' }}
                        >
                            <ChevronLeftIcon width={16} height={16} /> Previous
                        </button>
                        <span style={{ fontSize: '0.9rem', color: 'var(--slate-600)', fontWeight: '500' }}>Page {currentPage} of {totalPages}</span>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            style={{ padding: '0.5rem 1rem' }}
                        >
                            Next <ChevronRightIcon width={16} height={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

