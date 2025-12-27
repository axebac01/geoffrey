import { useState, useEffect } from 'react';
import { getApiUrl } from '../../lib/api';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

interface AIClicksSummary {
    configured: boolean;
    sessions: number;
    activeUsers?: number;
    change: number;
    topAssistant: {
        assistant: string;
        sessions: number;
    } | null;
    dateRange?: {
        start: string;
        end: string;
    };
}

interface AIClicksDetail {
    source: string;
    propertyId?: string;
    propertyName?: string;
    dateRange: { start: string; end: string };
    totals: { sessions: number; activeUsers: number; keyEvents: number };
    byAssistant: Array<{ assistant: string; sessions: number; activeUsers: number; keyEvents: number }>;
    breakdown: Array<{ source: string; medium: string; sessions: number; activeUsers: number; keyEvents: number }>;
}

// Assistant logos and colors
import chatgptLogo from '../../assets/logos/chatgpt.png';
import perplexityLogo from '../../assets/logos/perplexity.png';
import geminiLogo from '../../assets/logos/gemini.png';
import deepseekLogo from '../../assets/logos/deepseek.png';

const ASSISTANT_CONFIG: Record<string, { 
    logo?: string; 
    icon?: string; 
    color: string; 
    name: string;
    logoPath?: string;
}> = {
    chatgpt: { logo: chatgptLogo, color: '#10a37f', name: 'ChatGPT' },
    gemini: { logo: geminiLogo, color: '#4285f4', name: 'Gemini' },
    perplexity: { logo: perplexityLogo, color: '#20b2aa', name: 'Perplexity' },
    deepseek: { logo: deepseekLogo, color: '#1a1a1a', name: 'Deepseek' },
    copilot: { icon: '🪟', color: '#0078d4', name: 'Copilot' },
    claude: { icon: '🧠', color: '#cc785c', name: 'Claude' },
    you: { icon: '👤', color: '#6366f1', name: 'You.com' },
    phind: { icon: '💻', color: '#7c3aed', name: 'Phind' },
    poe: { icon: '💬', color: '#f59e0b', name: 'Poe' },
    other: { icon: '🌐', color: '#8b949e', name: 'Other AI' },
};

interface Props {
    compact?: boolean;
}

export function AITrafficCard({ compact = false }: Props) {
    const { getToken } = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState<AIClicksSummary | null>(null);
    const [detail, setDetail] = useState<AIClicksDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('28');

    useEffect(() => {
        loadSummary();
        loadDetail();
    }, []);

    useEffect(() => {
        loadDetail();
    }, [dateRange]);

    async function loadSummary() {
        try {
            const token = await getToken();
            const res = await fetch(getApiUrl('/api/metrics/ai-clicks/summary'), {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Failed to load AI clicks summary:', errorData);
                // Set summary as not configured if we get an error
                setSummary({
                    configured: false,
                    sessions: 0,
                    change: 0,
                    topAssistant: null,
                });
                return;
            }
            
            const data = await res.json();
            setSummary(data);
        } catch (error: any) {
            console.error('Failed to load AI clicks summary:', error);
            // Set summary as not configured on error
            setSummary({
                configured: false,
                sessions: 0,
                change: 0,
                topAssistant: null,
            });
        } finally {
            setLoading(false);
        }
    }

    async function loadDetail() {
        try {
            const token = await getToken();
            const end = new Date().toISOString().split('T')[0];
            const start = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000)
                .toISOString().split('T')[0];
            
            const res = await fetch(`/api/metrics/ai-clicks?start=${start}&end=${end}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setDetail(data);
        } catch (error) {
            console.error('Failed to load AI clicks detail:', error);
        }
    }

    if (loading) {
        return (
            <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ color: '#8b949e', textAlign: 'center' }}>Loading AI traffic...</div>
            </div>
        );
    }

    if (!summary?.configured) {
        return (
            <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🤖 AI Traffic
                </h3>
                <p style={{ color: '#8b949e', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Track visitors coming from AI assistants like ChatGPT, Gemini, and Perplexity.
                </p>
                <button
                    className="btn-primary"
                    onClick={() => navigate('/dashboard/settings')}
                    style={{ fontSize: '0.85rem' }}
                >
                    Connect GA4 to Track
                </button>
            </div>
        );
    }

    // Compact view (for dashboard overview)
    if (compact) {
        const config = summary.topAssistant 
            ? ASSISTANT_CONFIG[summary.topAssistant.assistant] || ASSISTANT_CONFIG.other
            : null;

        return (
            <div 
                className="card" 
                style={{ padding: '1.5rem', cursor: 'pointer' }}
                onClick={() => navigate('/dashboard/ai-traffic')}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#8b949e', marginBottom: '0.25rem' }}>
                            AI Traffic (7 days)
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                            {summary.sessions.toLocaleString()}
                        </div>
                        {(summary as any).error ? (
                            <div style={{ 
                                fontSize: '0.75rem', 
                                color: '#d29922',
                                marginTop: '0.25rem'
                            }}>
                                ⚠️ {(summary as any).error}
                            </div>
                        ) : (
                            <div style={{ 
                                fontSize: '0.85rem', 
                                color: summary.change >= 0 ? '#3fb950' : '#f85149',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                            }}>
                                {summary.change >= 0 ? '↑' : '↓'} {Math.abs(summary.change)}% vs prev week
                            </div>
                        )}
                    </div>
                    {config && (
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: '#8b949e' }}>Top Source</div>
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.25rem',
                                color: config.color
                            }}>
                                {config.logo ? (
                                    <img src={config.logo} alt={config.name} style={{ width: '16px', height: '16px' }} />
                                ) : (
                                    <span>{config.icon}</span>
                                )}
                                <span style={{ fontWeight: 500 }}>{config.name}</span>
                            </div>
                        </div>
                    )}
                    {!config && summary.sessions === 0 && !(summary as any).error && (
                        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#8b949e' }}>
                            No AI traffic yet
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Full detail view
    return (
        <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🤖 AI Traffic Analytics
                </h3>
                <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    style={{
                        background: '#21262d',
                        border: '1px solid #30363d',
                        borderRadius: '6px',
                        padding: '0.5rem',
                        color: '#c9d1d9',
                        fontSize: '0.85rem'
                    }}
                >
                    <option value="7">Last 7 days</option>
                    <option value="14">Last 14 days</option>
                    <option value="28">Last 28 days</option>
                    <option value="90">Last 90 days</option>
                </select>
            </div>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: '#161b22', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#8b949e' }}>Total Sessions</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                        {detail?.totals.sessions.toLocaleString() || summary.sessions.toLocaleString()}
                    </div>
                </div>
                <div style={{ background: '#161b22', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#8b949e' }}>Active Users</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                        {detail?.totals.activeUsers.toLocaleString() || '—'}
                    </div>
                </div>
                <div style={{ background: '#161b22', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#8b949e' }}>Key Events</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                        {detail?.totals.keyEvents.toLocaleString() || '—'}
                    </div>
                </div>
            </div>

            {/* By Assistant breakdown */}
            {detail?.byAssistant && detail.byAssistant.length > 0 && (
                <>
                    <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#8b949e' }}>
                        Traffic by AI Assistant
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        {detail.byAssistant.map(item => {
                            const config = ASSISTANT_CONFIG[item.assistant] || ASSISTANT_CONFIG.other;
                            const percentage = detail.totals.sessions > 0 
                                ? (item.sessions / detail.totals.sessions) * 100 
                                : 0;

                            return (
                                <div key={item.assistant} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '100px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {config.logo ? (
                                            <img src={config.logo} alt={config.name} style={{ width: '20px', height: '20px' }} />
                                        ) : (
                                            <span>{config.icon}</span>
                                        )}
                                        <span style={{ fontSize: '0.9rem' }}>{config.name}</span>
                                    </div>
                                    <div style={{ flex: 1, background: '#21262d', borderRadius: '4px', height: '24px', overflow: 'hidden' }}>
                                        <div 
                                            style={{ 
                                                width: `${percentage}%`, 
                                                height: '100%', 
                                                background: config.color,
                                                borderRadius: '4px',
                                                transition: 'width 0.3s ease'
                                            }} 
                                        />
                                    </div>
                                    <div style={{ width: '80px', textAlign: 'right', fontSize: '0.9rem' }}>
                                        {item.sessions.toLocaleString()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Note about direct traffic */}
            <div style={{ 
                background: 'rgba(210, 153, 34, 0.1)', 
                border: '1px solid rgba(210, 153, 34, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                color: '#d29922'
            }}>
                💡 Some AI clicks may show as "Direct" if the referrer is suppressed by the AI platform.
            </div>
        </div>
    );
}

