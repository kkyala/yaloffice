
import React, { useMemo, useState, useEffect } from 'react';
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/Icons';

const ITEMS_PER_PAGE = 10;

export default function CandidateJobsScreen({ jobsData = [], candidatesData = [], currentUser, onStartApplication }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'title', direction: 'asc' });

    // 1. Filter Active Jobs
    const activeJobs = useMemo(() => {
        return jobsData.filter(job => job.status === 'Active');
    }, [jobsData]);

    // 2. Identify Applied Jobs
    const appliedJobIds = useMemo(() => {
        if (!candidatesData || !currentUser) return new Set();
        return new Set(
            candidatesData
                .filter(app => app.user_id === currentUser.id)
                .map(app => app.jobId)
        );
    }, [candidatesData, currentUser]);

    // 3. Filter & Sort Logic
    const processedJobs = useMemo(() => {
        let data = [...activeJobs];

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            data = data.filter(job =>
                job.title.toLowerCase().includes(lowerTerm) ||
                job.employer.toLowerCase().includes(lowerTerm) ||
                job.location.toLowerCase().includes(lowerTerm)
            );
        }

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
    }, [activeJobs, searchTerm, sortConfig]);

    // Reset pagination when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // 4. Pagination
    const totalPages = Math.ceil(processedJobs.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentItems = processedJobs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Handlers
    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const renderSortIcon = (key: string) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    };

    const formatCurrency = (amount) => {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
    }

    const [screeningStatus, setScreeningStatus] = useState<{ completed: boolean }>({ completed: false });

    useEffect(() => {
        if (currentUser?.id) {
            // Check screening status
            fetch(`/api/interview/screening-status/${currentUser.id}`)
                .then(res => res.json())
                .then(data => setScreeningStatus(data))
                .catch(err => console.error('Failed to check screening status:', err));
        }
    }, [currentUser]);

    return (
        <>
            <header className="page-header">
                <h1>Find Jobs</h1>
            </header>

            <div className="table-controls" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="search-bar glass-panel" style={{ position: 'relative', width: '350px', padding: '0', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden' }}>
                    <input
                        type="text"
                        placeholder="Search jobs, companies, locations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                    Showing <strong style={{ color: 'var(--text-primary)' }}>{currentItems.length}</strong> of {processedJobs.length} jobs
                </div>
            </div>

            <div className="table-container">
                <table className="jobs-table" style={{ fontSize: '0.9rem' }}>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('title')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                Job Title {renderSortIcon('title')}
                            </th>
                            <th onClick={() => handleSort('location')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                Location {renderSortIcon('location')}
                            </th>
                            <th onClick={() => handleSort('salaryMax')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                Salary Range {renderSortIcon('salaryMax')}
                            </th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.length > 0 ? currentItems.map(job => (
                            <tr key={job.id} className="animate-fade-in">
                                <td>
                                    <strong style={{ fontSize: '0.95rem', color: 'var(--primary-dark-color)' }}>{job.title}</strong>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0' }}>{job.employer}</p>
                                </td>
                                <td>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--light-bg)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem' }}>
                                        {job.location}
                                    </span>
                                </td>
                                <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{`${formatCurrency(job.salaryMin)} - ${formatCurrency(job.salaryMax)}`}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <button
                                        className={`btn ${appliedJobIds.has(job.id) ? 'btn-secondary' : 'btn-primary'}`}
                                        onClick={() => {
                                            if (appliedJobIds.has(job.id)) return;

                                            // Job-specific screening logic
                                            if (job.screening_enabled) {
                                                const confirmApply = window.confirm(
                                                    "This job requires an AI Screening Interview. You will need to complete this screening before your application is reviewed by the employer.\n\nDo you want to proceed?"
                                                );
                                                if (!confirmApply) return;
                                            }

                                            onStartApplication(job);
                                        }}
                                        disabled={appliedJobIds.has(job.id)}
                                        style={{ minWidth: '120px' }}
                                    >
                                        {appliedJobIds.has(job.id) ? 'Applied' : 'Apply Now'}
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                                    {searchTerm ? 'No jobs match your search criteria.' : 'There are currently no active job openings.'}
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
