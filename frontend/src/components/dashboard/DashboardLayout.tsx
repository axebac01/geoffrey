import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { UserButton, useUser } from "@clerk/clerk-react";

export function DashboardLayout() {
    const { user } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        }

        if (showProfileMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showProfileMenu]);

    // Close dropdown when route changes
    useEffect(() => {
        setShowProfileMenu(false);
    }, [location.pathname]);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#0d1117', color: '#c9d1d9' }}>
            {/* Sidebar */}
            <aside style={{
                width: '260px',
                background: 'rgba(22, 27, 34, 0.8)',
                backdropFilter: 'blur(12px)',
                borderRight: '1px solid #30363d',
                padding: '2rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                position: 'sticky',
                top: 0,
                height: '100vh'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'linear-gradient(135deg, #58a6ff, #bc8cf2)',
                        borderRadius: '8px'
                    }}></div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Geoffrey</h1>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    <SidebarLink to="/dashboard" end>📊 Overview</SidebarLink>
                    <SidebarLink to="/dashboard/ai-traffic">🤖 AI Traffic</SidebarLink>
                    <SidebarLink to="/dashboard/prompts">🔍 Prompts</SidebarLink>
                    <SidebarLink to="/dashboard/improve">⚡ GEO Improvement</SidebarLink>
                </nav>

                {/* Profile Section with Dropdown */}
                <div style={{ position: 'relative' }} ref={profileMenuRef}>
                    <div 
                        style={{
                            padding: '1rem',
                            background: showProfileMenu ? 'rgba(48, 54, 61, 0.4)' : 'rgba(48, 54, 61, 0.2)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            border: showProfileMenu ? '1px solid rgba(88, 166, 255, 0.3)' : '1px solid rgba(48, 54, 61, 0.5)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                    >
                        <UserButton afterSignOutUrl="/" />
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {user?.fullName || user?.primaryEmailAddress?.emailAddress}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#8b949e' }}>Free Plan</div>
                        </div>
                        <div style={{
                            fontSize: '0.7rem',
                            color: '#8b949e',
                            transform: showProfileMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                        }}>
                            ▼
                        </div>
                    </div>

                    {/* Dropdown Menu */}
                    {showProfileMenu && (
                        <div style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: 0,
                            right: 0,
                            marginBottom: '0.5rem',
                            background: 'rgba(22, 27, 34, 0.95)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid #30363d',
                            borderRadius: '8px',
                            padding: '0.5rem',
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                            zIndex: 1000
                        }}>
                            <ProfileMenuItem 
                                icon="👤"
                                label="Profile"
                                onClick={() => {
                                    navigate('/dashboard/profile');
                                    setShowProfileMenu(false);
                                }}
                                isActive={location.pathname === '/dashboard/profile'}
                            />
                            <ProfileMenuItem 
                                icon="⚙️"
                                label="Settings"
                                onClick={() => {
                                    navigate('/dashboard/settings');
                                    setShowProfileMenu(false);
                                }}
                                isActive={location.pathname === '/dashboard/settings' || location.pathname.startsWith('/dashboard/settings/')}
                            />
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
                <Outlet />
            </main>
        </div>
    );
}

function SidebarLink({ to, children, end = false }: { to: string; children: React.ReactNode; end?: boolean }) {
    return (
        <NavLink
            to={to}
            end={end}
            style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                padding: '0.8rem 1rem',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive ? '#fff' : '#8b949e',
                background: isActive ? 'rgba(88, 166, 255, 0.15)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                border: isActive ? '1px solid rgba(88, 166, 255, 0.3)' : '1px solid transparent',
                transition: 'all 0.2s'
            })}
        >
            {children}
        </NavLink>
    );
}

function ProfileMenuItem({ icon, label, onClick, isActive }: { 
    icon: string; 
    label: string; 
    onClick: () => void;
    isActive: boolean;
}) {
    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                color: isActive ? '#fff' : '#c9d1d9',
                background: isActive ? 'rgba(88, 166, 255, 0.15)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
                if (!isActive) {
                    e.currentTarget.style.background = 'rgba(48, 54, 61, 0.5)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                }
            }}
        >
            <span>{icon}</span>
            <span>{label}</span>
        </div>
    );
}
