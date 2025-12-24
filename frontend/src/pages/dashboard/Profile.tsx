import { useUser } from '@clerk/clerk-react';

export function ProfilePage() {
    const { user } = useUser();

    return (
        <div style={{ maxWidth: '600px' }}>
            <h1 style={{ marginBottom: '2rem' }}>👤 Profile Settings</h1>

            <div className="card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                    <img src={user?.imageUrl} style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid #30363d' }} alt="User Profile" />
                    <div>
                        <h2 style={{ margin: 0 }}>{user?.fullName}</h2>
                        <p style={{ color: '#8b949e', margin: '0.2rem 0' }}>{user?.primaryEmailAddress?.emailAddress}</p>
                        <span style={{ fontSize: '0.75rem', background: 'rgba(88, 166, 255, 0.15)', color: '#58a6ff', padding: '2px 8px', borderRadius: '12px' }}>Personal Account</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#8b949e', marginBottom: '0.5rem' }}>Full Name</label>
                        <div style={{ padding: '0.8rem', background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px' }}>{user?.fullName}</div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#8b949e', marginBottom: '0.5rem' }}>Primary Email</label>
                        <div style={{ padding: '0.8rem', background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px' }}>{user?.primaryEmailAddress?.emailAddress}</div>
                    </div>
                </div>

                <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #30363d' }}>
                    <h3 style={{ color: '#f85149', fontSize: '1rem' }}>Danger Zone</h3>
                    <p style={{ fontSize: '0.85rem', color: '#8b949e' }}>Delete your account and all associated scan data permanently.</p>
                    <button style={{ background: 'transparent', border: '1px solid #f85149', color: '#f85149', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                        Delete Task Data
                    </button>
                </div>
            </div>
        </div>
    );
}
