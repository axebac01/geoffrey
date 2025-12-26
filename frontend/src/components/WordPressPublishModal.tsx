import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

interface WordPressSite {
    id: string;
    siteUrl: string;
    siteType: 'wordpress_com' | 'self_hosted';
    siteName: string;
    connectedAt: string;
}

interface WordPressPublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    contentType: 'faq' | 'blog_post';
    geoAssetId: string;
    defaultTitle?: string;
    onSuccess?: () => void;
}

export function WordPressPublishModal({
    isOpen,
    onClose,
    contentType,
    geoAssetId,
    defaultTitle,
    onSuccess,
}: WordPressPublishModalProps) {
    const { getToken } = useAuth();
    const [sites, setSites] = useState<WordPressSite[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<string>('');
    const [title, setTitle] = useState(defaultTitle || '');
    const [status, setStatus] = useState<'draft' | 'publish'>('publish');
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadSites();
            setTitle(defaultTitle || '');
            setStatus('publish');
            setError(null);
            setSuccess(null);
        }
    }, [isOpen, defaultTitle]);

    async function loadSites() {
        try {
            const token = await getToken();
            const res = await fetch('/api/integrations/wordpress/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setSites(data.sites || []);
            if (data.sites && data.sites.length > 0) {
                setSelectedSiteId(data.sites[0].id);
            }
        } catch (error) {
            console.error('Failed to load WordPress sites:', error);
            setError('Failed to load WordPress sites');
        }
    }

    async function handlePublish() {
        if (!selectedSiteId || !title) {
            setError('Please select a site and enter a title');
            return;
        }

        setPublishing(true);
        setError(null);
        setSuccess(null);

        try {
            const token = await getToken();
            const res = await fetch('http://localhost:3000/api/integrations/wordpress/publish', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    integrationId: selectedSiteId,
                    contentType,
                    geoAssetId,
                    title,
                    status,
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to publish');
            }

            const data = await res.json();
            setSuccess(`Successfully published! View post: ${data.post.url}`);
            
            setTimeout(() => {
                if (onSuccess) onSuccess();
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to publish to WordPress');
        } finally {
            setPublishing(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div style={{
                background: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
                        Publish to WordPress
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#8b949e',
                            cursor: 'pointer',
                            fontSize: '1.5rem',
                            padding: 0,
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ×
                    </button>
                </div>

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

                {success && (
                    <div style={{
                        background: 'rgba(35, 134, 54, 0.1)',
                        border: '1px solid rgba(35, 134, 54, 0.3)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        marginBottom: '1rem',
                        color: '#3fb950',
                        fontSize: '0.85rem'
                    }}>
                        {success}
                    </div>
                )}

                {sites.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <p style={{ color: '#8b949e', marginBottom: '1rem' }}>
                            No WordPress sites connected.
                        </p>
                        <a
                            href="/dashboard/settings?tab=integrations"
                            className="btn-primary"
                            style={{ textDecoration: 'none', display: 'inline-block' }}
                        >
                            Connect WordPress Site
                        </a>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#c9d1d9' }}>
                                WordPress Site
                            </label>
                            <select
                                value={selectedSiteId}
                                onChange={(e) => setSelectedSiteId(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: '#161b22',
                                    border: '1px solid #30363d',
                                    borderRadius: '4px',
                                    color: '#c9d1d9',
                                    fontSize: '0.9rem'
                                }}
                            >
                                {sites.map(site => (
                                    <option key={site.id} value={site.id}>
                                        {site.siteName} ({site.siteUrl})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#c9d1d9' }}>
                                Post Title
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={contentType === 'faq' ? 'Frequently Asked Questions' : 'Blog Post Title'}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: '#161b22',
                                    border: '1px solid #30363d',
                                    borderRadius: '4px',
                                    color: '#c9d1d9',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#c9d1d9' }}>
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as 'draft' | 'publish')}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: '#161b22',
                                    border: '1px solid #30363d',
                                    borderRadius: '4px',
                                    color: '#c9d1d9',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <option value="draft">Draft</option>
                                <option value="publish">Publish</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                            <button
                                onClick={onClose}
                                className="btn-secondary"
                                disabled={publishing}
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePublish}
                                className="btn-primary"
                                disabled={publishing || !selectedSiteId || !title}
                                style={{ flex: 1 }}
                            >
                                {publishing ? 'Publishing...' : 'Publish'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

