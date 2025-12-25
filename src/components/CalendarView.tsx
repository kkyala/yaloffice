
import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

type Event = {
    id: number | string;
    title: string;
    start: Date;
    end: Date;
    type: string;
};

type CalendarViewProps = {
    events: Event[];
};

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hoursOfDay = Array.from({ length: 11 }, (_, i) => 8 + i); // 8 AM to 6 PM

export default function CalendarView({ events }: CalendarViewProps) {
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    const getStartOfWeek = (date: Date) => {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day;
        return new Date(start.setDate(diff));
    };

    const addDays = (date: Date, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setDate(newDate.getDate() - 7);
        }
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() + 1);
        } else {
            newDate.setDate(newDate.getDate() + 7);
        }
        setCurrentDate(newDate);
    };

    const handleToday = () => setCurrentDate(new Date());

    const formatMonthYear = (date: Date) => {
        // Returns "December 2025" format
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    // --- MONTH VIEW RENDERER ---
    const renderMonthView = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDayIndex = firstDayOfMonth.getDay(); // 0 = Sun

        const days = [];
        // Empty cells for days before start of month
        for (let i = 0; i < startDayIndex; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dayEvents = events.filter(e => isSameDay(e.start, date));
            const isToday = isSameDay(date, new Date());

            // For demo purposes, if today is the 19th (based on screenshot), or just highlight actual today.
            // Screenshot highlights 19th. We will rely on actual today.

            days.push(
                <div key={d} className={`calendar-day ${isToday ? 'today' : ''}`}>
                    <div className="day-number">{d}</div>
                    <div className="day-events">
                        {dayEvents.map((ev, idx) => (
                            <div key={idx} className="calendar-event-badge" title={`${ev.title} at ${ev.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}>
                                <span className="event-time">{ev.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{' '}
                                <span className="event-title">{ev.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // Fill remaining cells for grid consistency if needed (optional)
        const totalCells = days.length;
        const remaining = 7 - (totalCells % 7);
        if (remaining < 7) {
            for (let i = 0; i < remaining; i++) {
                days.push(<div key={`empty-end-${i}`} className="calendar-day empty"></div>);
            }
        }

        return (
            <div className="calendar-month-grid">
                {daysOfWeek.map(day => <div key={day} className="calendar-header-cell">{day}</div>)}
                {days}
            </div>
        );
    };

    // --- WEEK VIEW RENDERER ---
    const renderWeekView = () => {
        const startOfWeek = getStartOfWeek(currentDate);
        const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek, i));

        return (
            <div className="calendar-week-container">
                <div className="week-header-row">
                    <div className="time-col-header"></div>
                    {weekDays.map((day, i) => (
                        <div key={i} className={`week-day-header ${isSameDay(day, new Date()) ? 'today' : ''}`}>
                            <div className="day-name">{daysOfWeek[day.getDay()]}</div>
                            <div className="day-num">{day.getDate()}</div>
                        </div>
                    ))}
                </div>
                <div className="week-grid-body">
                    {hoursOfDay.map(hour => (
                        <div key={hour} className="week-row">
                            <div className="time-label">{hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'PM' : 'AM'}</div>
                            {weekDays.map((day, i) => {
                                const cellDate = new Date(day);
                                cellDate.setHours(hour, 0, 0, 0);
                                const cellEvents = events.filter(e =>
                                    isSameDay(e.start, cellDate) && e.start.getHours() === hour
                                );

                                return (
                                    <div key={`${hour}-${i}`} className="week-cell">
                                        {cellEvents.map((ev, idx) => (
                                            <div key={idx} className="week-event-card">
                                                {ev.title}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="calendar-component">
            <div className="calendar-toolbar">
                <div className="calendar-nav">
                    <button className="btn btn-secondary btn-sm" onClick={handlePrev} aria-label="Previous" style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronLeftIcon />
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleNext} aria-label="Next" style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronRightIcon />
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleToday} style={{ borderRadius: '20px', padding: '0.4rem 1rem' }}>Today</button>
                    <h2>{formatMonthYear(currentDate)}</h2>
                </div>
                <div className="view-switcher">
                    <button
                        className={viewMode === 'month' ? 'active' : ''}
                        onClick={() => setViewMode('month')}
                    >
                        Month
                    </button>
                    <button
                        className={viewMode === 'week' ? 'active' : ''}
                        onClick={() => setViewMode('week')}
                    >
                        Week
                    </button>
                </div>
            </div>

            <div className="calendar-content">
                {viewMode === 'month' ? renderMonthView() : renderWeekView()}
            </div>
        </div>
    );
}
