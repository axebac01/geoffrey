import { useState, useEffect } from 'react';
import { useAuth, useUser, UserButton } from '@clerk/clerk-react';

interface BusinessProfile {
    id: string;
    business_name: string;
    industry: string;
    region: string;
    website: string;
    description: string;
    logo_url?: string;
    plan: string;
    created_at: string;
}

export function ProfilePage() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [profile, setProfile] = useState<BusinessProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        business_name: '',
        industry: '',
        region: '',
        website: '',
        description: ''
    });

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        try {
            const token = await getToken();
            const res = await fetch('/api/user/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.profile) {
                setProfile(data.profile);
                setFormData({
                    business_name: data.profile.business_name || '',
                    industry: data.profile.industry || '',
                    region: data.profile.region || '',
                    website: data.profile.website || '',
                    description: data.profile.description || ''
                });
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    }

    async function saveProfile() {
        setSaving(true);
        try {
            const token = await getToken();
            const res = await fetch('/api/businesses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    businessName: formData.business_name,
                    industry: formData.industry,
                    region: formData.region,
                    website: formData.website,
                    description: formData.description
                })
            });
            
            if (res.ok) {
                await loadProfile();
                setIsEditing(false);
                
                // Update checklist
                await fetch('/api/geo/checklist', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ item: 'profile_completed', value: true })
                });
            }
        } catch (error) {
            console.error('Failed to save profile:', error);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: '#8b949e' }}>Loading profile...</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '800px' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>👤 Profile</h1>
                <p style={{ color: '#8b949e' }}>
                    Manage your account and business information.
                </p>
            </div>

            {/* Account Info */}
            <section className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Account</h2>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ transform: 'scale(1.5)', transformOrigin: 'left center' }}>
                        <UserButton afterSignOutUrl="/" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                            {user?.fullName || 'No name set'}
                        </h3>
                        <p style={{ margin: 0, color: '#8b949e', fontSize: '0.9rem' }}>
                            {user?.primaryEmailAddress?.emailAddress}
                        </p>
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#58a6ff' }}>
                            Click avatar to manage account settings
                        </p>
                    </div>
                </div>
            </section>

            {/* Business Profile */}
            <section className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Business Profile</h2>
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="btn-secondary"
                            style={{ fontSize: '0.85rem' }}
                        >
                            ✏️ Edit
                        </button>
                    )}
                </div>

                {!profile && !isEditing ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏢</div>
                        <p style={{ color: '#8b949e', marginBottom: '1rem' }}>
                            No business profile yet. Complete a scan to auto-fill or add manually.
                        </p>
                        <button onClick={() => setIsEditing(true)} className="btn-primary">
                            Add Business Info
                        </button>
                    </div>
                ) : isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#8b949e', fontSize: '0.85rem' }}>
                                Business Name
                            </label>
                            <input
                                type="text"
                                value={formData.business_name}
                                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                                placeholder="Acme Inc"
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#8b949e', fontSize: '0.85rem' }}>
                                    Industry
                                </label>
                                <input
                                    type="text"
                                    value={formData.industry}
                                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                    placeholder="Software Development"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#8b949e', fontSize: '0.85rem' }}>
                                    Region
                                </label>
                                <input
                                    type="text"
                                    value={formData.region}
                                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                                    placeholder="Stockholm, Sweden"
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#8b949e', fontSize: '0.85rem' }}>
                                Website
                            </label>
                            <input
                                type="url"
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                placeholder="https://example.com"
                                style={inputStyle}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#8b949e', fontSize: '0.85rem' }}>
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of your business..."
                                rows={3}
                                style={{ ...inputStyle, resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <button
                                onClick={saveProfile}
                                disabled={saving}
                                className="btn-primary"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    if (profile) {
                                        setFormData({
                                            business_name: profile.business_name || '',
                                            industry: profile.industry || '',
                                            region: profile.region || '',
                                            website: profile.website || '',
                                            description: profile.description || ''
                                        });
                                    }
                                }}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {profile?.logo_url ? (
                                <img 
                                    src={profile.logo_url} 
                                    alt={profile.business_name}
                                    style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '12px',
                                        objectFit: 'cover'
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #58a6ff, #bc8cf2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.5rem',
                                    color: '#fff',
                                    fontWeight: 600
                                }}>
                                    {profile?.business_name?.charAt(0) || '?'}
                                </div>
                            )}
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{profile?.business_name}</h3>
                                <p style={{ margin: 0, color: '#8b949e', fontSize: '0.9rem' }}>{profile?.industry}</p>
                            </div>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '1rem',
                            marginTop: '1rem'
                        }}>
                            <InfoItem label="Region" value={profile?.region} />
                            <InfoItem label="Website" value={profile?.website} isLink />
                            <InfoItem label="Plan" value={profile?.plan || 'Free'} />
                            <InfoItem 
                                label="Member Since" 
                                value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'} 
                            />
                        </div>

                        {profile?.description && (
                            <div style={{ marginTop: '1rem' }}>
                                <div style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Description</div>
                                <p style={{ color: '#c9d1d9', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                    {profile.description}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(13, 17, 23, 0.8)',
    border: '1px solid #30363d',
    borderRadius: '6px',
    color: '#c9d1d9',
    fontSize: '0.95rem'
};

function InfoItem({ label, value, isLink }: { label: string; value?: string; isLink?: boolean }) {
    return (
        <div>
            <div style={{ color: '#8b949e', fontSize: '0.8rem', marginBottom: '0.25rem' }}>{label}</div>
            {isLink && value ? (
                <a 
                    href={value.startsWith('http') ? value : `https://${value}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#58a6ff', fontSize: '0.95rem', textDecoration: 'none' }}
                >
                    {value}
                </a>
            ) : (
                <div style={{ color: '#c9d1d9', fontSize: '0.95rem' }}>{value || '-'}</div>
            )}
        </div>
    );
}
