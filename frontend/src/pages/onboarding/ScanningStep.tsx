import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { AuthLayout } from '../../components/layouts/AuthLayout';
import { getApiUrl } from '../../lib/api';

const scanningSteps = [
    { id: 1, label: 'Fetching website content', icon: '🌐', estimatedTime: 2 },
    { id: 2, label: 'Analyzing business & generating prompts', icon: '🔍', estimatedTime: 7 },
    { id: 3, label: 'Finding competitors', icon: '🏢', estimatedTime: 6 },
    { id: 4, label: 'Validating competitors', icon: '✅', estimatedTime: 5 },
];

export function ScanningStep() {
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [scanComplete, setScanComplete] = useState(false);
    const scanStarted = useRef(false);

    useEffect(() => {
        async function checkStepAndScan() {
            if (scanStarted.current) return;
            scanStarted.current = true;
            
            try {
                // Get token ONCE at the start
                const token = await getToken();
                
                if (!token) {
                    console.error('No token available');
                    navigate('/onboarding/company');
                    return;
                }

                // Check onboarding status
                const res = await fetch('/api/onboarding/status', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    const onboarding = data.onboarding;
                    
                    // Check if user should be on this step
                    if (onboarding && !onboarding.completed_steps?.includes('company')) {
                        navigate('/onboarding/company');
                        return;
                    }
                }

                // Get company data from backend
                const companyRes = await fetch('/api/onboarding/company-data', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (companyRes.ok) {
                    const companyDataResult = await companyRes.json();
                    if (companyDataResult.companyData?.website) {
                        performScan(companyDataResult.companyData.website);
                        return;
                    }
                }

                // If we can't get website, redirect to company step
                navigate('/onboarding/company');
            } catch (error) {
                console.error('Failed to check onboarding status:', error);
                setError('Failed to initialize scan. Please try again.');
            }
        }

        checkStepAndScan();
    }, [navigate, getToken]);

    useEffect(() => {
        // Animate through steps based on estimated times
        // But the LAST step only completes when scanComplete is true
        if (currentStep < scanningSteps.length) {
            const isLastStep = currentStep === scanningSteps.length - 1;
            
            // If it's the last step and scan isn't complete, wait
            if (isLastStep && !scanComplete) {
                return;
            }
            
            const step = scanningSteps[currentStep];
            const estimatedTime = (step.estimatedTime || 4) * 1000; // Convert to milliseconds
            
            const timer = setTimeout(() => {
                setCurrentStep((prev) => prev + 1);
            }, estimatedTime);
            return () => clearTimeout(timer);
        }
    }, [currentStep, scanComplete]);

    // When scan completes and we're on the last step, navigate after a short delay
    useEffect(() => {
        if (scanComplete && currentStep >= scanningSteps.length) {
            setTimeout(() => {
                navigate('/onboarding/review');
            }, 500);
        }
    }, [scanComplete, currentStep, navigate]);

    const performScan = async (url: string) => {
        try {
            const token = await getToken();
            
            const res = await fetch(getApiUrl('/api/scan-website'), {
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
            
            // Store scan results in backend for review step
            await fetch(getApiUrl('/api/onboarding/scan-result'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ scanData: data })
            });
            
            // Update onboarding progress
            await fetch(getApiUrl('/api/onboarding/status'), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentStep: 'review',
                    completedSteps: ['company', 'scanning']
                })
            });
            
            // Mark scan as complete - this triggers the last step to finish
            setScanComplete(true);
        } catch (err: any) {
            console.error('Scan error:', err);
            setError(err.message || 'Failed to scan website');
        }
    };

    return (
        <AuthLayout
            title="Scanning your website"
            subtitle="We're analyzing your business to optimize AI visibility"
            leftHeadline="Deep analysis in progress"
            leftDescription="Our AI is extracting business information, identifying market positioning, detecting competitors, and generating strategic prompts for AI visibility testing."
            leftStats={[
                { value: '3', label: 'AI passes' },
                { value: '~20s', label: 'thorough analysis' },
                { value: '100%', label: 'AI-powered' }
            ]}
            showTestimonials={false}
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
                        {/* Futuristic AI Scanner Animation */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: '2rem',
                            height: '120px'
                        }}>
                            <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                                {/* Outer pulsing ring */}
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    borderRadius: '50%',
                                    border: '2px solid rgba(88, 166, 255, 0.3)',
                                    animation: 'pulse-outer 2s ease-in-out infinite'
                                }} />
                                {/* Middle rotating ring */}
                                <div style={{
                                    position: 'absolute',
                                    inset: '10px',
                                    borderRadius: '50%',
                                    border: '2px solid transparent',
                                    borderTopColor: '#58a6ff',
                                    borderRightColor: '#bc8cf2',
                                    animation: 'spin 1.5s linear infinite'
                                }} />
                                {/* Inner breathing circle */}
                                <div style={{
                                    position: 'absolute',
                                    inset: '20px',
                                    borderRadius: '50%',
                                    background: 'radial-gradient(circle, rgba(88, 166, 255, 0.2) 0%, rgba(188, 140, 242, 0.1) 100%)',
                                    animation: 'breathe 2s ease-in-out infinite'
                                }} />
                                {/* Center glow */}
                                <div style={{
                                    position: 'absolute',
                                    inset: '35px',
                                    borderRadius: '50%',
                                    background: 'radial-gradient(circle, rgba(88, 166, 255, 0.8) 0%, rgba(88, 166, 255, 0) 70%)',
                                    animation: 'glow 1.5s ease-in-out infinite alternate'
                                }} />
                                {/* Scanning line */}
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    width: '50px',
                                    height: '2px',
                                    background: 'linear-gradient(90deg, transparent, #58a6ff, transparent)',
                                    transformOrigin: '0 0',
                                    animation: 'scan-line 2s linear infinite'
                                }} />
                            </div>
                            <style>{`
                                @keyframes spin {
                                    to { transform: rotate(360deg); }
                                }
                                @keyframes pulse-outer {
                                    0%, 100% { transform: scale(1); opacity: 0.5; }
                                    50% { transform: scale(1.15); opacity: 1; }
                                }
                                @keyframes breathe {
                                    0%, 100% { transform: scale(0.9); opacity: 0.5; }
                                    50% { transform: scale(1.1); opacity: 1; }
                                }
                                @keyframes glow {
                                    0% { opacity: 0.5; transform: scale(0.8); }
                                    100% { opacity: 1; transform: scale(1.2); }
                                }
                                @keyframes scan-line {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            `}</style>
                        </div>

                        {/* Progress steps */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {scanningSteps.map((step, index) => {
                                const isActive = index === currentStep;
                                const isComplete = index < currentStep;
                                const isWaiting = index === currentStep && index === scanningSteps.length - 1 && !scanComplete;
                                
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
                                            {isWaiting && <span style={{ color: '#8b949e', marginLeft: '0.5rem' }}>(finishing...)</span>}
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
                            {scanComplete ? 'Analysis complete! Preparing results...' : 'This usually takes 20-30 seconds'}
                        </p>
                    </>
                )}
            </div>
        </AuthLayout>
    );
}

