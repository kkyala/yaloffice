

import React, { useState, useRef, useEffect } from 'react';
import { MenuIcon, ChevronRightIcon, SettingsIcon, BellIcon, GlobeIcon, BuildingIcon, LogoutIcon } from './Icons';

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
export default function TopHeader({ user, onLogout, onProfileClick, currentPage, navItems, onMenuClick, isMobile, onNavigateToDashboard, onNavigate, candidatesData, jobsData }) {
    const pageInfo = findPageInfo(navItems, currentPage);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    const profileRef = useRef(null);
    const langRef = useRef(null);
    const notifRef = useRef(null);

    useClickOutside(profileRef, () => setIsProfileOpen(false));
    useClickOutside(langRef, () => setIsLangOpen(false));
    useClickOutside(notifRef, () => setIsNotificationsOpen(false));

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

    // Mock notifications - In a real app, these would come from an API or websocket
    const notifications = [
        { id: 1, text: `New candidate applied for ${user?.role === 'Employer' ? 'Senior React Dev' : 'Job Application'}`, time: "10m ago", unread: true, type: 'application' },
        { id: 2, text: "Interview scheduled with Sarah", time: "1h ago", unread: true, type: 'interview' },
        { id: 3, text: "Weekly recruitment report is ready", time: "1d ago", unread: false, type: 'system' },
    ];

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'application': return '📄';
            case 'interview': return '📅';
            case 'system': return '🔔';
            default: return '●';
        }
    };

    return (
        <header className="top-header">
            <div className="header-left">
                {isMobile && (
                    <button className="mobile-menu-btn" onClick={onMenuClick} aria-label="Open menu">
                        <MenuIcon />
                    </button>
                )}
                <div className="breadcrumbs">
                    <span onClick={onNavigateToDashboard} style={{ cursor: 'pointer' }}>Yāl Office</span>
                    {pageInfo?.parent && <> <ChevronRightIcon /> <span>{pageInfo.parent.name}</span> </>}
                    {pageInfo?.child && <> <ChevronRightIcon /> <span>{pageInfo.child.name}</span> </>}
                </div>
            </div>
            <div className="header-toolbar">
                {/* Check-In Widget (Style) */}


                <button className="toolbar-icon" onClick={() => onNavigate && onNavigate('settings', 'settings')} title="Settings">
                    <SettingsIcon />
                </button>

                {/* Notifications */}
                <div className="notification-container" ref={notifRef} style={{ position: 'relative' }}>
                    <button className="toolbar-icon" onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} title="Notifications">
                        <BellIcon />
                        <span className="badge">2</span>
                    </button>
                    {isNotificationsOpen && (
                        <div className="dropdown-menu notifications-dropdown" style={{ width: '320px', right: '-80px' }}>
                            <div className="dropdown-header" style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                Notifications
                            </div>
                            <ul style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {notifications.map(n => (
                                    <li key={n.id} style={{ backgroundColor: n.unread ? 'var(--primary-subtle)' : 'transparent' }}>
                                        <a href="#" onClick={(e) => e.preventDefault()} style={{ alignItems: 'flex-start', padding: '0.75rem 1rem' }}>
                                            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{getNotificationIcon(n.type)}</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                <span style={{ fontSize: '0.9rem', fontWeight: n.unread ? '600' : '500', color: 'var(--text-primary)' }}>{n.text}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{n.time}</span>
                                            </div>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                            <div className="dropdown-footer" style={{ textAlign: 'center' }}>
                                <a href="#" style={{ justifyContent: 'center', color: 'var(--primary-color)', fontSize: '0.85rem' }} onClick={(e) => e.preventDefault()}>View all notifications</a>
                            </div>
                        </div>
                    )}
                </div>

                <div className="language-selector" ref={langRef} style={{ position: 'relative' }}>
                    <button className="toolbar-icon" onClick={() => setIsLangOpen(!isLangOpen)} aria-haspopup="true" aria-expanded={isLangOpen}>
                        <GlobeIcon />
                    </button>
                    {isLangOpen && (
                        <div className="dropdown-menu" style={{ width: '200px' }}>
                            <ul>
                                {languages.map(lang => (
                                    <li key={lang.code}>
                                        <a href="#" onClick={handleLanguageSelect}>
                                            <span className="flag-icon" role="img" aria-label={lang.name} style={{ fontSize: '1.2rem' }}>{lang.flag}</span>
                                            <span>{lang.name}</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <button className="toolbar-icon" onClick={onNavigateToDashboard} title="Company Home">
                    <BuildingIcon />
                </button>

                <div className="user-profile-menu" ref={profileRef} style={{ position: 'relative' }}>
                    <div onClick={() => setIsProfileOpen(!isProfileOpen)} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '2px', borderRadius: '50%', border: '2px solid transparent', transition: 'all 0.2s' }} role="button" aria-haspopup="true" aria-expanded={isProfileOpen} onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-light-color)'} onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                        <img src={`https://i.pravatar.cc/40?u=${user?.email || 'user'}`} alt={user?.name || 'User'} style={{ borderRadius: '50%', width: '36px', height: '36px', objectFit: 'cover' }} />
                    </div>
                    {isProfileOpen && (
                        <div className="dropdown-menu" style={{ width: '240px', right: '0' }}>
                            <div className="dropdown-header" style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Signed in as</div>
                                <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'User'}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user?.role || 'Guest'}</div>
                            </div>
                            <ul>
                                <li>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleProfileItemClick('profile'); }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span>My Profile</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: '400' }}>Account settings & more</span>
                                        </div>
                                    </a>
                                </li>
                                <li><a href="#" onClick={(e) => { e.preventDefault(); handleProfileItemClick('username'); }}>Change Username</a></li>
                                <li><a href="#" onClick={(e) => { e.preventDefault(); handleProfileItemClick('password'); }}>Change Password</a></li>
                                <li style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleProfileItemClick('logout'); }} style={{ color: 'var(--error-color)' }}>
                                        <LogoutIcon />
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