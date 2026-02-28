
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
                (job.title && job.title.toLowerCase().includes(lowerTerm)) ||
                (job.employer && job.employer.toLowerCase().includes(lowerTerm)) ||
                (job.location && job.location.toLowerCase().includes(lowerTerm))
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

        <div className="candidate-jobs-screen">
            <header className="page-header" style={{ marginBottom: '1.5rem', paddingTop: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--slate-800)', letterSpacing: '-0.03em' }}>Find Your Next Role</h1>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                        Browse active job openings matched to your profile.
                    </p>
                </div>
            </header>

            <div className="jobs-filter-bar" style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '1rem',
                marginBottom: '2rem',
                background: 'var(--color-surface)',
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div className="search-input-wrapper" style={{ position: 'relative' }}>
                    <SearchIcon style={{
                        position: 'absolute',
                        left: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--slate-400)',
                        width: '20px',
                        height: '20px'
                    }} />
                    <input
                        type="text"
                        placeholder="Search by job title, company, or keywords..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            paddingLeft: '3rem',
                            height: '50px',
                            border: '1px solid var(--slate-200)',
                            borderRadius: 'var(--radius-md)',
                            width: '100%',
                            fontSize: '1rem',
                            marginBottom: 0
                        }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <select
                        onChange={(e) => handleSort(e.target.value)}
                        style={{
                            height: '50px',
                            width: '180px',
                            marginBottom: 0
                        }}
                    >
                        <option value="title">Sort by Title</option>
                        <option value="location">Sort by Location</option>
                        <option value="salaryMax">Sort by Salary</option>
                    </select>
                </div>
            </div>

            <div className="jobs-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '1.5rem'
            }}>
                {currentItems.length > 0 ? currentItems.map(job => {
                    const isApplied = appliedJobIds.has(job.id);
                    return (
                        <div key={job.id} className="job-card" style={{
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-xl)',
                            padding: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            transition: 'all var(--duration-normal)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div className="job-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{
                                        fontSize: '1.25rem',
                                        fontWeight: '700',
                                        color: 'var(--color-text-main)',
                                        marginBottom: '0.25rem'
                                    }}>{job.title}</h3>
                                    <p style={{
                                        color: 'var(--color-primary)',
                                        fontWeight: '600',
                                        fontSize: '0.9rem'
                                    }}>{job.employer}</p>
                                </div>
                                {isApplied && (
                                    <span style={{
                                        background: 'var(--primary-50)',
                                        color: 'var(--color-primary)',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: 'var(--radius-full)',
                                        fontSize: '0.75rem',
                                        fontWeight: '700'
                                    }}>Applied</span>
                                )}
                            </div>

                            <div className="job-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <span style={{
                                    background: 'var(--slate-50)',
                                    border: '1px solid var(--slate-200)',
                                    color: 'var(--slate-600)',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.8rem',
                                    fontWeight: '500'
                                }}>{job.location}</span>
                                <span style={{
                                    background: 'var(--slate-50)',
                                    border: '1px solid var(--slate-200)',
                                    color: 'var(--slate-600)',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.8rem',
                                    fontWeight: '500'
                                }}>Full-time</span>
                                <span style={{
                                    background: 'var(--primary-50)',
                                    color: 'var(--color-primary)',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.8rem',
                                    fontWeight: '600'
                                }}>{formatCurrency(job.salaryMin)} - {formatCurrency(job.salaryMax)}</span>
                            </div>

                            <p style={{
                                color: 'var(--color-text-muted)',
                                fontSize: '0.9rem',
                                lineHeight: '1.5',
                                display: '-webkit-box',
                                WebkitLineClamp: '2',
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}>
                                {job.description || "Join our team to build the future of technology. We are looking for passionate individuals who love to code and design."}
                            </p>

                            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                                <button
                                    className={`btn ${isApplied ? 'btn-secondary' : 'btn-primary'}`}
                                    style={{ width: '100%' }}
                                    onClick={() => {
                                        if (isApplied) return;
                                        if (job.screening_enabled || (job.title && job.title.includes('(Demo)'))) {
                                            const confirmApply = window.confirm(
                                                "This job requires an AI Screening Interview. You will need to complete this screening before your application is reviewed by the employer.\n\nDo you want to proceed?"
                                            );
                                            if (!confirmApply) return;
                                        }
                                        onStartApplication(job);
                                    }}
                                    disabled={isApplied}
                                >
                                    {isApplied ? 'View Application' : 'Apply Now'}
                                </button>
                            </div>
                        </div>
                    );
                }) : (
                    <div style={{
                        gridColumn: '1 / -1',
                        padding: '4rem',
                        textAlign: 'center',
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px dashed var(--color-border)'
                    }}>
                        <h3 style={{ color: 'var(--color-text-muted)' }}>No jobs found</h3>
                        <p style={{ color: 'var(--slate-400)' }}>Try adjusting your search filters.</p>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="pagination-controls" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                    marginTop: '2rem'
                }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-text-muted)' }}>Page {currentPage} of {totalPages}</span>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );

}
