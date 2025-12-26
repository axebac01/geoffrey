import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

interface ChecklistProgress {
    connected_ga4: boolean;
    first_scan_completed: boolean;
    first_prompt_tested: boolean;
    faq_generated: boolean;
    schema_generated: boolean;
    improvements_viewed: boolean;
    profile_completed: boolean;
    completed_items: number;
    total_items: number;
    progress_percentage: number;
}

const checklistItems = [
    {
        key: 'first_scan_completed',
        label: 'Complete your first scan',
        description: 'Analyze your website for AI visibility',
        icon: '🔍',
        route: '/dashboard/scan'
    },
    {
        key: 'connected_ga4',
        label: 'Connect Google Analytics',
        description: 'Track AI-referred traffic automatically',
        icon: '📊',
        route: '/dashboard/settings'
    },
    {
        key: 'first_prompt_tested',
        label: 'Test a prompt',
        description: 'See how AI responds to searches about you',
        icon: '🎯',
        route: '/dashboard/prompts'
    },
    {
        key: 'faq_generated',
        label: 'Generate FAQ content',
        description: 'Create AI-optimized FAQ for your site',
        icon: '❓',
        route: '/dashboard/improve'
    },
    {
        key: 'schema_generated',
        label: 'Generate schema markup',
        description: 'Add structured data for better AI understanding',
        icon: '🏷️',
        route: '/dashboard/improve'
    },
    {
        key: 'improvements_viewed',
        label: 'Review improvement tips',
        description: 'Learn GEO best practices',
        icon: '💡',
        route: '/dashboard/improve'
    },
    {
        key: 'profile_completed',
        label: 'Complete your profile',
        description: 'Add your business details',
        icon: '👤',
        route: '/dashboard/profile'
    }
];

export function OnboardingChecklist() {
    const { getToken } = useAuth();
    const navigate = useNavigate();
    const [progress, setProgress] = useState<ChecklistProgress | null>(null);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        loadProgress();
    }, []);

    async function loadProgress() {
        try {
            const token = await getToken();
            const res = await fetch('/api/geo/checklist', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setProgress(data.checklist);
        } catch (error) {
            console.error('Failed to load checklist:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return null;
    }

    if (!progress) {
        return null;
    }

    // Don't show if all items completed
    if (progress.progress_percentage >= 100) {
        return (
            <div className="card" style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, rgba(63, 185, 80, 0.1) 0%, rgba(35, 134, 54, 0.1) 100%)',
                border: '1px solid rgba(63, 185, 80, 0.3)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '2.5rem' }}>🎉</div>
                    <div>
                        <h3 style={{ margin: 0, color: '#3fb950' }}>All Done!</h3>
                        <p style={{ margin: 0, color: '#8b949e', fontSize: '0.9rem' }}>
                            You've completed all onboarding steps. Keep optimizing!
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const completedItems = checklistItems.filter(item => progress[item.key as keyof ChecklistProgress]);
    const pendingItems = checklistItems.filter(item => !progress[item.key as keyof ChecklistProgress]);

    return (
        <div className="card" style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, rgba(88, 166, 255, 0.05) 0%, rgba(188, 140, 242, 0.05) 100%)',
            border: '1px solid rgba(88, 166, 255, 0.2)'
        }}>
            {/* Header */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    marginBottom: isExpanded ? '1.5rem' : 0
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '1.5rem' }}>🚀</div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Getting Started</h3>
                        <p style={{ margin: 0, color: '#8b949e', fontSize: '0.85rem' }}>
                            {progress.completed_items} of {progress.total_items} completed
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Progress percentage */}
                    <div style={{
                        width: '50px',
                        height: '50px',
                        position: 'relative'
                    }}>
                        <svg width="50" height="50" style={{ transform: 'rotate(-90deg)' }}>
                            <circle
                                cx="25"
                                cy="25"
                                r="20"
                                fill="none"
                                stroke="rgba(48, 54, 61, 0.5)"
                                strokeWidth="4"
                            />
                            <circle
                                cx="25"
                                cy="25"
                                r="20"
                                fill="none"
                                stroke="url(#progressGradient)"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray={`${(progress.progress_percentage / 100) * 125.6} 125.6`}
                            />
                            <defs>
                                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#58a6ff" />
                                    <stop offset="100%" stopColor="#3fb950" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#c9d1d9'
                        }}>
                            {progress.progress_percentage}%
                        </div>
                    </div>
                    <span style={{ color: '#8b949e' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
            </div>

            {/* Checklist Items */}
            {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Pending items first */}
                    {pendingItems.map((item) => (
                        <div
                            key={item.key}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '0.75rem',
                                background: 'rgba(13, 17, 23, 0.4)',
                                borderRadius: '8px',
                                border: '1px solid #30363d',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onClick={() => navigate(item.route)}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#58a6ff'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#30363d'}
                        >
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'rgba(88, 166, 255, 0.1)',
                                border: '1px solid rgba(88, 166, 255, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1rem'
                            }}>
                                {item.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.label}</div>
                                <div style={{ color: '#8b949e', fontSize: '0.8rem' }}>{item.description}</div>
                            </div>
                            <span style={{ color: '#58a6ff', fontSize: '0.85rem' }}>→</span>
                        </div>
                    ))}

                    {/* Completed items */}
                    {completedItems.length > 0 && (
                        <div style={{ marginTop: '0.5rem' }}>
                            <div style={{ color: '#8b949e', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                                Completed
                            </div>
                            {completedItems.map((item) => (
                                <div
                                    key={item.key}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '0.5rem 0.75rem',
                                        opacity: 0.6
                                    }}
                                >
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: 'rgba(63, 185, 80, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#3fb950',
                                        fontSize: '0.8rem'
                                    }}>
                                        ✓
                                    </div>
                                    <span style={{ fontSize: '0.85rem', textDecoration: 'line-through', color: '#8b949e' }}>
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

