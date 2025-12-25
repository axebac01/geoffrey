import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { AuthLayout } from '../../components/layouts/AuthLayout';

const scanningSteps = [
    { id: 1, label: 'Fetching website content', icon: '🌐' },
    { id: 2, label: 'Analyzing business information', icon: '🔍' },
    { id: 3, label: 'Identifying market positioning', icon: '📊' },
    { id: 4, label: 'Detecting competitors', icon: '🏢' },
    { id: 5, label: 'Generating AI prompts', icon: '✨' },
];

export function ScanningStep() {
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const companyData = sessionStorage.getItem('onboarding_company');
        
        if (!companyData) {
            navigate('/onboarding/company');
            return;
        }

        const { website } = JSON.parse(companyData);
        performScan(website);
    }, []);

    useEffect(() => {
        // Animate through steps
        if (currentStep < scanningSteps.length) {
            const timer = setTimeout(() => {
                setCurrentStep((prev) => prev + 1);
            }, 3000); // Each step takes about 3 seconds
            return () => clearTimeout(timer);
        }
    }, [currentStep]);

    const performScan = async (url: string) => {
        try {
            const token = await getToken();
            
            const res = await fetch('/api/scan-website', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ url })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || 'Scan failed');
            }

            const data = await res.json();
            
            // Store scan results for review step
            sessionStorage.setItem('onboarding_scan_result', JSON.stringify(data));
            
            // Navigate to review after animation completes
            setTimeout(() => {
                navigate('/onboarding/review');
            }, 1000);
        } catch (err: any) {
            console.error('Scan error:', err);
            setError(err.message || 'Failed to scan website');
        }
    };

    return (
        <AuthLayout
            title="Scanning your website"
            subtitle="We're analyzing your business to optimize AI visibility"
        >
            <div style={{ padding: '1rem 0' }}>
                {error ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            background: 'rgba(218, 54, 51, 0.1)',
                            border: '1px solid rgba(218, 54, 51, 0.3)',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❌</div>
                            <p style={{ color: '#f85149', marginBottom: '1rem' }}>{error}</p>
                        </div>
                        <button
                            onClick={() => navigate('/onboarding/company')}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: 'rgba(48, 54, 61, 0.5)',
                                border: '1px solid #30363d',
                                borderRadius: '8px',
                                color: '#c9d1d9',
                                cursor: 'pointer'
                            }}
                        >
                            ← Try Again
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Animated spinner */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: '2rem'
                        }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                border: '3px solid rgba(48, 54, 61, 0.5)',
                                borderTopColor: '#58a6ff',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                            <style>{`
                                @keyframes spin {
                                    to { transform: rotate(360deg); }
                                }
                            `}</style>
                        </div>

                        {/* Progress steps */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {scanningSteps.map((step, index) => {
                                const isActive = index === currentStep;
                                const isComplete = index < currentStep;
                                
                                return (
                                    <div
                                        key={step.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            padding: '0.75rem 1rem',
                                            background: isActive 
                                                ? 'rgba(88, 166, 255, 0.1)' 
                                                : 'transparent',
                                            border: isActive 
                                                ? '1px solid rgba(88, 166, 255, 0.3)' 
                                                : '1px solid transparent',
                                            borderRadius: '8px',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: isComplete 
                                                ? 'rgba(35, 134, 54, 0.2)' 
                                                : isActive 
                                                    ? 'rgba(88, 166, 255, 0.2)' 
                                                    : 'rgba(48, 54, 61, 0.3)',
                                            border: isComplete 
                                                ? '1px solid #3fb950' 
                                                : isActive 
                                                    ? '1px solid #58a6ff' 
                                                    : '1px solid #30363d',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.9rem',
                                            transition: 'all 0.3s ease'
                                        }}>
                                            {isComplete ? '✓' : step.icon}
                                        </div>
                                        <span style={{
                                            color: isComplete 
                                                ? '#3fb950' 
                                                : isActive 
                                                    ? '#c9d1d9' 
                                                    : '#8b949e',
                                            fontWeight: isActive ? 500 : 400,
                                            transition: 'color 0.3s ease'
                                        }}>
                                            {step.label}
                                        </span>
                                        {isActive && (
                                            <div style={{
                                                marginLeft: 'auto',
                                                width: '16px',
                                                height: '16px',
                                                border: '2px solid #58a6ff',
                                                borderTopColor: 'transparent',
                                                borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite'
                                            }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <p style={{
                            textAlign: 'center',
                            color: '#8b949e',
                            fontSize: '0.85rem',
                            marginTop: '2rem'
                        }}>
                            This usually takes 20-30 seconds
                        </p>
                    </>
                )}
            </div>
        </AuthLayout>
    );
}

