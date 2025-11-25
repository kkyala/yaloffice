

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

    // Mock notifications
    const notifications = [
        { id: 1, text: "New candidate applied for Java Dev", time: "10m ago", unread: true },
        { id: 2, text: "Interview scheduled with Sarah", time: "1h ago", unread: true },
        { id: 3, text: "Weekly report is ready", time: "1d ago", unread: false },
    ];

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
                        <div className="dropdown-menu notifications-dropdown" style={{ width: '300px', right: '-50px' }}>
                            <div className="dropdown-header" style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', fontWeight: '600' }}>
                                Notifications
                            </div>
                            <ul style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {notifications.map(n => (
                                    <li key={n.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: n.unread ? 'var(--primary-light-color)' : 'transparent', cursor: 'pointer' }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: n.unread ? '600' : '400' }}>{n.text}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{n.time}</div>
                                    </li>
                                ))}
                            </ul>
                            <div className="dropdown-footer" style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <a href="#" style={{ fontSize: '0.8rem', color: 'var(--primary-color)' }} onClick={(e) => e.preventDefault()}>View all</a>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="language-selector" ref={langRef}>
                    <button className="toolbar-icon" onClick={() => setIsLangOpen(!isLangOpen)} aria-haspopup="true" aria-expanded={isLangOpen}>
                        <GlobeIcon />
                    </button>
                    {isLangOpen && (
                        <div className="dropdown-menu">
                            <ul>
                                {languages.map(lang => (
                                    <li key={lang.code}>
                                        <a href="#" onClick={handleLanguageSelect}>
                                            <span className="flag-icon" role="img" aria-label={lang.name}>{lang.flag}</span>
                                            {lang.name}
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

                <div className="user-profile-menu" ref={profileRef}>
                    <div onClick={() => setIsProfileOpen(!isProfileOpen)} style={{display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '2px'}} role="button" aria-haspopup="true" aria-expanded={isProfileOpen}>
                        <img src={`https://i.pravatar.cc/40?u=${user?.email || 'user'}`} alt={user?.name || 'User'} />
                    </div>
                     {isProfileOpen && (
                        <div className="dropdown-menu" style={{ width: '220px' }}>
                             <div style={{ padding: '1rem 1rem 0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Hello,</div>
                                <div style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'User'}</div>
                            </div>
                            <ul>
                                <li><a href="#" onClick={(e) => { e.preventDefault(); handleProfileItemClick('profile'); }}>My Profile</a></li>
                                <li><a href="#" onClick={(e) => { e.preventDefault(); handleProfileItemClick('username'); }}>Change Username</a></li>
                                <li><a href="#" onClick={(e) => { e.preventDefault(); handleProfileItemClick('password'); }}>Change Password</a></li>
                                <li><a href="#" onClick={(e) => { e.preventDefault(); handleProfileItemClick('logout'); }}><LogoutIcon /> Logout</a></li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}