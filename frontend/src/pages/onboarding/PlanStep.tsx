import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { AuthLayout } from '../../components/layouts/AuthLayout';
import type { EntitySnapshot } from '../../types';

interface OnboardingData {
    snapshot: EntitySnapshot;
    prompts: string[];
    competitors: string[];
}

const plans = [
    {
        id: 'basic',
        name: 'Basic',
        price: '199',
        currency: '€',
        period: '/month',
        description: 'Perfect for small businesses',
        features: [
            'AI visibility monitoring',
            'Up to 20 search queries',
            'Monthly reports',
            'Basic GEO recommendations',
            'Email support'
        ],
        highlighted: false
    },
    {
        id: 'standard',
        name: 'Standard',
        price: '499',
        currency: '€',
        period: '/month',
        description: 'For growing companies',
        features: [
            'Everything in Basic',
            'Up to 100 search queries',
            'Weekly reports',
            'Advanced GEO optimization',
            'Competitor tracking (10)',
            'Priority support',
            'FAQ & Schema generation'
        ],
        highlighted: true
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 'Custom',
        currency: '',
        period: '',
        description: 'Enterprise solutions',
        features: [
            'Everything in Standard',
            'Unlimited search queries',
            'Daily monitoring',
            'Custom integrations',
            'Dedicated account manager',
            'API access',
            'White-label options'
        ],
        highlighted: false
    }
];

export function PlanStep() {
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const { user } = useUser();
    const [selectedPlan, setSelectedPlan] = useState<string>('standard');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);

    useEffect(() => {
        const storedData = sessionStorage.getItem('onboarding_final');
        
        if (!storedData) {
            navigate('/onboarding/company');
            return;
        }

        setOnboardingData(JSON.parse(storedData));
    }, [navigate]);

    const handleStartTrial = async () => {
        if (!onboardingData) return;
        
        setIsSubmitting(true);

        try {
            const token = await getToken();

            // For now, skip Stripe and go directly to dashboard
            // In production, this would redirect to Stripe Checkout
            
            // Store business data in Supabase
            const response = await fetch('/api/businesses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    businessName: onboardingData.snapshot.businessName,
                    industry: onboardingData.snapshot.industry,
                    region: onboardingData.snapshot.region,
                    website: onboardingData.snapshot.website,
                    description: onboardingData.snapshot.description,
                    plan: selectedPlan
                })
            });

            // Clear onboarding data
            sessionStorage.removeItem('onboarding_company');
            sessionStorage.removeItem('onboarding_scan_result');
            sessionStorage.removeItem('onboarding_final');

            // Navigate to dashboard
            navigate('/dashboard');
        } catch (err) {
            console.error('Error:', err);
            // Still navigate to dashboard for now
            navigate('/dashboard');
        }
    };

    const handleContactUs = () => {
        // Open email or contact form
        window.location.href = 'mailto:hello@geoffrey.ai?subject=Pro Plan Inquiry';
    };

    return (
        <AuthLayout
            title="Choose your plan"
            subtitle="Start with a 7-day free trial. Cancel anytime."
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        onClick={() => plan.id !== 'pro' && setSelectedPlan(plan.id)}
                        style={{
                            padding: '1.25rem',
                            background: selectedPlan === plan.id 
                                ? 'rgba(88, 166, 255, 0.1)' 
                                : 'rgba(13, 17, 23, 0.6)',
                            border: selectedPlan === plan.id 
                                ? '2px solid #58a6ff' 
                                : plan.highlighted 
                                    ? '2px solid rgba(188, 140, 242, 0.3)'
                                    : '1px solid #30363d',
                            borderRadius: '12px',
                            cursor: plan.id !== 'pro' ? 'pointer' : 'default',
                            position: 'relative',
                            transition: 'all 0.2s'
                        }}
                    >
                        {plan.highlighted && (
                            <div style={{
                                position: 'absolute',
                                top: '-10px',
                                right: '16px',
                                background: 'linear-gradient(90deg, #bc8cf2, #58a6ff)',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '10px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: '#fff'
                            }}>
                                RECOMMENDED
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ 
                                    margin: 0, 
                                    color: '#fff', 
                                    fontSize: '1.1rem',
                                    marginBottom: '0.25rem'
                                }}>
                                    {plan.name}
                                </h3>
                                <p style={{ 
                                    margin: 0, 
                                    color: '#8b949e', 
                                    fontSize: '0.8rem' 
                                }}>
                                    {plan.description}
                                </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ 
                                    fontSize: '1.5rem', 
                                    fontWeight: 700,
                                    color: '#fff'
                                }}>
                                    {plan.currency}{plan.price}
                                </span>
                                <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>
                                    {plan.period}
                                </span>
                            </div>
                        </div>

                        {selectedPlan === plan.id && plan.id !== 'pro' && (
                            <div style={{ marginTop: '1rem' }}>
                                <ul style={{ 
                                    margin: 0, 
                                    padding: 0, 
                                    listStyle: 'none',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '0.4rem'
                                }}>
                                    {plan.features.map((feature, i) => (
                                        <li key={i} style={{ 
                                            color: '#8b949e', 
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem'
                                        }}>
                                            <span style={{ color: '#3fb950' }}>✓</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {plan.id === 'pro' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleContactUs();
                                }}
                                style={{
                                    marginTop: '0.75rem',
                                    padding: '0.5rem 1rem',
                                    background: 'transparent',
                                    border: '1px solid #30363d',
                                    borderRadius: '6px',
                                    color: '#8b949e',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    width: '100%'
                                }}
                            >
                                Contact Us
                            </button>
                        )}
                    </div>
                ))}

                <button
                    onClick={handleStartTrial}
                    disabled={isSubmitting || selectedPlan === 'pro'}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        background: isSubmitting 
                            ? 'rgba(88, 166, 255, 0.5)' 
                            : 'linear-gradient(90deg, #58a6ff, #bc8cf2)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '1rem',
                        fontWeight: 600,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        marginTop: '0.5rem'
                    }}
                >
                    {isSubmitting ? 'Setting up...' : '🚀 Start Free for 7 Days'}
                </button>

                <p style={{ 
                    textAlign: 'center', 
                    color: '#8b949e', 
                    fontSize: '0.8rem',
                    marginTop: '0.5rem'
                }}>
                    No credit card required for trial • Cancel anytime
                </p>
            </div>
        </AuthLayout>
    );
}

