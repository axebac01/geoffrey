import React from 'react';
import { SignOutButton, useAuth } from '@clerk/clerk-react';

interface Stat {
    value: string;
    label: string;
}

interface AuthLayoutProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    // New props for customizing left side
    leftHeadline?: string;
    leftDescription?: string;
    leftStats?: Stat[];
    showTestimonials?: boolean;
}

const defaultStats = [
    { value: '40%', label: 'of Google searches now trigger AI Overviews' },
    { value: '73%', label: 'of users trust AI-recommended brands more' },
    { value: '2.3x', label: 'higher conversion from AI-referred traffic' },
];

const defaultHeadline = "Get discovered by AI assistants like ChatGPT and Gemini";
const defaultDescription = "Measure your brand's visibility in AI search results and get actionable recommendations to improve your GEO (Generative Engine Optimization).";

const testimonials = [
    {
        quote: "Geoffrey helped us understand exactly how ChatGPT sees our brand. We went from invisible to being recommended in 80% of relevant queries.",
        author: "Sarah Chen",
        role: "Marketing Director",
        company: "TechFlow AB"
    },
    {
        quote: "The AI visibility insights were eye-opening. We discovered competitors were getting all the AI mentions while we were left out.",
        author: "Marcus Lindgren",
        role: "CEO",
        company: "Nordic Solutions"
    },
    {
        quote: "Within weeks of implementing Geoffrey's recommendations, our organic AI traffic increased by 156%.",
        author: "Emma Johansson",
        role: "Growth Lead",
        company: "StartupHub"
    }
];

export function AuthLayout({ 
    children, 
    title, 
    subtitle,
    leftHeadline = defaultHeadline,
    leftDescription = defaultDescription,
    leftStats = defaultStats,
    showTestimonials = true
}: AuthLayoutProps) {
    const [currentTestimonial, setCurrentTestimonial] = React.useState(0);
    const { isSignedIn } = useAuth();

    React.useEffect(() => {
        if (showTestimonials) {
            const interval = setInterval(() => {
                setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [showTestimonials]);

    // Clear sessionStorage when user signs out
    React.useEffect(() => {
        if (!isSignedIn) {
            sessionStorage.removeItem('onboarding_company');
            sessionStorage.removeItem('onboarding_scan_result');
            sessionStorage.removeItem('onboarding_final');
        }
    }, [isSignedIn]);

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            background: '#0d1117'
        }}>
            {/* Left Column - Stats and Testimonials */}
            <div style={{
                flex: '1 1 55%',
                background: 'linear-gradient(135deg, rgba(88, 166, 255, 0.08) 0%, rgba(188, 140, 242, 0.08) 50%, rgba(247, 120, 186, 0.08) 100%)',
                borderRight: '1px solid rgba(48, 54, 61, 0.5)',
                padding: '3rem 4rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Background decoration */}
                <div style={{
                    position: 'absolute',
                    top: '-20%',
                    left: '-20%',
                    width: '60%',
                    height: '60%',
                    background: 'radial-gradient(circle, rgba(88, 166, 255, 0.15) 0%, transparent 70%)',
                    pointerEvents: 'none'
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '-20%',
                    right: '-20%',
                    width: '60%',
                    height: '60%',
                    background: 'radial-gradient(circle, rgba(188, 140, 242, 0.15) 0%, transparent 70%)',
                    pointerEvents: 'none'
                }} />

                <div style={{ position: 'relative', zIndex: 1, maxWidth: '500px' }}>
                    {/* Logo */}
                    <div style={{ marginBottom: '3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                background: 'linear-gradient(135deg, #58a6ff, #bc8cf2)',
                                borderRadius: '10px'
                            }} />
                            <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>Geoffrey</span>
                        </div>
                        <p style={{ color: '#8b949e', marginTop: '0.5rem', fontSize: '0.95rem' }}>
                            AI Visibility & GEO Optimization
                        </p>
                    </div>

                    {/* Main headline */}
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: 700,
                        lineHeight: 1.2,
                        marginBottom: '1.5rem',
                        background: 'linear-gradient(90deg, #fff, #c9d1d9)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        {leftHeadline}
                    </h1>
                    <p style={{ color: '#8b949e', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '3rem' }}>
                        {leftDescription}
                    </p>

                    {/* Stats */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: leftStats.length === 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                        gap: '1.5rem',
                        marginBottom: '3rem'
                    }}>
                        {leftStats.map((stat, i) => (
                            <div key={i} style={{
                                background: 'rgba(13, 17, 23, 0.6)',
                                border: '1px solid rgba(48, 54, 61, 0.5)',
                                borderRadius: '12px',
                                padding: '1.25rem'
                            }}>
                                <div style={{
                                    fontSize: '2rem',
                                    fontWeight: 700,
                                    background: 'linear-gradient(90deg, #58a6ff, #bc8cf2)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    marginBottom: '0.5rem'
                                }}>
                                    {stat.value}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#8b949e', lineHeight: 1.4 }}>
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Testimonial */}
                    {showTestimonials && (
                        <div style={{
                            background: 'rgba(13, 17, 23, 0.6)',
                            border: '1px solid rgba(48, 54, 61, 0.5)',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            position: 'relative'
                        }}>
                        <div style={{
                            position: 'absolute',
                            top: '-12px',
                            left: '24px',
                            fontSize: '3rem',
                            color: '#58a6ff',
                            opacity: 0.5
                        }}>
                            "
                        </div>
                        <p style={{
                            color: '#c9d1d9',
                            fontSize: '1rem',
                            lineHeight: 1.6,
                            marginBottom: '1rem',
                            fontStyle: 'italic'
                        }}>
                            {testimonials[currentTestimonial].quote}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #58a6ff, #bc8cf2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '0.9rem'
                            }}>
                                {testimonials[currentTestimonial].author.charAt(0)}
                            </div>
                            <div>
                                <div style={{ color: '#fff', fontWeight: 500, fontSize: '0.9rem' }}>
                                    {testimonials[currentTestimonial].author}
                                </div>
                                <div style={{ color: '#8b949e', fontSize: '0.8rem' }}>
                                    {testimonials[currentTestimonial].role} at {testimonials[currentTestimonial].company}
                                </div>
                            </div>
                        </div>

                        {/* Dots indicator */}
                        <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            justifyContent: 'center',
                            marginTop: '1rem'
                        }}>
                            {testimonials.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentTestimonial(i)}
                                    style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        border: 'none',
                                        background: i === currentTestimonial ? '#58a6ff' : 'rgba(139, 148, 158, 0.3)',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    )}
                </div>
            </div>

            {/* Right Column - Auth Forms */}
            <div style={{
                flex: '1 1 45%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '3rem',
                background: '#0d1117',
                position: 'relative'
            }}>
                {/* Log out button - top right */}
                {isSignedIn && (
                    <div style={{
                        position: 'absolute',
                        top: '1.5rem',
                        right: '1.5rem'
                    }}>
                        <SignOutButton>
                            <button style={{
                                padding: '0.5rem 1rem',
                                background: 'rgba(48, 54, 61, 0.5)',
                                border: '1px solid #30363d',
                                borderRadius: '6px',
                                color: '#c9d1d9',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(48, 54, 61, 0.7)';
                                e.currentTarget.style.borderColor = '#f85149';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(48, 54, 61, 0.5)';
                                e.currentTarget.style.borderColor = '#30363d';
                            }}>
                                Log out
                            </button>
                        </SignOutButton>
                    </div>
                )}
                <div style={{ width: '100%', maxWidth: '400px' }}>
                    {title && (
                        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                            <h2 style={{
                                fontSize: '1.75rem',
                                fontWeight: 600,
                                color: '#fff',
                                marginBottom: '0.5rem'
                            }}>
                                {title}
                            </h2>
                            {subtitle && (
                                <p style={{ color: '#8b949e', fontSize: '0.95rem' }}>
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </div>
    );
}

