import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { AITrafficCard } from '../../components/AITrafficCard';

export function DashboardOverview() {
    const { user } = useUser();
    const navigate = useNavigate();
    const [scans, setScans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchScans() {
            if (!user) return;
            // Always filter by user_id for security
            const { data } = await supabase
                .from('scans')
                .select('*, businesses(*)')
                .eq('user_id', user.id) // Security: Only fetch user's own scans
                .order('created_at', { ascending: false });

            if (data) setScans(data);
            setLoading(false);
        }
        fetchScans();
    }, [user]);

    if (loading) return <div>Loading your dashboard...</div>;

    if (scans.length === 0) {
        return (
            <div style={{ textAlign: 'center', marginTop: '4rem' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Welcome, {user?.firstName}!</h2>
                <p style={{ color: '#8b949e', marginBottom: '2rem' }}>You haven't performed any AI visibility scans yet.</p>
                <button className="btn-primary" onClick={() => navigate('/dashboard/scan')}>
                    🚀 Start Your First Scan
                </button>
            </div>
        );
    }

    const latestScan = scans[0];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem' }}>Welcome back, {user?.firstName}!</h1>
                <button className="btn-secondary" onClick={() => navigate('/dashboard/scan')}>+ New Scan</button>
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
