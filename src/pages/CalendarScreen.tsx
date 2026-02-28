
import React, { useMemo } from 'react';
import CalendarView from '../components/CalendarView';
import { CalendarIcon, PlusIcon } from '../components/Icons';

type CalendarScreenProps = {
    candidatesData: any[];
    jobsData: any[];
    currentUser: any;
};

export default function CalendarScreen({ candidatesData = [], jobsData = [], currentUser }: CalendarScreenProps) {
    const events = useMemo(() => {
        if (!currentUser) return [];

        let relevantCandidates = [];

        if (currentUser.role === 'Employer') {
            const employerJobIds = new Set(jobsData.filter(j => j.employer === currentUser.name).map(j => j.id));
            relevantCandidates = candidatesData.filter(c => employerJobIds.has(c.jobId));
        } else if (currentUser.role === 'Candidate') {
            relevantCandidates = candidatesData.filter(c => c.user_id === currentUser.id);
        } else {
            // For Admins, Agents, Recruiters, show all interviews
            relevantCandidates = candidatesData;
        }

        const interviewCandidates = relevantCandidates.filter(c =>
            c.status === 'Interviewing' ||
            c.status === 'Offer' ||
            c.interview_config?.interviewStatus === 'scheduled' ||
            c.interview_config?.interviewStatus === 'finished'
        );

        return interviewCandidates.map((c, index) => {
            const job = jobsData.find(j => j.id === c.jobId);
            const jobTitle = job?.title || c.role;

            // Mock date logic if no scheduled date
            let date = new Date();
            if (c.interview_config?.scheduledAt) {
                date = new Date(c.interview_config.scheduledAt);
            } else if (c.created_at) {
                const createdDate = new Date(c.created_at);
                date = new Date(createdDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days after creation
            } else {
                // Spread out if no date
                date.setDate(date.getDate() + (index % 7) - 2);
            }

            // Set time to something reasonable if just a date
            if (date.getHours() === 0) {
                date.setHours(10 + (index % 6), 0, 0, 0);
            }

            let title = (currentUser.role === 'Candidate')
                ? `Interview: ${jobTitle}`
                : `${c.name} - ${jobTitle}`;

            return {
                id: c.id,
                title: title,
                start: date,
                end: new Date(date.getTime() + 60 * 60 * 1000), // 1 hour duration
                type: 'interview',
                status: c.status
            };
        });
    }, [candidatesData, jobsData, currentUser]);

    return (
        <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <header className="page-header" style={{ marginBottom: '1.5rem', paddingTop: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '40px', height: '40px',
                        borderRadius: '10px',
                        background: 'var(--primary-100)',
                        color: 'var(--color-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <CalendarIcon style={{ width: '24px', height: '24px' }} />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: 'var(--slate-800)', letterSpacing: '-0.03em' }}>Calendar</h1>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => window.alert('Event creation is managed through the Interview Scheduling flow in the Pipeline view.')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <PlusIcon style={{ width: '16px' }} /> Add Event
                    </button>
                </div>
            </header>

            <div className="calendar-page-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{
                    padding: '1rem 1.5rem',
                    background: 'var(--primary-50)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--primary-100)',
                    fontSize: '0.9rem',
                    color: 'var(--primary-800)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <CalendarIcon style={{ width: '18px', height: '18px', opacity: 0.8 }} />
                    <span>
                        <strong>Upcoming Interviews:</strong> This calendar displays scheduled AI interviews.
                        {currentUser?.role === 'Candidate'
                            ? " You can see your upcoming interview sessions here."
                            : " View scheduled interviews for candidates in your pipeline."}
                    </span>
                </div>

                <div style={{
                    flex: 1,
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--color-border)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <CalendarView events={events} />
                </div>
            </div>
        </div>
    );
}
