import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

interface GeoAsset {
    id: string;
    asset_type: string;
    content: string;
    content_html?: string;
    content_json?: any;
    generated_at: string;
}

interface FAQItem {
    question: string;
    answer: string;
}

export function ImprovementsPage() {
    const { getToken } = useAuth();
    const [assets, setAssets] = useState<GeoAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expandedAsset, setExpandedAsset] = useState<string | null>(null);

    // Mock snapshot - in production, this would come from the user's business profile
    const mockSnapshot = {
        businessName: 'Your Business',
        industry: 'Your Industry',
        region: 'Your Region',
        descriptionSpecs: ['Service 1', 'Service 2', 'Service 3']
    };

    useEffect(() => {
        loadAssets();
    }, []);

    async function loadAssets() {
        try {
            const token = await getToken();
            const res = await fetch('/api/geo/assets', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setAssets(data.assets || []);
        } catch (error) {
            console.error('Failed to load assets:', error);
        } finally {
            setLoading(false);
        }
    }

    async function generateAsset(type: 'faq' | 'schema' | 'about') {
        setGenerating(type);

        try {
            const token = await getToken();
            const res = await fetch(`/api/geo/generate/${type}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ snapshot: mockSnapshot })
            });

            if (res.ok) {
                await loadAssets();
            }
        } catch (error) {
            console.error(`Failed to generate ${type}:`, error);
        } finally {
            setGenerating(null);
        }
    }

    function copyToClipboard(content: string, id: string) {
        navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    }

    function getAssetByType(type: string): GeoAsset | undefined {
        return assets.find(a => a.asset_type === type);
    }

    const faqAsset = getAssetByType('faq');
    const faqJsonLd = getAssetByType('faq_jsonld');
    const schemaAsset = getAssetByType('org_schema');
    const aboutAsset = getAssetByType('about_snippet');

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: '#8b949e' }}>Loading GEO Center...</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '900px' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>⚡ GEO Improvement Center</h1>
                <p style={{ color: '#8b949e' }}>
                    Generate AI-optimized content to improve your visibility in ChatGPT, Gemini, and other AI assistants.
                </p>
            </div>

            {/* Quick Actions */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <ActionCard
                    title="FAQ Schema"
                    description="Generate structured FAQ content"
                    icon="❓"
                    isGenerated={!!faqAsset}
                    isGenerating={generating === 'faq'}
                    onGenerate={() => generateAsset('faq')}
                />
                <ActionCard
                    title="Organization Schema"
                    description="Create JSON-LD business markup"
                    icon="🏢"
                    isGenerated={!!schemaAsset}
                    isGenerating={generating === 'schema'}
                    onGenerate={() => generateAsset('schema')}
                />
                <ActionCard
                    title="About Snippet"
                    description="AI-optimized business description"
                    icon="📝"
                    isGenerated={!!aboutAsset}
                    isGenerating={generating === 'about'}
                    onGenerate={() => generateAsset('about')}
                />
            </div>

            {/* Generated Assets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* FAQ Section */}
                {faqAsset && (
                    <AssetCard
                        title="FAQ Content"
                        icon="❓"
                        generatedAt={faqAsset.generated_at}
                        isExpanded={expandedAsset === 'faq'}
                        onToggle={() => setExpandedAsset(expandedAsset === 'faq' ? null : 'faq')}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* FAQ Items */}
                            {faqAsset.content_json?.items?.map((item: FAQItem, i: number) => (
                                <div key={i} style={{
                                    background: 'rgba(13, 17, 23, 0.6)',
                                    borderRadius: '8px',
                                    padding: '1rem'
                                }}>
                                    <h4 style={{ color: '#58a6ff', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                                        Q: {item.question}
                                    </h4>
                                    <p style={{ color: '#c9d1d9', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                        {item.answer}
                                    </p>
                                </div>
                            ))}

                            {/* Copy buttons */}
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button
                                    onClick={() => copyToClipboard(faqAsset.content, 'faq-md')}
                                    className="btn-secondary"
                                    style={{ fontSize: '0.85rem' }}
                                >
                                    {copiedId === 'faq-md' ? '✓ Copied!' : '📋 Copy Markdown'}
                                </button>
                                <button
                                    onClick={() => copyToClipboard(faqAsset.content_html || '', 'faq-html')}
                                    className="btn-secondary"
                                    style={{ fontSize: '0.85rem' }}
                                >
                                    {copiedId === 'faq-html' ? '✓ Copied!' : '📋 Copy HTML'}
                                </button>
                            </div>
                        </div>
                    </AssetCard>
                )}

                {/* FAQ JSON-LD */}
                {faqJsonLd && (
                    <AssetCard
                        title="FAQ Schema (JSON-LD)"
                        icon="🏷️"
                        generatedAt={faqJsonLd.generated_at}
                        isExpanded={expandedAsset === 'faq-jsonld'}
                        onToggle={() => setExpandedAsset(expandedAsset === 'faq-jsonld' ? null : 'faq-jsonld')}
                    >
                        <div>
                            <p style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                Add this to your website's &lt;head&gt; section to help search engines and AI understand your FAQ.
                            </p>
                            <pre style={{
                                background: 'rgba(13, 17, 23, 0.8)',
                                borderRadius: '8px',
                                padding: '1rem',
                                overflow: 'auto',
                                maxHeight: '300px',
                                fontSize: '0.8rem',
                                color: '#c9d1d9'
                            }}>
                                <code>{`<script type="application/ld+json">\n${faqJsonLd.content}\n</script>`}</code>
                            </pre>
                            <button
                                onClick={() => copyToClipboard(`<script type="application/ld+json">\n${faqJsonLd.content}\n</script>`, 'jsonld')}
                                className="btn-primary"
                                style={{ marginTop: '1rem', fontSize: '0.85rem' }}
                            >
                                {copiedId === 'jsonld' ? '✓ Copied!' : '📋 Copy Schema'}
                            </button>
                        </div>
                    </AssetCard>
                )}

                {/* Organization Schema */}
                {schemaAsset && (
                    <AssetCard
                        title="Organization Schema (JSON-LD)"
                        icon="🏢"
                        generatedAt={schemaAsset.generated_at}
                        isExpanded={expandedAsset === 'schema'}
                        onToggle={() => setExpandedAsset(expandedAsset === 'schema' ? null : 'schema')}
                    >
                        <div>
                            <p style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                Add this to your homepage to help AI assistants understand your business.
                            </p>
                            <pre style={{
                                background: 'rgba(13, 17, 23, 0.8)',
                                borderRadius: '8px',
                                padding: '1rem',
                                overflow: 'auto',
                                maxHeight: '300px',
                                fontSize: '0.8rem',
                                color: '#c9d1d9'
                            }}>
                                <code>{`<script type="application/ld+json">\n${schemaAsset.content}\n</script>`}</code>
                            </pre>
                            <button
                                onClick={() => copyToClipboard(`<script type="application/ld+json">\n${schemaAsset.content}\n</script>`, 'org-schema')}
                                className="btn-primary"
                                style={{ marginTop: '1rem', fontSize: '0.85rem' }}
                            >
                                {copiedId === 'org-schema' ? '✓ Copied!' : '📋 Copy Schema'}
                            </button>
                        </div>
                    </AssetCard>
                )}

                {/* About Snippet */}
                {aboutAsset && (
                    <AssetCard
                        title="AI-Optimized About Snippet"
                        icon="📝"
                        generatedAt={aboutAsset.generated_at}
                        isExpanded={expandedAsset === 'about'}
                        onToggle={() => setExpandedAsset(expandedAsset === 'about' ? null : 'about')}
                    >
                        <div>
                            <p style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                Use this entity-rich description on your About page or meta description.
                            </p>
                            <div style={{
                                background: 'rgba(13, 17, 23, 0.6)',
                                borderRadius: '8px',
                                padding: '1rem',
                                color: '#c9d1d9',
                                fontSize: '0.95rem',
                                lineHeight: 1.6
                            }}>
                                {aboutAsset.content}
                            </div>
                            <button
                                onClick={() => copyToClipboard(aboutAsset.content, 'about')}
                                className="btn-primary"
                                style={{ marginTop: '1rem', fontSize: '0.85rem' }}
                            >
                                {copiedId === 'about' ? '✓ Copied!' : '📋 Copy Text'}
                            </button>
                        </div>
                    </AssetCard>
                )}

                {/* No assets generated yet */}
                {assets.length === 0 && (
                    <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
                        <h3 style={{ marginBottom: '0.5rem' }}>Start Optimizing</h3>
                        <p style={{ color: '#8b949e', maxWidth: '400px', margin: '0 auto' }}>
                            Generate AI-optimized content using the buttons above to improve your visibility in AI search results.
                        </p>
                    </div>
                )}
            </div>

            {/* Improvement Tips */}
            <div className="card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>💡 GEO Best Practices</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <TipCard
                        title="Add Schema Markup"
                        description="JSON-LD schemas help AI understand your business structure and services."
                        difficulty="Easy"
                    />
                    <TipCard
                        title="Create FAQ Pages"
                        description="FAQ content directly matches how users query AI assistants."
                        difficulty="Easy"
                    />
                    <TipCard
                        title="Optimize Meta Descriptions"
                        description="Entity-rich descriptions improve AI context understanding."
                        difficulty="Medium"
                    />
                    <TipCard
                        title="Build Topic Authority"
                        description="Create comprehensive content clusters around your key services."
                        difficulty="Hard"
                    />
                </div>
            </div>
        </div>
    );
}

// Action Card Component
function ActionCard({ 
    title, 
    description, 
    icon, 
    isGenerated, 
    isGenerating, 
    onGenerate 
}: {
    title: string;
    description: string;
    icon: string;
    isGenerated: boolean;
    isGenerating: boolean;
    onGenerate: () => void;
}) {
    return (
        <div className="card" style={{
            padding: '1.25rem',
            textAlign: 'center',
            border: isGenerated ? '1px solid rgba(63, 185, 80, 0.3)' : undefined
        }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{title}</h3>
            <p style={{ color: '#8b949e', fontSize: '0.8rem', marginBottom: '1rem' }}>{description}</p>
            <button
                onClick={onGenerate}
                disabled={isGenerating}
                style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: isGenerated 
                        ? 'rgba(63, 185, 80, 0.15)' 
                        : isGenerating 
                            ? 'rgba(88, 166, 255, 0.3)' 
                            : 'linear-gradient(90deg, #58a6ff, #bc8cf2)',
                    border: isGenerated ? '1px solid rgba(63, 185, 80, 0.3)' : 'none',
                    borderRadius: '6px',
                    color: isGenerated ? '#3fb950' : '#fff',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500
                }}
            >
                {isGenerating ? '⏳ Generating...' : isGenerated ? '✓ Regenerate' : '✨ Generate'}
            </button>
        </div>
    );
}

// Asset Card Component
function AssetCard({
    title,
    icon,
    generatedAt,
    isExpanded,
    onToggle,
    children
}: {
    title: string;
    icon: string;
    generatedAt: string;
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="card" style={{ 
            padding: '1.25rem',
            border: '1px solid rgba(63, 185, 80, 0.2)'
        }}>
            <div 
                onClick={onToggle}
                style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{icon}</span>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>{title}</h3>
                        <span style={{ color: '#8b949e', fontSize: '0.75rem' }}>
                            Generated {new Date(generatedAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background: 'rgba(63, 185, 80, 0.15)',
                        color: '#3fb950',
                        fontSize: '0.75rem'
                    }}>
                        ✓ Ready
                    </span>
                    <span style={{ color: '#8b949e' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
            </div>
            {isExpanded && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #30363d' }}>
                    {children}
                </div>
            )}
        </div>
    );
}

// Tip Card Component
function TipCard({ 
    title, 
    description, 
    difficulty 
}: { 
    title: string; 
    description: string; 
    difficulty: 'Easy' | 'Medium' | 'Hard';
}) {
    const difficultyColors = {
        Easy: '#3fb950',
        Medium: '#d29922',
        Hard: '#f85149'
    };

    return (
        <div style={{
            padding: '1rem',
            background: 'rgba(13, 17, 23, 0.4)',
            borderRadius: '8px',
            border: '1px solid #30363d'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{title}</h4>
                <span style={{
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    border: `1px solid ${difficultyColors[difficulty]}`,
                    color: difficultyColors[difficulty],
                    fontSize: '0.7rem'
                }}>
                    {difficulty}
                </span>
            </div>
            <p style={{ color: '#8b949e', fontSize: '0.8rem', margin: 0 }}>{description}</p>
        </div>
    );
}
