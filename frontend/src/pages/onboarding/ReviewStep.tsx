import { useEffect, useState } from 'react';
import { getApiUrl } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { AuthLayout } from '../../components/layouts/AuthLayout';
import type { EntitySnapshot, CompanyDescription } from '../../types';

interface ScanResult {
    snapshot: EntitySnapshot;
    suggestedPrompts: string[];
    suggestedCompetitors: string[];
}

type TabType = 'description' | 'competitors' | 'prompts';

const defaultCompanyDescription: CompanyDescription = {
    overview: '',
    productsAndServices: [],
    targetMarket: [],
    keyDifferentiators: [],
    notableInfo: [],
    practicalDetails: {
        website: '',
        contact: '',
        positioningNote: ''
    }
};

export function ReviewStep() {
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('description');
    const [snapshot, setSnapshot] = useState<EntitySnapshot | null>(null);
    const [companyDescription, setCompanyDescription] = useState<CompanyDescription>(defaultCompanyDescription);
    const [competitors, setCompetitors] = useState<string[]>([]);
    const [prompts, setPrompts] = useState<string[]>([]);
    const [newCompetitor, setNewCompetitor] = useState('');
    const [newPrompt, setNewPrompt] = useState('');
    const [newService, setNewService] = useState('');
    const [newMarket, setNewMarket] = useState('');
    const [newDifferentiator, setNewDifferentiator] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        async function checkStep() {
            try {
                // Get token ONCE at the start
                const token = await getToken();
                
                if (!token) {
                    console.error('No token available');
                    navigate('/onboarding/company');
                    return;
                }

                // Check onboarding status
                const res = await fetch(getApiUrl('/api/onboarding/status'), {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    const onboarding = data.onboarding;
                    
                    // Check if user should be on this step
                    if (onboarding && !onboarding.completed_steps?.includes('scanning')) {
                        navigate('/onboarding/scanning');
                        return;
                    }
                }

                // Get scan result from backend
                const scanRes = await fetch(getApiUrl('/api/onboarding/scan-result'), {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (scanRes.ok) {
                    const scanData = await scanRes.json();
                    if (scanData.scanResult?.scan_data) {
                        const result: ScanResult = scanData.scanResult.scan_data;
                        setSnapshot(result.snapshot);
                        setCompetitors(result.suggestedCompetitors || []);
                        setPrompts(result.suggestedPrompts || []);
                        
                        // Initialize company description from snapshot
                        if (result.snapshot.companyDescription) {
                            setCompanyDescription(result.snapshot.companyDescription);
                        } else {
                            // Fallback to basic data
                            setCompanyDescription({
                                ...defaultCompanyDescription,
                                overview: result.snapshot.description || '',
                                productsAndServices: result.snapshot.descriptionSpecs || [],
                                practicalDetails: {
                                    website: result.snapshot.website || '',
                                    contact: '',
                                    positioningNote: result.snapshot.industry || ''
                                }
                            });
                        }
                        return;
                    }
                }

                // If we can't get scan result, redirect to company step
                navigate('/onboarding/company');
            } catch (error) {
                console.error('Failed to check onboarding status:', error);
                navigate('/onboarding/company');
            }
        }

        checkStep();
    }, [navigate, getToken]);

    const handleContinue = async () => {
        if (!snapshot) return;
        
        setIsSubmitting(true);

        try {
            // Get token ONCE at the start
            const token = await getToken();
            
            if (!token) {
                console.error('No token available');
                setIsSubmitting(false);
                return;
            }

            // Update snapshot with company description
            const updatedSnapshot: EntitySnapshot = {
                ...snapshot,
                companyDescription
            };

            // Store the final reviewed data in backend
            await fetch(getApiUrl('/api/onboarding/scan-result'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    scanData: {
                        snapshot: updatedSnapshot,
                        prompts,
                        competitors,
                        type: 'final_review'
                    }
                })
            });

            // Store business data in Supabase
            const businessResponse = await fetch(getApiUrl('/api/businesses'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    businessName: updatedSnapshot.businessName,
                    industry: updatedSnapshot.industry,
                    region: updatedSnapshot.region,
                    website: updatedSnapshot.website,
                    description: updatedSnapshot.description,
                    logoUrl: updatedSnapshot.logoUrl,
                    plan: 'free' // Default to free plan for now
                })
            });

            if (!businessResponse.ok) {
                const errorData = await businessResponse.json().catch(() => ({}));
                console.error('Business save error:', errorData);
                // Log the full error for debugging
                throw new Error(errorData.error || errorData.details || 'Failed to save business data');
            }

            const businessData = await businessResponse.json();

            // Save prompts to prompts table for use in Prompts page and scans
            if (prompts.length > 0) {
                try {
                    const promptsResponse = await fetch(getApiUrl('/api/prompts/bulk'), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            prompts: prompts,
                            businessId: businessData.business?.id || null
                        })
                    });
                    
                    if (!promptsResponse.ok) {
                        console.warn('Failed to save prompts to database, but continuing with onboarding');
                        // Don't fail onboarding if this fails
                    }
                } catch (promptError) {
                    console.warn('Error saving prompts to database:', promptError);
                    // Don't fail onboarding if this fails
                }
            }

            // Mark onboarding as complete
            const statusResponse = await fetch(getApiUrl('/api/onboarding/status'), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentStep: 'completed',
                    completedSteps: ['company', 'scanning', 'review'],
                    isComplete: true
                })
            });

            if (!statusResponse.ok) {
                const errorData = await statusResponse.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to update onboarding status');
            }

            // Navigate to dashboard
            navigate('/dashboard');
        } catch (err) {
            console.error('Error:', err);
            setIsSubmitting(false);
        }
    };

    // List management helpers
    const addToList = (list: string[], setList: (l: string[]) => void, item: string, setItem: (s: string) => void, max?: number) => {
        if (item.trim() && (!max || list.length < max)) {
            setList([...list, item.trim()]);
            setItem('');
        }
    };

    const removeFromList = (list: string[], setList: (l: string[]) => void, index: number) => {
        setList(list.filter((_, i) => i !== index));
    };

    if (!snapshot) {
        return (
            <AuthLayout title="Loading...">
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p style={{ color: '#8b949e' }}>Loading your scan results...</p>
                </div>
            </AuthLayout>
        );
    }

    const tabs: { id: TabType; label: string; count?: number }[] = [
        { id: 'description', label: 'Company Info' },
        { id: 'competitors', label: 'Competitors', count: competitors.length },
        { id: 'prompts', label: 'AI Prompts', count: prompts.length },
    ];

    return (
        <AuthLayout
            title="Review your profile"
            subtitle="Verify the information we found about your business"
            leftHeadline="Almost there! Review your profile"
            leftDescription="We've analyzed your business and generated prompts. Review and customize the information to ensure accurate AI visibility testing."
            leftStats={[
                { value: '✓', label: 'Company info extracted' },
                { value: '✓', label: 'Competitors identified' },
                { value: '✓', label: 'Prompts generated' }
            ]}
            showTestimonials={false}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Logo and Company Name */}
                {snapshot.logoUrl && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid #30363d'
                    }}>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '16px',
                            background: 'rgba(22, 27, 34, 0.8)',
                            border: '2px solid rgba(88, 166, 255, 0.3)',
                            boxShadow: '0 0 20px rgba(88, 166, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                        }}>
                            <img
                                src={snapshot.logoUrl}
                                alt={`${snapshot.businessName} logo`}
                                style={{ 
                                    maxWidth: '90%', 
                                    maxHeight: '90%', 
                                    objectFit: 'contain' 
                                }}
                                onError={(e) => {
                                    // Hide logo if it fails to load
                                    (e.target as HTMLElement).style.display = 'none';
                                }}
                            />
                        </div>
                        <h3 style={{
                            margin: 0,
                            fontSize: '1.3rem',
                            fontWeight: 600,
                            color: '#c9d1d9',
                            textAlign: 'center'
                        }}>
                            {snapshot.businessName}
                        </h3>
                    </div>
                )}

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    borderBottom: '1px solid #30363d',
                    paddingBottom: '0.5rem'
                }}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '0.5rem 1rem',
                                background: activeTab === tab.id 
                                    ? 'rgba(88, 166, 255, 0.1)' 
                                    : 'transparent',
                                border: activeTab === tab.id 
                                    ? '1px solid rgba(88, 166, 255, 0.3)' 
                                    : '1px solid transparent',
                                borderRadius: '6px',
                                color: activeTab === tab.id ? '#58a6ff' : '#8b949e',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: activeTab === tab.id ? 500 : 400,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {tab.label}
                            {tab.count !== undefined && (
                                <span style={{
                                    background: 'rgba(48, 54, 61, 0.5)',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '10px',
                                    fontSize: '0.75rem'
                                }}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div style={{ 
                    minHeight: '350px',
                    maxHeight: '450px',
                    overflowY: 'auto',
                    paddingRight: '0.5rem'
                }}>
                    {activeTab === 'description' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Basic Info */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', color: '#8b949e', fontSize: '0.8rem' }}>
                                        Business Name
                                    </label>
                                    <input
                                        type="text"
                                        value={snapshot.businessName}
                                        onChange={(e) => setSnapshot({ ...snapshot, businessName: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', color: '#8b949e', fontSize: '0.8rem' }}>
                                        Region
                                    </label>
                                    <input
                                        type="text"
                                        value={snapshot.region}
                                        onChange={(e) => setSnapshot({ ...snapshot, region: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            {/* Overview */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#8b949e', fontSize: '0.8rem' }}>
                                    Overview
                                </label>
                                <textarea
                                    value={companyDescription.overview}
                                    onChange={(e) => setCompanyDescription({ ...companyDescription, overview: e.target.value })}
                                    rows={2}
                                    placeholder="Brief overview of your business..."
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                />
                            </div>

                            {/* Products & Services */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#8b949e', fontSize: '0.8rem' }}>
                                    Products & Services
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <input
                                        type="text"
                                        value={newService}
                                        onChange={(e) => setNewService(e.target.value)}
                                        placeholder="Add service..."
                                        onKeyPress={(e) => e.key === 'Enter' && addToList(companyDescription.productsAndServices, (items) => setCompanyDescription({ ...companyDescription, productsAndServices: items }), newService, setNewService)}
                                        style={{ ...inputStyle, flex: 1 }}
                                    />
                                    <button onClick={() => addToList(companyDescription.productsAndServices, (items) => setCompanyDescription({ ...companyDescription, productsAndServices: items }), newService, setNewService)} style={addButtonStyle}>+</button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                    {companyDescription.productsAndServices.map((item, i) => (
                                        <span key={i} style={tagStyle}>
                                            {item}
                                            <button onClick={() => removeFromList(companyDescription.productsAndServices, (items) => setCompanyDescription({ ...companyDescription, productsAndServices: items }), i)} style={removeTagStyle}>×</button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Target Market */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#8b949e', fontSize: '0.8rem' }}>
                                    Target Market
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <input
                                        type="text"
                                        value={newMarket}
                                        onChange={(e) => setNewMarket(e.target.value)}
                                        placeholder="Add target segment..."
                                        onKeyPress={(e) => e.key === 'Enter' && addToList(companyDescription.targetMarket, (items) => setCompanyDescription({ ...companyDescription, targetMarket: items }), newMarket, setNewMarket)}
                                        style={{ ...inputStyle, flex: 1 }}
                                    />
                                    <button onClick={() => addToList(companyDescription.targetMarket, (items) => setCompanyDescription({ ...companyDescription, targetMarket: items }), newMarket, setNewMarket)} style={addButtonStyle}>+</button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                    {companyDescription.targetMarket.map((item, i) => (
                                        <span key={i} style={tagStyle}>
                                            {item}
                                            <button onClick={() => removeFromList(companyDescription.targetMarket, (items) => setCompanyDescription({ ...companyDescription, targetMarket: items }), i)} style={removeTagStyle}>×</button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Key Differentiators */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#8b949e', fontSize: '0.8rem' }}>
                                    Key Differentiators
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <input
                                        type="text"
                                        value={newDifferentiator}
                                        onChange={(e) => setNewDifferentiator(e.target.value)}
                                        placeholder="What makes you unique..."
                                        onKeyPress={(e) => e.key === 'Enter' && addToList(companyDescription.keyDifferentiators, (items) => setCompanyDescription({ ...companyDescription, keyDifferentiators: items }), newDifferentiator, setNewDifferentiator)}
                                        style={{ ...inputStyle, flex: 1 }}
                                    />
                                    <button onClick={() => addToList(companyDescription.keyDifferentiators, (items) => setCompanyDescription({ ...companyDescription, keyDifferentiators: items }), newDifferentiator, setNewDifferentiator)} style={addButtonStyle}>+</button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                    {companyDescription.keyDifferentiators.map((item, i) => (
                                        <span key={i} style={{ ...tagStyle, background: 'rgba(63, 185, 80, 0.15)', borderColor: 'rgba(63, 185, 80, 0.3)' }}>
                                            {item}
                                            <button onClick={() => removeFromList(companyDescription.keyDifferentiators, (items) => setCompanyDescription({ ...companyDescription, keyDifferentiators: items }), i)} style={removeTagStyle}>×</button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Positioning Note */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#8b949e', fontSize: '0.8rem' }}>
                                    Market Positioning
                                </label>
                                <input
                                    type="text"
                                    value={companyDescription.practicalDetails.positioningNote}
                                    onChange={(e) => setCompanyDescription({
                                        ...companyDescription,
                                        practicalDetails: { ...companyDescription.practicalDetails, positioningNote: e.target.value }
                                    })}
                                    placeholder="e.g., Premium B2B SaaS for SMBs"
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'competitors' && (
                        <div>
                            <p style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                These competitors will be tracked in your Share of Voice analysis. Max 10.
                            </p>
                            
                            {/* Add competitor input */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                <input
                                    type="text"
                                    value={newCompetitor}
                                    onChange={(e) => setNewCompetitor(e.target.value)}
                                    placeholder="Add competitor..."
                                    onKeyPress={(e) => e.key === 'Enter' && addToList(competitors, setCompetitors, newCompetitor, setNewCompetitor, 10)}
                                    disabled={competitors.length >= 10}
                                    style={{ ...inputStyle, flex: 1 }}
                                />
                                <button
                                    onClick={() => addToList(competitors, setCompetitors, newCompetitor, setNewCompetitor, 10)}
                                    disabled={!newCompetitor.trim() || competitors.length >= 10}
                                    style={addButtonStyle}
                                >
                                    Add
                                </button>
                            </div>

                            {/* Competitor list */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {competitors.map((competitor, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.6rem 0.75rem',
                                            background: 'rgba(13, 17, 23, 0.6)',
                                            border: '1px solid #30363d',
                                            borderRadius: '6px'
                                        }}
                                    >
                                        <span style={{ color: '#c9d1d9', fontSize: '0.9rem' }}>{competitor}</span>
                                        <button
                                            onClick={() => removeFromList(competitors, setCompetitors, index)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#f85149',
                                                cursor: 'pointer',
                                                padding: '0.25rem 0.5rem',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                                {competitors.length === 0 && (
                                    <p style={{ color: '#8b949e', textAlign: 'center', padding: '1rem' }}>
                                        No competitors added yet
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'prompts' && (
                        <div>
                            <p style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                These are the AI search queries we'll test your visibility against.
                            </p>
                            
                            {/* Add prompt input */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                <input
                                    type="text"
                                    value={newPrompt}
                                    onChange={(e) => setNewPrompt(e.target.value)}
                                    placeholder="Add a search query..."
                                    onKeyPress={(e) => e.key === 'Enter' && addToList(prompts, setPrompts, newPrompt, setNewPrompt)}
                                    style={{ ...inputStyle, flex: 1 }}
                                />
                                <button
                                    onClick={() => addToList(prompts, setPrompts, newPrompt, setNewPrompt)}
                                    disabled={!newPrompt.trim()}
                                    style={addButtonStyle}
                                >
                                    Add
                                </button>
                            </div>

                            {/* Prompt list */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {prompts.map((prompt, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.6rem 0.75rem',
                                            background: 'rgba(13, 17, 23, 0.6)',
                                            border: '1px solid #30363d',
                                            borderRadius: '6px',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <span style={{ 
                                            color: '#c9d1d9', 
                                            fontSize: '0.85rem',
                                            flex: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            "{prompt}"
                                        </span>
                                        <button
                                            onClick={() => removeFromList(prompts, setPrompts, index)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#f85149',
                                                cursor: 'pointer',
                                                padding: '0.25rem 0.5rem',
                                                fontSize: '0.8rem',
                                                flexShrink: 0
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                {prompts.length === 0 && (
                                    <p style={{ color: '#8b949e', textAlign: 'center', padding: '1rem' }}>
                                        No prompts added yet
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Continue button */}
                <button
                    onClick={handleContinue}
                    disabled={isSubmitting || !snapshot.businessName}
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
                    {isSubmitting ? 'Saving...' : 'Continue →'}
                </button>
            </div>
        </AuthLayout>
    );
}

// Styles
const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    background: 'rgba(13, 17, 23, 0.8)',
    border: '1px solid #30363d',
    borderRadius: '6px',
    color: '#c9d1d9',
    fontSize: '0.9rem',
    outline: 'none'
};

const addButtonStyle: React.CSSProperties = {
    padding: '0.6rem 1rem',
    background: 'rgba(88, 166, 255, 0.2)',
    border: '1px solid rgba(88, 166, 255, 0.3)',
    borderRadius: '6px',
    color: '#58a6ff',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 500
};

const tagStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.3rem 0.6rem',
    background: 'rgba(88, 166, 255, 0.1)',
    border: '1px solid rgba(88, 166, 255, 0.2)',
    borderRadius: '4px',
    color: '#c9d1d9',
    fontSize: '0.8rem'
};

const removeTagStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: '#8b949e',
    cursor: 'pointer',
    padding: 0,
    fontSize: '1rem',
    lineHeight: 1
};
