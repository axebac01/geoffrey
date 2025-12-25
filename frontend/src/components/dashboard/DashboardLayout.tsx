import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { UserButton, useUser } from "@clerk/clerk-react";

export function DashboardLayout() {
    const { user } = useUser();
    const navigate = useNavigate();

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }} onClick={() => navigate('/')}>
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
                    <SidebarLink to="/dashboard/scan">🔍 New Scan</SidebarLink>
                    <SidebarLink to="/dashboard/improve">⚡ Improvements</SidebarLink>
                    <SidebarLink to="/dashboard/profile">👤 Profile</SidebarLink>
                    
                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #30363d' }}>
                        <SidebarLink to="/dashboard/settings">⚙️ Settings</SidebarLink>
                    </div>
                </nav>

                <div style={{
                    padding: '1rem',
                    background: 'rgba(48, 54, 61, 0.2)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    border: '1px solid rgba(48, 54, 61, 0.5)'
                }}>
                    <UserButton afterSignOutUrl="/" />
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {user?.fullName || user?.primaryEmailAddress?.emailAddress}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#8b949e' }}>Free Plan</div>
                    </div>
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
