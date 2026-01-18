

import React, { useState, useRef, useEffect } from 'react';
import { MenuIcon, ChevronRightIcon, SettingsIcon, BellIcon, GlobeIcon, CalendarIcon, LogoutIcon } from './Icons';

// Helper to find the current page's name for breadcrumbs
const findPageInfo = (navItems, currentPage) => {
    for (const item of navItems) {
        if (item.page === currentPage && !item.children) {
            return { parent: null, child: item };
        }
        if (item.children) {
            const child = item.children.find(c => c.page === currentPage);
            if (child) {
                return { parent: item, child: child };
            }
        }
    }
    return { parent: null, child: null };
};

// Custom hook to detect clicks outside a ref
const useClickOutside = (ref, callback) => {
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                callback();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [ref, callback]);
};

// Languages data structure
const languages = [
    { code: 'en', name: 'English (US)', flag: '🇺🇸' },
    { code: 'de', name: 'Deutsche', flag: '🇩🇪' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ar', name: 'عربى', flag: '🇸🇦' },
    { code: 'pt', name: 'Português (Brasil)', flag: '🇧🇷' },
    { code: 'zh-cn', name: 'Simplified Chinese', flag: '🇨🇳' },
    { code: 'zh-tw', name: 'Traditional Chinese', flag: '🇹🇼' },
];


// FIX: Added candidatesData and jobsData to the function's props destructuring to align with the props passed in App.tsx.
export default function TopHeader({ user, onLogout, onProfileClick, currentPage, navItems, onMenuClick, isMobile, onNavigateToDashboard, onNavigate, candidatesData = [], jobsData = [] }) {
    const pageInfo = findPageInfo(navItems, currentPage);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);

    const profileRef = useRef(null);
    const langRef = useRef(null);
    const notifRef = useRef(null);

    useClickOutside(profileRef, () => setIsProfileOpen(false));
    useClickOutside(langRef, () => setIsLangOpen(false));
    useClickOutside(notifRef, () => setIsNotificationsOpen(false));

    // Generate notifications based on "Calendar" / Candidates data
    useEffect(() => {
        const generatedNotifications = [
            { id: 'sys-1', text: "Weekly recruitment report is ready", time: "2h ago", unread: true, type: 'system' }
        ];

        // Simulate Calendar/Interview notifications from candidatesData
        if (candidatesData && candidatesData.length > 0) {
            const interviewingCandidates = candidatesData.filter(c => c.status === 'Interviewing' || c.status === 'Screening');
            interviewingCandidates.slice(0, 3).forEach((c, index) => {
                generatedNotifications.unshift({
                    id: `cand-${c.id}`,
                    text: `Interview scheduled with ${c.name}`,
                    time: "Today, 2:00 PM", // Mock time for demo "calendar" effect
                    unread: true,
                    type: 'interview'
                });
            });
        }

        setNotifications(generatedNotifications);
    }, [candidatesData]);

    const handleProfileItemClick = (action) => {
        if (action === 'logout') {
            onLogout();
        } else {
            // Pass the specific tab action ('profile', 'username', 'password')
            onProfileClick(action);
        }
        setIsProfileOpen(false);
    };

    const handleLanguageSelect = (e) => {
        e.preventDefault();
        // Future i18n logic would go here.
        setIsLangOpen(false); // Close dropdown on selection
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'application': return '📄';
            case 'interview': return '📅';
            case 'system': return '🔔';
            default: return '●';
        }
    };

    const unreadCount = notifications.filter(n => n.unread).length;

    // --- Styling Helpers ---
    const getIconButtonStyle = (isActive) => ({
        position: 'relative' as 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '42px',
        height: '42px',
        borderRadius: '12px', // Modern squircle/rounded look
        border: 'none',
        background: isActive ? '#eff6ff' : 'transparent', // Light primary bg when active
        color: isActive ? 'var(--primary-color)' : '#64748b',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden'
    });

    const handleIconHover = (e, isActive) => {
        if (!isActive) {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.color = '#334155';
            e.currentTarget.style.transform = 'translateY(-1px)';
        }
    };

    const handleIconLeave = (e, isActive) => {
        if (!isActive) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#64748b';
            e.currentTarget.style.transform = 'translateY(0)';
        }
    };

    const isSettingsActive = currentPage === 'settings';
    const isCalendarActive = currentPage === 'calendar';

    return (
        <header className="top-header" style={{ height: '70px', padding: '0 2rem', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', zIndex: 50 }}>
            <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {isMobile && (
                    <button className="mobile-menu-btn" onClick={onMenuClick} aria-label="Open menu" style={{ padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        <MenuIcon />
                    </button>
                )}
                <div className="breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                    <span onClick={onNavigateToDashboard} style={{ cursor: 'pointer', fontWeight: '600', color: 'var(--primary-color)' }}>Yāl Hire</span>
                    {pageInfo?.parent && (
                        <>
                            <ChevronRightIcon style={{ width: 14, height: 14, color: '#94a3b8' }} />
                            <span style={{ color: '#64748b' }}>{pageInfo.parent.name}</span>
                        </>
                    )}
                    {pageInfo?.child && (
                        <>
                            <ChevronRightIcon style={{ width: 14, height: 14, color: '#94a3b8' }} />
                            <span style={{ fontWeight: '500', color: '#334155' }}>{pageInfo.child.name}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Toolbar with adjusted gap */}
            <div className="header-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

                <button
                    className="toolbar-icon"
                    onClick={() => onNavigate && onNavigate('settings', 'settings')}
                    title="Settings"
                    style={getIconButtonStyle(isSettingsActive)}
                    onMouseEnter={(e) => handleIconHover(e, isSettingsActive)}
                    onMouseLeave={(e) => handleIconLeave(e, isSettingsActive)}
                >
                    <SettingsIcon />
                </button>

                {/* Notifications */}
                <div className="notification-container" ref={notifRef} style={{ position: 'relative' }}>
                    <button
                        className="toolbar-icon"
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        title="Notifications"
                        style={getIconButtonStyle(isNotificationsOpen)}
                        onMouseEnter={(e) => handleIconHover(e, isNotificationsOpen)}
                        onMouseLeave={(e) => handleIconLeave(e, isNotificationsOpen)}
                    >
                        <BellIcon />
                        {unreadCount > 0 && (
                            <span className="badge" style={{
                                position: 'absolute', top: '4px', right: '4px',
                                background: 'var(--error-color)', color: 'white',
                                fontSize: '0.7rem', fontWeight: 'bold',
                                padding: '0 5px', borderRadius: '10px',
                                minWidth: '16px', height: '16px', lineHeight: '16px', textAlign: 'center',
                                border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    {isNotificationsOpen && (
                        <div className="dropdown-menu notifications-dropdown" style={{
                            position: 'absolute', top: '120%', right: '-10px', width: '340px',
                            background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            border: '1px solid #e2e8f0', zIndex: 100, overflow: 'hidden', transformOrigin: 'top right',
                            animation: 'slideInDown 0.2s ease-out'
                        }}>
                            <div className="dropdown-header" style={{ padding: '1rem', fontWeight: '600', color: '#1e293b', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Notifications</span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>{unreadCount} unread</span>
                            </div>
                            <ul style={{ maxHeight: '300px', overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0 }}>
                                {notifications.length > 0 ? notifications.map(n => (
                                    <li key={n.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <a href="#" onClick={(e) => e.preventDefault()} style={{ display: 'flex', alignItems: 'flex-start', padding: '1rem', textDecoration: 'none', transition: 'background 0.1s', background: n.unread ? '#f8fafc' : 'white' }}>
                                            <div style={{ fontSize: '1.25rem', marginRight: '1rem', padding: '0.5rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                                                {getNotificationIcon(n.type)}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                                <span style={{ fontSize: '0.9rem', fontWeight: n.unread ? '600' : '500', color: '#334155', marginBottom: '0.25rem' }}>{n.text}</span>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{n.time}</span>
                                            </div>
                                            {n.unread && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-color)', marginTop: '0.5rem' }} />}
                                        </a>
                                    </li>
                                )) : (
                                    <li style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No notifications</li>
                                )}
                            </ul>
                            <div className="dropdown-footer" style={{ padding: '0.75rem', textAlign: 'center', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                <a href="#" style={{ color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: '500', textDecoration: 'none' }} onClick={(e) => e.preventDefault()}>View all notifications</a>
                            </div>
                        </div>
                    )}
                </div>

                <div className="language-selector" ref={langRef} style={{ position: 'relative' }}>
                    <button
                        className="toolbar-icon"
                        onClick={() => setIsLangOpen(!isLangOpen)}
                        aria-haspopup="true"
                        aria-expanded={isLangOpen}
                        style={getIconButtonStyle(isLangOpen)}
                        onMouseEnter={(e) => handleIconHover(e, isLangOpen)}
                        onMouseLeave={(e) => handleIconLeave(e, isLangOpen)}
                    >
                        <GlobeIcon />
                    </button>
                    {isLangOpen && (
                        <div className="dropdown-menu" style={{ position: 'absolute', top: '120%', right: '0', width: '200px', background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 100, animation: 'slideInDown 0.2s ease-out' }}>
                            <ul style={{ listStyle: 'none', padding: '0.5rem', margin: 0 }}>
                                {languages.map(lang => (
                                    <li key={lang.code}>
                                        <a href="#" onClick={handleLanguageSelect} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', textDecoration: 'none', color: '#334155', borderRadius: '8px', fontSize: '0.9rem', transition: 'background 0.1s' }} onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                            <span style={{ fontSize: '1.2rem' }}>{lang.flag}</span>
                                            <span>{lang.name}</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <button
                    className="toolbar-icon"
                    onClick={() => onNavigate && onNavigate('calendar', 'calendar')}
                    title="Calendar"
                    style={getIconButtonStyle(isCalendarActive)}
                    onMouseEnter={(e) => handleIconHover(e, isCalendarActive)}
                    onMouseLeave={(e) => handleIconLeave(e, isCalendarActive)}
                >
                    <CalendarIcon />
                </button>

                <div className="user-profile-menu" ref={profileRef} style={{ position: 'relative', marginLeft: '0.5rem' }}>
                    <div
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            padding: '2px',
                            borderRadius: '50%',
                            border: `2px solid ${isProfileOpen ? 'var(--primary-color)' : 'transparent'}`,
                            transition: 'all 0.2s',
                        }}
                        role="button"
                        aria-haspopup="true"
                        aria-expanded={isProfileOpen}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-light-color)'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = isProfileOpen ? 'var(--primary-color)' : 'transparent'}
                    >
                        <img src={`https://i.pravatar.cc/40?u=${user?.email || 'user'}`} alt={user?.name || 'User'} style={{ borderRadius: '50%', width: '38px', height: '38px', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }} />
                    </div>
                    {isProfileOpen && (
                        <div className="dropdown-menu" style={{ position: 'absolute', top: '120%', right: '0', width: '260px', background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 100, overflow: 'hidden', animation: 'slideInDown 0.2s ease-out' }}>
                            <div className="dropdown-header" style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem', fontWeight: '600' }}>Signed in as</div>
                                <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'User'}</div>
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{user?.role || 'Guest'}</div>
                            </div>
                            <ul style={{ listStyle: 'none', padding: '0.5rem', margin: 0 }}>
                                <li>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleProfileItemClick('profile'); }} style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: '#334155', borderRadius: '8px', transition: 'background 0.1s' }} onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                        <div style={{ fontWeight: '500' }}>My Profile</div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Account settings & more</div>
                                    </a>
                                </li>
                                <li>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleProfileItemClick('username'); }} style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: '#334155', borderRadius: '8px', fontSize: '0.9rem' }} onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>Change Username</a>
                                </li>
                                <li>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleProfileItemClick('password'); }} style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: '#334155', borderRadius: '8px', fontSize: '0.9rem' }} onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>Change Password</a>
                                </li>
                                <li style={{ borderTop: '1px solid #f1f5f9', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleProfileItemClick('logout'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', textDecoration: 'none', color: '#ef4444', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '500' }} onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                        <LogoutIcon style={{ width: 18, height: 18 }} />
                                        <span>Logout</span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}