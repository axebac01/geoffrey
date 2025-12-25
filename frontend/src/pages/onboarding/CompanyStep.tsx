import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { AuthLayout } from '../../components/layouts/AuthLayout';

export function CompanyStep() {
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const [companyName, setCompanyName] = useState('');
    const [website, setWebsite] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!website.trim()) {
            setError('Please enter your company website');
            return;
        }

        setIsSubmitting(true);

        try {
            // Store the input data in sessionStorage for the scanning step
            sessionStorage.setItem('onboarding_company', JSON.stringify({
                companyName: companyName.trim(),
                website: website.trim()
            }));

            navigate('/onboarding/scanning');
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout
            title="Tell us about your business"
            subtitle="We'll analyze your website and optimize your AI visibility"
            leftHeadline="Let's get started with your business"
            leftDescription="We'll scan your website to understand your business, identify competitors, and generate AI-optimized content recommendations."
            leftStats={[
                { value: '30s', label: 'average scan time' },
                { value: '20+', label: 'AI prompts generated' },
                { value: '5-10', label: 'competitors detected' }
            ]}
            showTestimonials={false}
        >
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {error && (
                    <div style={{
                        background: 'rgba(218, 54, 51, 0.1)',
                        border: '1px solid rgba(218, 54, 51, 0.3)',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        color: '#f85149',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                <div>
                    <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        color: '#c9d1d9',
                        fontSize: '0.9rem',
                        fontWeight: 500
                    }}>
                        Company Name <span style={{ color: '#8b949e' }}>(optional)</span>
                    </label>
                    <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Acme Inc"
                        style={{
                            width: '100%',
                            padding: '0.875rem 1rem',
                            background: 'rgba(13, 17, 23, 0.8)',
                            border: '1px solid #30363d',
                            borderRadius: '8px',
                            color: '#c9d1d9',
                            fontSize: '1rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#58a6ff'}
                        onBlur={(e) => e.target.style.borderColor = '#30363d'}
                    />
                    <p style={{ marginTop: '0.5rem', color: '#8b949e', fontSize: '0.8rem' }}>
                        We'll try to detect this from your website
                    </p>
                </div>

                <div>
                    <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        color: '#c9d1d9',
                        fontSize: '0.9rem',
                        fontWeight: 500
                    }}>
                        Company Website <span style={{ color: '#f85149' }}>*</span>
                    </label>
                    <input
                        type="text"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="example.com"
                        required
                        style={{
                            width: '100%',
                            padding: '0.875rem 1rem',
                            background: 'rgba(13, 17, 23, 0.8)',
                            border: '1px solid #30363d',
                            borderRadius: '8px',
                            color: '#c9d1d9',
                            fontSize: '1rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#58a6ff'}
                        onBlur={(e) => e.target.style.borderColor = '#30363d'}
                    />
                    <p style={{ marginTop: '0.5rem', color: '#8b949e', fontSize: '0.8rem' }}>
                        We'll scan your website to understand your business
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
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
                        transition: 'opacity 0.2s',
                        marginTop: '0.5rem'
                    }}
                >
                    {isSubmitting ? 'Starting...' : 'Analyze My Website →'}
                </button>

                <p style={{ textAlign: 'center', color: '#8b949e', fontSize: '0.85rem' }}>
                    This will take about 30 seconds
                </p>
            </form>
        </AuthLayout>
    );
}

