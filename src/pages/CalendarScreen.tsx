
import React, { useMemo } from 'react';
import CalendarView from '../components/CalendarView';
import { CalendarIcon } from '../components/Icons';

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

            let date = new Date();
            if (c.interview_config?.scheduledAt) {
                date = new Date(c.interview_config.scheduledAt);
            } else if (c.created_at) {
                const createdDate = new Date(c.created_at);
                date = new Date(createdDate.setDate(createdDate.getDate() + 3));
            } else {
                date.setDate(date.getDate() + (index % 7) - 2);
            }

            date.setHours(10 + (index % 6), 0, 0, 0);

            let title = (currentUser.role === 'Candidate')
                ? `Interview: ${jobTitle}`
                : `${c.name} - ${jobTitle}`;

            return {
                id: c.id,
                title: title,
                start: date,
                end: new Date(date.getTime() + 60 * 60 * 1000), // 1 hour duration
                type: 'interview'
            };
        });
    }, [candidatesData, jobsData, currentUser]);

    return (
        <>
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarIcon style={{ width: '24px', height: '24px', color: 'var(--primary-color)' }} />
                    <h1>My Calendar</h1>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => window.alert('Event creation is managed through the Interview Scheduling flow in the Pipeline view.')}>
                        + Add Event
                    </button>
                </div>
            </header>
            <div className="calendar-page-container">
                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--primary-light-color)', borderRadius: '8px', border: '1px solid var(--primary-color)', fontSize: '0.9rem', color: 'var(--primary-dark-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarIcon style={{ width: '18px', height: '18px' }} />
                    <span>
                        <strong>Upcoming Interviews:</strong> This calendar displays scheduled AI interviews.
                        {currentUser.role === 'Candidate'
                            ? " You can see your upcoming interview sessions here."
                            : " View scheduled interviews for candidates in your pipeline."}
                    </span>
                </div>

                <CalendarView events={events} />
            </div>
        </>
    );
}
