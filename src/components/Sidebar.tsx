import React, { useState, useEffect } from 'react';
import { YaalOfficeLogo, ChevronLeftIcon } from './Icons';

type NavItem = {
    name: string;
    page: string;
    icon: React.ReactNode;
    children?: NavItem[];
    isGroupTitle?: boolean;
};

type SidebarProps = {
    user: any;
    navItems: NavItem[];
    currentPage: string;
    activeParent: string;
    onNavigate: (page: string, parent: string) => void;
    isMobile: boolean;
    isOpen: boolean;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onNavigateToDashboard: () => void;
};

const NavLink = ({ item, isActive, onClick }) => (
    <a 
        href="#"
        className={isActive ? 'active' : ''}
        onClick={(e) => { e.preventDefault(); onClick(); }}
    >
        {item.icon}
        <span>{item.name}</span>
    </a>
);


export default function Sidebar({ user, navItems = [], currentPage, activeParent, onNavigate, isMobile, isOpen, isCollapsed, onToggleCollapse, onNavigateToDashboard }: SidebarProps) {
    // Initialize open parents, ensuring 'Recruit' is always open for Employers.
    const [openParents, setOpenParents] = useState<Set<string>>(() => {
        const initialOpen = new Set([activeParent]);
        if (user?.role === 'Employer') {
            initialOpen.add('recruitment');
        }
        return initialOpen;
    });

    // Effect to open the parent menu when navigating directly to a child page.
    // This ensures the active menu stays open on page reloads.
    useEffect(() => {
        if (activeParent && !openParents.has(activeParent)) {
            setOpenParents(prev => new Set(prev).add(activeParent));
        }
    }, [activeParent, openParents]);

    const handleParentClick = (page: string) => {
        // For Employers, the 'Recruit' menu cannot be collapsed. This makes it permanently open.
        if (user?.role === 'Employer' && page === 'recruitment') {
            return;
        }
        
        // Standard toggle logic for all other menus.
        setOpenParents(prev => {
            const newSet = new Set(prev);
            if (newSet.has(page)) {
                // Prevent collapsing the currently active parent menu by the user.
                if (page !== activeParent) {
                    newSet.delete(page);
                }
            } else {
                newSet.add(page);
            }
            return newSet;
        });
    };
    
    const effectiveCollapsed = isCollapsed && !isMobile;
    const sidebarClasses = ['sidebar', isMobile ? 'mobile' : '', isOpen ? 'open' : '', effectiveCollapsed ? 'collapsed' : ''].join(' ');

    return (
        <aside className={sidebarClasses}>
            <div className="sidebar-header" onClick={onNavigateToDashboard} style={{ cursor: 'pointer' }}>
                <YaalOfficeLogo className="logo-icon"/>
                <div className="sidebar-header-text">
                    <h1>Yāl Office</h1>
                    <p>AI Recruitment</p>
                </div>
            </div>
            <nav className="sidebar-nav">
                <ul>
                    {navItems.map((item, index) => {
                        if (item.isGroupTitle) {
                            return <li key={`group-${index}`} className="nav-group-title"><span>{item.name}</span></li>;
                        }
                        
                        if (item.children) {
                            const isParentActive = activeParent === item.page;
                            return (
                                <li key={item.page}>
                                    <NavLink 
                                        item={item}
                                        isActive={isParentActive}
                                        onClick={() => handleParentClick(item.page)}
                                    />
                                    {openParents.has(item.page) && (
                                        <ul className="nav-children">
                                            {item.children.map(child => (
                                                <li key={child.page}>
                                                    <NavLink
                                                        item={child}
                                                        isActive={currentPage === child.page}
                                                        onClick={() => onNavigate(child.page, item.page)}
                                                    />
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            );
                        }

                        return (
                            <li key={item.page}>
                                <NavLink 
                                    item={item}
                                    isActive={currentPage === item.page}
                                    onClick={() => onNavigate(item.page, item.page)}
                                />
                            </li>
                        );
                    })}
                </ul>
            </nav>
            <div className="sidebar-footer">
                 <button className="collapse-btn" onClick={onToggleCollapse} aria-label="Collapse sidebar">
                    <ChevronLeftIcon />
                </button>
            </div>
        </aside>
    );
}