
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
        if (!['Applied', 'Sourced', 'Screening', 'Interviewing'].includes(app.status)) {
            return null;
        }

        const interviewStatus = app.interview_config?.interviewStatus;

        if (app.status === 'Screening' && !interviewStatus) {
            return <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Awaiting Interview Setup</span>;
        }

        if (interviewStatus === 'assessment_pending' || interviewStatus === 'pending') {
            return (
                <button className="btn btn-primary btn-sm" onClick={() => handleStartAssessment(app)}>
                    Start Pre-Interview Assessment
                </button>
            );
        }

        if (interviewStatus === 'assessment_completed' || interviewStatus === 'started') {
            return (
                <button className="btn btn-primary btn-sm" onClick={() => handleTakeInterview(app)}>
                    {interviewStatus === 'assessment_completed' ? 'Start AI Interview' : 'Continue Interview'}
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



    // Sorting UI
    const renderSortIcon = (key: string) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    };

    const renderApplicationRow = (app: CandidateApplication) => (
        <tr key={app.id} className="animate-fade-in">
            <td>
                <strong style={{ fontSize: '0.95rem', color: 'var(--primary-dark-color)' }}>{app.jobTitle}</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0' }}>{app.company}</p>
            </td>
            <td>
                <span className={`status-badge status-${app.status?.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}>
                    {app.status}
                </span>
            </td>
            <td style={{ textAlign: 'right' }}>
                {renderActionButton(app)}
            </td>
        </tr>
    );

    return (
        <>
            {/* Header */}
            <header className="page-header">
                <h1>My Applications</h1>
            </header>

            {/* Search Bar */}
            <div className="search-bar" style={{ marginBottom: '1.5rem', position: 'relative', width: '100%', maxWidth: '400px' }}>
                <input
                    type="text"
                    placeholder="Search by job, company, or status..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 2.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', fontSize: '0.9rem' }}
                />
                <SearchIcon style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', width: '16px' }} />
            </div>

            {/* Scheduled Interviews Section */}
            {scheduledApps.length > 0 && (
                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Scheduled Interviews</h2>
                    <div className="table-container">
                        <table className="jobs-table" style={{ fontSize: '0.9rem' }}>
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('jobTitle')} style={{ cursor: 'pointer' }}>Job Title {renderSortIcon('jobTitle')}</th>
                                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {renderSortIcon('status')}</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scheduledApps.map(renderApplicationRow)}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* All Other Applications Section */}
            <section>
                <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>All Applications</h2>
                <div className="table-container">
                    <table className="jobs-table" style={{ fontSize: '0.9rem' }}>
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('jobTitle')} style={{ cursor: 'pointer' }}>Job Title {renderSortIcon('jobTitle')}</th>
                                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {renderSortIcon('status')}</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {otherApps.map(renderApplicationRow)}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}

