import React, { useState, useMemo } from 'react';
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '../components/Icons';

const ITEMS_PER_PAGE = 10;

export default function JobListScreen({
    jobsData = [],
    onCreateNew,
    onEditJob,
    onPublishJob,
    showEmployerColumn = false
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'title', direction: 'asc' });

    // Filter & Sort Logic
    const processedJobs = useMemo(() => {
        let data = [...jobsData];

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            data = data.filter(job =>
                job.title.toLowerCase().includes(lowerTerm) ||
                (job.employer && job.employer.toLowerCase().includes(lowerTerm)) ||
                (job.location && job.location.toLowerCase().includes(lowerTerm))
            );
        }

        if (sortConfig.key) {
            data.sort((a, b) => {
                const aValue = a[sortConfig.key] || '';
                const bValue = b[sortConfig.key] || '';

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
    }, [jobsData, searchTerm, sortConfig]);

    // Pagination
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

    return (
        <>
            <header className="page-header">
                <h1>Job Management</h1>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={onCreateNew}>
                        <PlusIcon /> Create New Job
                    </button>
                </div>
            </header>

            <div className="table-controls" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="search-bar glass-panel" style={{ position: 'relative', width: '350px', padding: '0', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden' }}>
                    <input
                        type="text"
                        placeholder="Search jobs..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
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
                            <th onClick={() => handleSort('title')} style={{ cursor: 'pointer' }}>
                                Job Title {renderSortIcon('title')}
                            </th>
                            {showEmployerColumn && (
                                <th onClick={() => handleSort('employer')} style={{ cursor: 'pointer' }}>
                                    Employer {renderSortIcon('employer')}
                                </th>
                            )}
                            <th onClick={() => handleSort('location')} style={{ cursor: 'pointer' }}>
                                Location {renderSortIcon('location')}
                            </th>
                            <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                                Status {renderSortIcon('status')}
                            </th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.length > 0 ? currentItems.map(job => (
                            <tr key={job.id} className="animate-fade-in">
                                <td>
                                    <strong style={{ fontSize: '0.95rem', color: 'var(--primary-dark-color)' }}>{job.title}</strong>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0' }}>{formatCurrency(job.salaryMin)} - {formatCurrency(job.salaryMax)}</p>
                                </td>
                                {showEmployerColumn && (
                                    <td>{job.employer}</td>
                                )}
                                <td>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--light-bg)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem' }}>
                                        {job.location}
                                    </span>
                                </td>
                                <td>
                                    <span className={`status-badge status-${job.status?.toLowerCase() || 'draft'}`}>
                                        {job.status || 'Draft'}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => onEditJob(job)}
                                        >
                                            Edit
                                        </button>
                                        {job.status !== 'Active' && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => onPublishJob(job.id)}
                                            >
                                                Publish
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={showEmployerColumn ? 5 : 4} style={{ textAlign: 'center', padding: '2rem' }}>
                                    {searchTerm ? 'No jobs match your search criteria.' : 'No available jobs found.'}
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
