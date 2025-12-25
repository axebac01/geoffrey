import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useSearchParams } from 'react-router-dom';

interface GA4Status {
    connected: boolean;
    propertyConfigured: boolean;
    propertyId?: string;
    propertyName?: string;
    connectedAt?: string;
}

interface GA4Property {
    propertyId: string;
    displayName: string;
    accountName: string;
}

interface TrackingSite {
    id: string;
    domain: string;
    publicKey: string;
    isActive: boolean;
    scriptTag: string;
    createdAt: string;
}

export function SettingsPage() {
    const { getToken } = useAuth();
    const [searchParams] = useSearchParams();
    const step = searchParams.get('step');
    const errorParam = searchParams.get('error');

    const [ga4Status, setGa4Status] = useState<GA4Status | null>(null);
    const [properties, setProperties] = useState<GA4Property[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<string>('');
    const [trackingSites, setTrackingSites] = useState<TrackingSite[]>([]);
    const [newDomain, setNewDomain] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadGA4Status();
        loadTrackingSites();
        
        // Check for error in URL params
        if (errorParam === 'oauth_denied') {
            setError('OAuth authorization was denied. Please try again.');
        } else if (errorParam === 'oauth_failed') {
            setError('OAuth connection failed. Please check your configuration and try again.');
        } else if (errorParam === 'oauth_config_missing') {
            setError('OAuth configuration is missing. Please check that GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI are set in your .env file.');
        } else if (errorParam === 'oauth_invalid_request') {
            setError('Invalid OAuth request. Please try connecting again.');
        } else if (errorParam === 'oauth_state_expired') {
            setError('OAuth session expired. Please try connecting again.');
        }
        
        // Clear error from URL
        if (errorParam) {
            window.history.replaceState({}, '', '/dashboard/settings');
        }
    }, [errorParam]);

    useEffect(() => {
        if (step === 'select-property') {
            loadProperties();
        }
    }, [step]);

    async function loadGA4Status() {
        try {
            const token = await getToken();
            const res = await fetch('/api/integrations/ga4/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setGa4Status(data);
        } catch (error) {
            console.error('Failed to load GA4 status:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadProperties() {
        try {
            const token = await getToken();
            const res = await fetch('/api/integrations/ga4/properties', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setProperties(data.properties || []);
        } catch (error) {
            console.error('Failed to load properties:', error);
        }
    }

    async function loadTrackingSites() {
        try {
            const token = await getToken();
            const res = await fetch('/api/tracking/sites', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setTrackingSites(data.sites || []);
        } catch (error) {
            console.error('Failed to load tracking sites:', error);
        }
    }

    async function saveProperty() {
        if (!selectedProperty) return;
        setSaving(true);

        try {
            const token = await getToken();
            const property = properties.find(p => p.propertyId === selectedProperty);
            
            await fetch('/api/integrations/ga4/property', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    propertyId: selectedProperty,
                    displayName: property?.displayName
                })
            });

            await loadGA4Status();
            window.history.replaceState({}, '', '/dashboard/settings');
        } catch (error) {
            console.error('Failed to save property:', error);
        } finally {
            setSaving(false);
        }
    }

    async function disconnectGA4() {
        if (!confirm('Are you sure you want to disconnect GA4?')) return;

        try {
            const token = await getToken();
            await fetch('/api/integrations/ga4/disconnect', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            setGa4Status({ connected: false, propertyConfigured: false });
        } catch (error) {
            console.error('Failed to disconnect GA4:', error);
        }
    }

    async function addTrackingSite() {
        if (!newDomain) return;
        setSaving(true);

        try {
            const token = await getToken();
            await fetch('/api/tracking/sites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ domain: newDomain })
            });

            setNewDomain('');
            await loadTrackingSites();
        } catch (error) {
            console.error('Failed to add tracking site:', error);
        } finally {
            setSaving(false);
        }
    }

    async function deleteTrackingSite(id: string) {
        if (!confirm('Are you sure you want to delete this tracking site?')) return;

        try {
            const token = await getToken();
            await fetch(`/api/tracking/sites/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            await loadTrackingSites();
        } catch (error) {
            console.error('Failed to delete tracking site:', error);
        }
    }

    function copyToClipboard(text: string, id: string) {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    }

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: '#8b949e' }}>Loading settings...</p>
            </div>
        );
    }

    // Property Selection View
    if (step === 'select-property') {
        return (
            <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '0 1rem' }}>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Select GA4 Property</h1>
                <p style={{ color: '#8b949e', marginBottom: '2rem' }}>
                    Choose which Google Analytics 4 property to connect for AI traffic tracking.
                </p>

                {properties.length === 0 ? (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                        <p style={{ color: '#8b949e' }}>Loading properties...</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                            {properties.map(property => (
                                <label
                                    key={property.propertyId}
                                    className="card"
                                    style={{
                                        padding: '1rem',
                                        cursor: 'pointer',
                                        border: selectedProperty === property.propertyId
                                            ? '2px solid #58a6ff'
                                            : '1px solid #30363d',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="property"
                                        value={property.propertyId}
                                        checked={selectedProperty === property.propertyId}
                                        onChange={(e) => setSelectedProperty(e.target.value)}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{property.displayName}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#8b949e' }}>
                                            {property.accountName} • ID: {property.propertyId}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>

                        <button
                            className="btn-primary"
                            onClick={saveProperty}
                            disabled={!selectedProperty || saving}
                            style={{ width: '100%' }}
                        >
                            {saving ? 'Saving...' : 'Save & Continue'}
                        </button>
                    </>
                )}
            </div>
        );
    }

    // Main Settings View
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Settings & Integrations</h1>

            {/* Error Message */}
            {error && (
                <div style={{
                    background: 'rgba(218, 54, 51, 0.1)',
                    border: '1px solid rgba(218, 54, 51, 0.3)',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '2rem',
                    color: '#f85149',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#f85149',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            padding: '0 0.5rem'
                        }}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* GA4 Integration Section */}
            <section className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>📊</span>
                            Google Analytics 4
                        </h2>
                        <p style={{ color: '#8b949e', fontSize: '0.9rem' }}>
                            Connect GA4 to automatically track AI-referred traffic to your website.
                        </p>
                    </div>
                    {ga4Status?.connected && (
                        <span style={{
                            background: 'rgba(35, 134, 54, 0.2)',
                            color: '#3fb950',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '999px',
                            fontSize: '0.8rem'
                        }}>
                            Connected
                        </span>
                    )}
                </div>

                {!ga4Status?.connected ? (
                    <button
                        onClick={async () => {
                            try {
                                const token = await getToken();
                                const res = await fetch('http://localhost:3000/api/integrations/ga4/connect', {
                                    method: 'GET',
                                    headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                    }
                                });
                                
                                if (res.ok) {
                                    const data = await res.json();
                                    if (data.redirectUrl) {
                                        // Redirect to Google OAuth
                                        window.location.href = data.redirectUrl;
                                    } else {
                                        setError('No redirect URL received from server');
                                    }
                                } else {
                                    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
                                    setError(error.error || 'Failed to connect to GA4');
                                }
                            } catch (error: any) {
                                console.error('Failed to connect GA4:', error);
                                setError('Failed to connect. Please try again.');
                            }
                        }}
                        className="btn-primary"
                    >
                        🔗 Connect Google Analytics 4
                    </button>
                ) : ga4Status.propertyConfigured ? (
                    <div>
                        <div style={{
                            background: '#161b22',
                            borderRadius: '8px',
                            padding: '1rem',
                            marginBottom: '1rem'
                        }}>
                            <div style={{ fontSize: '0.85rem', color: '#8b949e' }}>Connected Property</div>
                            <div style={{ fontWeight: 500 }}>{ga4Status.propertyName}</div>
                            <div style={{ fontSize: '0.85rem', color: '#8b949e' }}>ID: {ga4Status.propertyId}</div>
                        </div>
                        <button
                            className="btn-secondary"
                            onClick={disconnectGA4}
                            style={{ fontSize: '0.85rem' }}
                        >
                            Disconnect
                        </button>
                    </div>
                ) : (
                    <div>
                        <p style={{ color: '#d29922', marginBottom: '1rem' }}>
                            ⚠️ GA4 connected, but no property selected.
                        </p>
                        <a
                            href="/dashboard/settings?step=select-property"
                            className="btn-primary"
                            style={{ display: 'inline-block', textDecoration: 'none' }}
                        >
                            Select Property
                        </a>
                    </div>
                )}
            </section>

            {/* Direct Tracking Script Section */}
            <section className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>📝</span>
                    Direct Tracking Script
                    <span style={{
                        background: 'rgba(88, 166, 255, 0.2)',
                        color: '#58a6ff',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem'
                    }}>
                        Optional
                    </span>
                </h2>
                <p style={{ color: '#8b949e', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Install a lightweight script to track AI clicks without GA4. Useful if you don't use Google Analytics.
                </p>

                {/* Add new site */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <input
                        type="text"
                        placeholder="example.com"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button
                        className="btn-primary"
                        onClick={addTrackingSite}
                        disabled={!newDomain || saving}
                    >
                        Add Site
                    </button>
                </div>

                {/* List of tracking sites */}
                {trackingSites.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {trackingSites.map(site => (
                            <div
                                key={site.id}
                                style={{
                                    background: '#161b22',
                                    borderRadius: '8px',
                                    padding: '1rem'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <div style={{ fontWeight: 500 }}>{site.domain}</div>
                                    <button
                                        onClick={() => deleteTrackingSite(site.id)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#f85149',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <code style={{
                                        display: 'block',
                                        background: '#0d1117',
                                        padding: '0.75rem',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        overflowX: 'auto',
                                        color: '#8b949e'
                                    }}>
                                        {site.scriptTag}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(site.scriptTag, site.id)}
                                        style={{
                                            position: 'absolute',
                                            top: '0.5rem',
                                            right: '0.5rem',
                                            background: '#21262d',
                                            border: '1px solid #30363d',
                                            borderRadius: '4px',
                                            padding: '0.25rem 0.5rem',
                                            cursor: 'pointer',
                                            color: '#c9d1d9',
                                            fontSize: '0.75rem'
                                        }}
                                    >
                                        {copied === site.id ? '✓ Copied' : 'Copy'}
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: '#8b949e', marginTop: '0.5rem' }}>
                                    Add this script to the &lt;head&gt; of your website.
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

