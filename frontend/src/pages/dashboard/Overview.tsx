import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { AITrafficCard } from '../../components/analytics/AITrafficCard';
import { OnboardingChecklist } from '../../components/onboarding/OnboardingChecklist';
import { getApiUrl } from '../../lib/api';

interface Business {
    id: string;
    business_name: string;
    website: string;
    industry: string;
    region: string;
    description: string;
    logo_url: string | null;
    plan: string;
}

interface OnboardingData {
    prompts: string[];
    competitors: Array<{ name: string; website?: string }>;
    snapshot: any;
}

export function DashboardOverview() {
    const { user } = useUser();
    const { getToken } = useAuth();
    const navigate = useNavigate();
    const [scans, _setScans] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-unused-vars
    const [business, setBusiness] = useState<Business | null>(null);
    const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!user) return;

            try {
                const token = await getToken();
                if (!token) {
                    setLoading(false);
                    return;
                }

                // Fetch business/profile data via API
                let businessData: Business | null = null;
                const profileRes = await fetch(getApiUrl('/api/user/profile'), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    if (profileData.profile) {
                        businessData = {
                            id: profileData.profile.id,
                            business_name: profileData.profile.business_name,
                            website: profileData.profile.website,
                            industry: profileData.profile.industry,
                            region: profileData.profile.region,
                            description: profileData.profile.description,
                            logo_url: profileData.profile.logo_url,
                            plan: profileData.profile.plan
                        };
                        setBusiness(businessData);
                    }
                }

                // Fetch onboarding scan result (prompts, competitors)
                const scanResultRes = await fetch(getApiUrl('/api/onboarding/scan-result'), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (scanResultRes.ok) {
                    const data = await scanResultRes.json();
                    if (data.scanResult?.scan_data?.type === 'final_review') {
                        const snapshot = data.scanResult.scan_data.snapshot || {};
                        
                        // Format competitors - they might be strings or objects
                        const competitorsData = data.scanResult.scan_data.competitors || [];
                        const formattedCompetitors = competitorsData.map((comp: any) => {
                            if (typeof comp === 'string') {
                                return { name: comp };
                            }
                            // If it's already an object, ensure it has a name property
                            return comp.name ? comp : { name: String(comp) };
                        });

                        setOnboardingData({
                            prompts: data.scanResult.scan_data.prompts || [],
                            competitors: formattedCompetitors,
                            snapshot: snapshot
                        });

                        // If business profile is not set, use snapshot data as fallback
                        if (!businessData && snapshot.businessName) {
                            setBusiness({
                                id: '',
                                business_name: snapshot.businessName,
                                website: snapshot.website || '',
                                industry: snapshot.industry || '',
                                region: snapshot.region || '',
                                description: snapshot.description || '',
                                logo_url: snapshot.logoUrl || null,
                                plan: 'free'
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            }

            setLoading(false);
        }

        fetchData();
    }, [user, getToken]);

    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '50vh' 
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid rgba(48, 54, 61, 0.5)',
                        borderTopColor: '#58a6ff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem'
                    }} />
                    <style>{`
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                    <p style={{ color: '#8b949e' }}>Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    // If we have scans, show the full dashboard with scores
    if (scans.length > 0) {
        const latestScan = scans[0];
        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.8rem' }}>Welcome back, {user?.firstName}!</h1>
                    <button className="btn-secondary" onClick={() => navigate('/dashboard/scan')}>+ New Scan</button>
                </div>

                {/* Onboarding Checklist */}
                <div style={{ marginBottom: '2rem' }}>
                    <OnboardingChecklist />
                </div>

                {/* AI Traffic Card */}
                <div style={{ marginBottom: '2rem' }}>
                    <AITrafficCard compact />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                    {/* Latest Score Card */}
                    <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                        <h3 style={{ color: '#8b949e', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Latest Score</h3>
                        <div style={{ fontSize: '5rem', fontWeight: 800, margin: '1rem 0', background: 'linear-gradient(90deg, #58a6ff, #bc8cf2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {latestScan.overall_score}
                        </div>
                        <div style={{ color: '#8b949e' }}>{latestScan.businesses?.business_name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#30363d', marginTop: '0.5rem' }}>
                            Scanned on {new Date(latestScan.created_at).toLocaleDateString()}
                        </div>
                    </div>

                    {/* Performance Summary */}
                    <div className="card" style={{ padding: '2rem' }}>
                        <h3>Quick Overview</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1.5rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3fb950' }}>{JSON.parse(latestScan.results).results.filter((r: any) => r.judgeResult.isMentioned && r.judgeResult.rankPosition <= 3).length}</div>
                                <div style={{ fontSize: '0.7rem', color: '#8b949e' }}>WINS</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d29922' }}>{JSON.parse(latestScan.results).results.filter((r: any) => r.judgeResult.isMentioned && (!r.judgeResult.rankPosition || r.judgeResult.rankPosition > 3)).length}</div>
                                <div style={{ fontSize: '0.7rem', color: '#8b949e' }}>OPPORTUNITIES</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f85149' }}>{JSON.parse(latestScan.results).results.filter((r: any) => !r.judgeResult.isMentioned).length}</div>
                                <div style={{ fontSize: '0.7rem', color: '#8b949e' }}>GAPS</div>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/dashboard/improve')}>
                                Improve Your Score →
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '3rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Recent Scan History</h3>
                    <div className="card" style={{ padding: 0 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(48, 54, 61, 0.2)', borderBottom: '1px solid #30363d' }}>
                                    <th style={{ textAlign: 'left', padding: '1rem' }}>Business</th>
                                    <th style={{ textAlign: 'center', padding: '1rem' }}>Score</th>
                                    <th style={{ textAlign: 'right', padding: '1rem' }}>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scans.slice(0, 5).map((scan) => (
                                    <tr key={scan.id} style={{ borderBottom: '1px solid #30363d' }}>
                                        <td style={{ padding: '1rem' }}>{scan.businesses?.business_name}</td>
                                        <td style={{ textAlign: 'center', padding: '1rem' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                background: 'rgba(88, 166, 255, 0.15)',
                                                color: '#58a6ff',
                                                fontSize: '0.8rem',
                                                fontWeight: 600
                                            }}>
                                                {scan.overall_score}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '1rem', color: '#8b949e', fontSize: '0.85rem' }}>
                                            {new Date(scan.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // No scans yet - show business info and onboarding data
    return (
        <div>
            {/* Header with business info */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '2rem' 
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {business?.logo_url && (
                        <img 
                            src={business.logo_url} 
                            alt={business.business_name}
                            style={{ 
                                width: '48px', 
                                height: '48px', 
                                borderRadius: '8px',
                                objectFit: 'contain',
                                background: '#fff',
                                padding: '4px'
                            }}
                        />
                    )}
                    <div>
                        <h1 style={{ fontSize: '1.8rem', margin: 0 }}>
                            Welcome, {user?.firstName}!
                        </h1>
                        {business && (
                            <p style={{ color: '#8b949e', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                                {business.business_name}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Traffic Card */}
            <div style={{ marginBottom: '2rem' }}>
                <AITrafficCard compact />
            </div>

            {/* Main Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                
                {/* Business Profile Card */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🏢 Your Business Profile
                    </h3>
                    {business ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div>
                                <span style={{ color: '#8b949e', fontSize: '0.8rem' }}>Website</span>
                                <p style={{ margin: '0.25rem 0 0 0' }}>
                                    <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} 
                                       target="_blank" 
                                       rel="noopener noreferrer"
                                       style={{ color: '#58a6ff' }}>
                                        {business.website}
                                    </a>
                                </p>
                            </div>
                            {business.industry && (
                                <div>
                                    <span style={{ color: '#8b949e', fontSize: '0.8rem' }}>Industry</span>
                                    <p style={{ margin: '0.25rem 0 0 0' }}>{business.industry}</p>
                                </div>
                            )}
                            {business.region && (
                                <div>
                                    <span style={{ color: '#8b949e', fontSize: '0.8rem' }}>Region</span>
                                    <p style={{ margin: '0.25rem 0 0 0' }}>{business.region}</p>
                                </div>
                            )}
                            {business.description && (
                                <div>
                                    <span style={{ color: '#8b949e', fontSize: '0.8rem' }}>Description</span>
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                                        {business.description.length > 150 
                                            ? business.description.substring(0, 150) + '...' 
                                            : business.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p style={{ color: '#8b949e' }}>No business profile found.</p>
                    )}
                </div>

                {/* Run First Analysis Card */}
                <div className="card" style={{ 
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, rgba(88, 166, 255, 0.1), rgba(188, 140, 242, 0.1))',
                    border: '1px solid rgba(88, 166, 255, 0.3)'
                }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🚀 Run Your First AI Analysis
                    </h3>
                    <p style={{ color: '#c9d1d9', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                        Discover how visible your business is across AI assistants like ChatGPT, Gemini, and Perplexity. 
                        Get actionable insights to improve your AI presence.
                    </p>
                    <ul style={{ margin: '0 0 1.5rem 0', padding: '0 0 0 1.25rem', color: '#8b949e' }}>
                        <li style={{ marginBottom: '0.5rem' }}>See your AI visibility score</li>
                        <li style={{ marginBottom: '0.5rem' }}>Track competitor performance</li>
                        <li>Get improvement recommendations</li>
                    </ul>
                    <button 
                        className="btn-primary" 
                        style={{ width: '100%' }}
                        onClick={() => navigate('/dashboard/scan')}
                    >
                        🔍 Start AI Visibility Scan
                    </button>
                </div>
            </div>

            {/* Onboarding Data: Competitors & Prompts */}
            {onboardingData && (onboardingData.competitors.length > 0 || onboardingData.prompts.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    
                    {/* Competitors */}
                    {onboardingData.competitors.length > 0 && (
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                🏆 Your Competitors
                            </h3>
                            <p style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                We identified these competitors during your onboarding scan.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {onboardingData.competitors.slice(0, 6).map((competitor, index) => (
                                    <div 
                                        key={index}
                                        style={{ 
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.75rem',
                                            background: 'rgba(48, 54, 61, 0.3)',
                                            borderRadius: '8px'
                                        }}
                                    >
                                        <span style={{ 
                                            width: '24px', 
                                            height: '24px', 
                                            background: 'rgba(88, 166, 255, 0.2)',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.75rem',
                                            color: '#58a6ff'
                                        }}>
                                            {index + 1}
                                        </span>
                                        <span>{competitor.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Prompts */}
                    {onboardingData.prompts.length > 0 && (
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                💬 AI Prompts to Monitor
                            </h3>
                            <p style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                These prompts represent how users might search for your services.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {onboardingData.prompts.slice(0, 6).map((prompt, index) => (
                                    <div 
                                        key={index}
                                        style={{ 
                                            padding: '0.75rem',
                                            background: 'rgba(48, 54, 61, 0.3)',
                                            borderRadius: '8px',
                                            fontSize: '0.9rem',
                                            borderLeft: '3px solid #58a6ff'
                                        }}
                                    >
                                        "{prompt}"
                                    </div>
                                ))}
                            </div>
                            <button 
                                className="btn-secondary" 
                                style={{ width: '100%', marginTop: '1rem' }}
                                onClick={() => navigate('/dashboard/prompts')}
                            >
                                View All Prompts →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Onboarding Checklist at bottom */}
            <div style={{ marginTop: '2rem' }}>
                <OnboardingChecklist />
            </div>
        </div>
    );
}
