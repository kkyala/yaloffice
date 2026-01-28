
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon, FilterIcon, XIcon } from '../components/Icons';

const ITEMS_PER_PAGE = 10;

export default function CandidateJobsScreen({ jobsData = [], candidatesData = [], currentUser, onStartApplication, resumeList = [] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'title', direction: 'asc' });
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showAllJobs, setShowAllJobs] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowFilterDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Identify current active resume role
    const activeJobRole = useMemo(() => {
        const activeResume = resumeList.find(r => r.is_current);
        if (!activeResume) return null;
        return activeResume.parsed_data?.suggestedJobRole || activeResume.parsed_data?.experience?.[0]?.role || null;
    }, [resumeList]);

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

    // Identify skills for fallback matching
    const candidateSkills = useMemo(() => {
        const activeResume = resumeList.find(r => r.is_current);
        return activeResume?.parsed_data?.skills || [];
    }, [resumeList]);

    // 3. Filter & Sort Logic
    const processedJobs = useMemo(() => {
        let initialData = activeJobs.map(job => {
            const lowerTitle = job.title.toLowerCase();

            // Primary Score: Role Match
            let roleScore = activeJobRole ? (
                lowerTitle.includes(activeJobRole.toLowerCase()) ||
                    activeJobRole.toLowerCase().includes(lowerTitle) ? 100 : 0
            ) : 0;

            // Secondary Score: Skills Match (only if role doesn't match perfectly)
            let skillScore = 0;
            if (candidateSkills.length > 0) {
                const matchedSkills = candidateSkills.filter(skill =>
                    lowerTitle.includes(skill.toLowerCase())
                );
                skillScore = matchedSkills.length * 10; // 10 points per skill match
            }

            const totalScore = roleScore + skillScore;
            return { ...job, roleScore, skillScore, totalScore, isMatch: totalScore > 0 };
        });

        // MULTI-LEVEL FILTER
        let data = [];

        if (showAllJobs) {
            data = initialData;
        } else if (activeJobRole) {
            // ONLY Role matches
            data = initialData.filter(j => j.roleScore > 0);
        } else {
            // If no role/skills defined, show everything (initial state)
            data = initialData;
        }

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            data = data.filter(job =>
                job.title.toLowerCase().includes(lowerTerm) ||
                job.employer.toLowerCase().includes(lowerTerm) ||
                job.location.toLowerCase().includes(lowerTerm)
            );
        }

        // Custom sort
        data.sort((a, b) => {
            if (a.totalScore !== b.totalScore) return b.totalScore - a.totalScore;

            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return data;
    }, [activeJobs, searchTerm, sortConfig, activeJobRole, candidateSkills, showAllJobs]);

    // Reset pagination when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, showAllJobs]);

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

    // Check if we are showing fallback results
    const noRoleMatches = useMemo(() => {
        if (!activeJobRole || showAllJobs) return false;
        return processedJobs.length === 0;
    }, [activeJobRole, showAllJobs, processedJobs]);

    return (
        <>
            <header className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1>Find Jobs</h1>
                    {activeJobRole && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                            {showAllJobs ? (
                                "Showing all available job openings."
                            ) : (
                                <>Showing AI-powered suggestions for <strong style={{ color: 'var(--primary-color)' }}>{activeJobRole}</strong></>
                            )}
                        </p>
                    )}
                </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        Showing <strong style={{ color: 'var(--text-primary)' }}>{currentItems.length}</strong> of {processedJobs.length} jobs
                    </div>

                    {/* Filter Option */}
                    <div style={{ position: 'relative' }} ref={filterRef}>
                        <button
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                            className="btn btn-secondary"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--border-radius)',
                                border: showFilterDropdown ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                                backgroundColor: showFilterDropdown ? 'var(--primary-subtle)' : 'white',
                                color: showFilterDropdown ? 'var(--primary-dark-color)' : 'var(--text-primary)',
                                fontWeight: '600',
                                boxShadow: 'var(--box-shadow-sm)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <FilterIcon style={{ width: '18px', height: '18px' }} />
                            Filter
                        </button>

                        {showFilterDropdown && (
                            <div className="glass-panel animate-fade-in" style={{
                                position: 'absolute',
                                right: 0,
                                top: 'calc(100% + 10px)',
                                width: '320px',
                                background: 'white',
                                borderRadius: '12px',
                                boxShadow: 'var(--box-shadow-lg)',
                                padding: '1.5rem',
                                zIndex: 1000,
                                border: '1px solid var(--border-color)',
                                backdropFilter: 'blur(10px)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Job Filters</h3>
                                    <button onClick={() => setShowFilterDropdown(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                        <XIcon style={{ width: '18px', height: '18px' }} />
                                    </button>
                                </div>

                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={showAllJobs}
                                            onChange={(e) => setShowAllJobs(e.target.checked)}
                                            style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)' }}
                                        />
                                        <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Show All Jobs</span>
                                    </label>
                                    <p style={{ margin: '0.5rem 0 0 2rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        Check this to see all available jobs regardless of your profile matches.
                                    </p>
                                </div>

                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Current Profile Data</h4>

                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Resume Job Roles</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {activeJobRole ? (
                                                <span style={{
                                                    fontSize: '0.8rem',
                                                    backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
                                                    color: 'var(--primary-color)',
                                                    padding: '2px 10px',
                                                    borderRadius: '20px',
                                                    fontWeight: '500',
                                                    border: '1px solid rgba(var(--primary-rgb), 0.1)'
                                                }}>
                                                    {activeJobRole}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No role detected</span>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Skills from Resume</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                            {candidateSkills && candidateSkills.length > 0 ? (
                                                candidateSkills.slice(0, 10).map((skill, index) => (
                                                    <span key={index} style={{
                                                        fontSize: '0.75rem',
                                                        backgroundColor: 'var(--background-color)',
                                                        color: 'var(--text-primary)',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        border: '1px solid var(--border-color)'
                                                    }}>
                                                        {skill}
                                                    </span>
                                                ))
                                            ) : (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No skills detected</span>
                                            )}
                                            {candidateSkills && candidateSkills.length > 10 && (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingTop: '2px' }}>+{candidateSkills.length - 10} more</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {noRoleMatches && (
                <div className="animate-fade-in" style={{
                    backgroundColor: 'rgba(255, 152, 0, 0.08)',
                    border: '1px solid rgba(255, 152, 0, 0.2)',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.5rem',
                    color: '#c2410c',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
                    <div>
                        There are currently no openings for <strong>{activeJobRole}</strong>. Use the <strong>Filter</strong> option to see all available jobs.
                    </div>
                </div>
            )}

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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                        <strong style={{ fontSize: '0.95rem', color: 'var(--primary-dark-color)' }}>{job.title}</strong>
                                        {job.isMatch && (
                                            <span style={{
                                                fontSize: '0.65rem',
                                                backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
                                                color: 'var(--primary-color)',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontWeight: '600',
                                                border: '1px solid rgba(var(--primary-rgb), 0.2)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                AI Suggestion
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{job.employer}</p>
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
                                    {searchTerm ? 'No jobs match your search criteria.' :
                                        (activeJobRole && !showAllJobs) ? `No current openings specifically for ${activeJobRole}.` :
                                            'There are currently no active job openings.'}
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
