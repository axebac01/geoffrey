import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

interface WordPressSite {
    id: string;
    siteUrl: string;
    siteType: 'wordpress_com' | 'self_hosted';
    siteName: string;
    connectedAt: string;
}

interface WordPressConnectionProps {
    sites: WordPressSite[];
    onConnect: (siteType: 'wordpress_com' | 'self_hosted') => void;
    onDisconnect: (siteId: string) => void;
    onManualConnect: (siteUrl: string, applicationPassword: string, siteName?: string) => Promise<void>;
}

export function WordPressConnection({
    sites,
    onConnect,
    onDisconnect,
    onManualConnect,
}: WordPressConnectionProps) {
    const { getToken } = useAuth();
    const [showManualForm, setShowManualForm] = useState(false);
    const [manualSiteUrl, setManualSiteUrl] = useState('');
    const [manualPassword, setManualPassword] = useState('');
    const [manualSiteName, setManualSiteName] = useState('');
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleManualConnect() {
        if (!manualSiteUrl || !manualPassword) {
            setError('Please enter site URL and application password');
            return;
        }

        setConnecting(true);
        setError(null);

        try {
            await onManualConnect(manualSiteUrl, manualPassword, manualSiteName || undefined);
            setShowManualForm(false);
            setManualSiteUrl('');
            setManualPassword('');
            setManualSiteName('');
        } catch (err: any) {
            setError(err.message || 'Failed to connect WordPress site');
        } finally {
            setConnecting(false);
        }
    }

    return (
        <section className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📝</span>
                WordPress Integration
                {sites.length > 0 && (
                    <span style={{
                        background: 'rgba(35, 134, 54, 0.2)',
                        color: '#3fb950',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '999px',
                        fontSize: '0.8rem'
                    }}>
                        {sites.length} Connected
                    </span>
                )}
            </h2>
            <p style={{ color: '#8b949e', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Connect your WordPress site to publish FAQ pages and blog posts directly from Geoffrey.ai.
            </p>

            {error && (
                <div style={{
                    background: 'rgba(218, 54, 51, 0.1)',
                    border: '1px solid rgba(218, 54, 51, 0.3)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    color: '#f85149',
                    fontSize: '0.85rem'
                }}>
                    {error}
                </div>
            )}

            {sites.length === 0 ? (
                <div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                        <button
                            onClick={() => onConnect('wordpress_com')}
                            className="btn-primary"
                            style={{ flex: 1 }}
                        >
                            🔗 Connect WordPress.com
                        </button>
                        <button
                            onClick={() => setShowManualForm(!showManualForm)}
                            className="btn-secondary"
                            style={{ flex: 1 }}
                        >
                            {showManualForm ? 'Cancel' : 'Connect Self-Hosted'}
                        </button>
                    </div>

                    {showManualForm && (
                        <div style={{
                            background: '#161b22',
                            borderRadius: '8px',
                            padding: '1.5rem',
                            marginTop: '1rem'
                        }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Connect Self-Hosted WordPress</h3>
                            <p style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                You'll need to create an Application Password in WordPress:
                            </p>
                            <ol style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                                <li>Go to Users → Profile in your WordPress admin</li>
                                <li>Scroll to "Application Passwords" section</li>
                                <li>Create a new application password</li>
                                <li>Copy the password (you won't see it again)</li>
                            </ol>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#c9d1d9' }}>
                                        WordPress Site URL
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="https://yoursite.com"
                                        value={manualSiteUrl}
                                        onChange={(e) => setManualSiteUrl(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            background: '#0d1117',
                                            border: '1px solid #30363d',
                                            borderRadius: '4px',
                                            color: '#c9d1d9',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#c9d1d9' }}>
                                        Site Name (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="My WordPress Site"
                                        value={manualSiteName}
                                        onChange={(e) => setManualSiteName(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            background: '#0d1117',
                                            border: '1px solid #30363d',
                                            borderRadius: '4px',
                                            color: '#c9d1d9',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#c9d1d9' }}>
                                        Application Password
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                                        value={manualPassword}
                                        onChange={(e) => setManualPassword(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            background: '#0d1117',
                                            border: '1px solid #30363d',
                                            borderRadius: '4px',
                                            color: '#c9d1d9',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleManualConnect}
                                    disabled={connecting || !manualSiteUrl || !manualPassword}
                                    className="btn-primary"
                                >
                                    {connecting ? 'Connecting...' : 'Connect'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {sites.map(site => (
                        <div
                            key={site.id}
                            style={{
                                background: '#161b22',
                                borderRadius: '8px',
                                padding: '1rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                                    {site.siteName}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#8b949e' }}>
                                    {site.siteUrl}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6e7681', marginTop: '0.25rem' }}>
                                    {site.siteType === 'wordpress_com' ? 'WordPress.com' : 'Self-Hosted'}
                                </div>
                            </div>
                            <button
                                onClick={() => onDisconnect(site.id)}
                                className="btn-secondary"
                                style={{ fontSize: '0.85rem' }}
                            >
                                Disconnect
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => {
                            if (sites.length === 0 || window.confirm('Connect another WordPress site?')) {
                                onConnect('wordpress_com');
                            }
                        }}
                        className="btn-secondary"
                        style={{ marginTop: '0.5rem' }}
                    >
                        + Connect Another Site
                    </button>
                </div>
            )}
        </section>
    );
}

