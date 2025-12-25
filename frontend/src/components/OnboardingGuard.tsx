import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
    const { getToken, isSignedIn } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

    useEffect(() => {
        async function checkOnboarding() {
            if (!isSignedIn) {
                setLoading(false);
                return;
            }

            try {
                const token = await getToken();
                const res = await fetch('/api/onboarding/next-step', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) {
                    // API failed - redirect to onboarding start
                    console.error('Onboarding check failed, redirecting to onboarding');
                    navigate('/onboarding/company');
                    return;
                }

                const data = await res.json();
                
                if (data.isComplete) {
                    setIsOnboardingComplete(true);
                    setLoading(false);
                } else {
                    // Redirect to the next step
                    navigate(`/onboarding/${data.nextStep}`);
                }
            } catch (error) {
                console.error('Failed to check onboarding:', error);
                // On any error, redirect to onboarding start
                navigate('/onboarding/company');
            }
        }

        checkOnboarding();
    }, [isSignedIn, getToken, navigate]);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: '#0d1117'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
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
                    <p style={{ color: '#8b949e' }}>Loading...</p>
                </div>
            </div>
        );
    }

    if (!isOnboardingComplete) {
        return null; // Will redirect
    }

    return <>{children}</>;
}

