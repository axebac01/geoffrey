import React, { useState } from 'react';
import type { AnalysisResult, GeneratorOutput } from '../types';

interface ResultsProps {
    analysis: AnalysisResult;
    onGenerate: () => void;
    isGenerating: boolean;
    assets: GeneratorOutput | null;
    reset: () => void;
}

export function Results({ analysis, onGenerate, isGenerating, assets, reset }: ResultsProps) {
    const [showDetails, setShowDetails] = useState(false);

    // Categorize results
    const wins = analysis.results.filter(r => r.judgeResult.isMentioned && (r.judgeResult.rankPosition && r.judgeResult.rankPosition <= 3));
    const opportunities = analysis.results.filter(r => r.judgeResult.isMentioned && (!r.judgeResult.rankPosition || r.judgeResult.rankPosition > 3));
    const ghosts = analysis.results.filter(r => !r.judgeResult.isMentioned);

    const totalTests = analysis.results.length;
    const scorePercentage = analysis.overallScore;

    return (
        <div style={{ maxWidth: '900px', margin: '3rem auto' }}>
            {/* Hero Section - Score Display */}
            <div style={{
                textAlign: 'center',
                marginBottom: '3rem',
                background: 'linear-gradient(135deg, rgba(88, 166, 255, 0.05) 0%, rgba(188, 140, 242, 0.05) 100%)',
                border: '1px solid rgba(88, 166, 255, 0.2)',
                borderRadius: '16px',
                padding: '3rem 2rem',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Background glow */}
                <div style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: 'radial-gradient(circle, rgba(88, 166, 255, 0.1) 0%, transparent 70%)',
                    animation: 'pulse 4s ease-in-out infinite',
                    pointerEvents: 'none'
                }}></div>

                {/* Company identifier */}
                <div style={{ position: 'relative', zIndex: 1, marginBottom: '2rem' }}>
                    <h3 style={{ color: '#8b949e', fontSize: '1rem', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '2px' }}>
                        AI Visibility Report
                    </h3>
                    <h2 style={{ fontSize: '2rem', color: '#c9d1d9', marginTop: '0.5rem' }}>
                        {analysis.snapshot.businessName}
                    </h2>
                </div>

                {/* Circular Score */}
                <div style={{ position: 'relative', zIndex: 1, margin: '2rem auto', width: '200px', height: '200px' }}>
                    <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
                        {/* Background circle */}
                        <circle
                            cx="100"
                            cy="100"
                            r="85"
                            fill="none"
                            stroke="rgba(48, 54, 61, 0.3)"
                            strokeWidth="12"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="100"
                            cy="100"
                            r="85"
                            fill="none"
                            stroke="url(#scoreGradient)"
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray={`${(scorePercentage / 100) * 534} 534`}
                            style={{
                                filter: 'drop-shadow(0 0 8px rgba(88, 166, 255, 0.6))',
                                transition: 'stroke-dasharray 1s ease-out'
                            }}
                        />
                        <defs>
                            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#58a6ff" />
                                <stop offset="50%" stopColor="#bc8cf2" />
                                <stop offset="100%" stopColor="#f778ba" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: '3.5rem',
                            fontWeight: 700,
                            background: 'linear-gradient(90deg, #58a6ff, #bc8cf2)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            {scorePercentage}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#8b949e', marginTop: '-0.5rem' }}>
                            Score
                        </div>
                    </div>
                </div>

                {/* Summary Text */}
                <p style={{ color: '#8b949e', fontSize: '1.1rem', position: 'relative', zIndex: 1 }}>
                    Ranking top 3 for <strong style={{ color: '#58a6ff' }}>{wins.length}</strong> out of {totalTests} AI searches
                </p>
            </div>

            {/* Metrics Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '3rem'
            }}>
                {/* Wins Card */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(35, 134, 54, 0.1) 0%, rgba(35, 134, 54, 0.05) 100%)',
                    border: '1px solid rgba(35, 134, 54, 0.3)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    transition: 'transform 0.2s'
                }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏆</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#3fb950' }}>{wins.length}</div>
                    <div style={{ color: '#8b949e', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Top 3 Rankings
                    </div>
                </div>

                {/* Opportunities Card */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(210, 153, 34, 0.1) 0%, rgba(210, 153, 34, 0.05) 100%)',
                    border: '1px solid rgba(210, 153, 34, 0.3)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    transition: 'transform 0.2s'
                }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚡</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#d29922' }}>{opportunities.length}</div>
                    <div style={{ color: '#8b949e', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Opportunities
                    </div>
                </div>

                {/* Gaps Card */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(218, 54, 51, 0.1) 0%, rgba(218, 54, 51, 0.05) 100%)',
                    border: '1px solid rgba(218, 54, 51, 0.3)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    transition: 'transform 0.2s'
                }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👻</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f85149' }}>{ghosts.length}</div>
                    <div style={{ color: '#8b949e', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Visibility Gaps
                    </div>
                </div>
            </div>

            {/* Primary CTA */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(88, 166, 255, 0.1) 0%, rgba(188, 140, 242, 0.1) 100%)',
                border: '2px solid rgba(88, 166, 255, 0.3)',
                borderRadius: '16px',
                padding: '2.5rem 2rem',
                textAlign: 'center',
                marginBottom: '2rem',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '120%',
                    height: '120%',
                    background: 'radial-gradient(circle, rgba(188, 140, 242, 0.15) 0%, transparent 60%)',
                    pointerEvents: 'none'
                }}></div>

                <h2 style={{
                    fontSize: '2rem',
                    marginBottom: '1rem',
                    position: 'relative',
                    zIndex: 1,
                    background: 'linear-gradient(90deg, #58a6ff, #bc8cf2, #f778ba)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Ready to Improve Your GEO?
                </h2>
                <p style={{ color: '#8b949e', marginBottom: '2rem', position: 'relative', zIndex: 1, fontSize: '1.05rem' }}>
                    Get AI-optimized content to boost your visibility in ChatGPT and Gemini
                </p>
                <button
                    onClick={onGenerate}
                    disabled={isGenerating || assets !== null}
                    style={{
                        fontSize: '1.2rem',
                        padding: '1rem 3rem',
                        background: assets ? 'rgba(88, 166, 255, 0.2)' : 'linear-gradient(90deg, #58a6ff, #bc8cf2)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: assets ? 'not-allowed' : 'pointer',
                        boxShadow: assets ? 'none' : '0 4px 20px rgba(88, 166, 255, 0.4)',
                        transition: 'all 0.2s',
                        position: 'relative',
                        zIndex: 1
                    }}
                    onMouseEnter={(e) => {
                        if (!assets) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 25px rgba(88, 166, 255, 0.5)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = assets ? 'none' : '0 4px 20px rgba(88, 166, 255, 0.4)';
                    }}
                >
                    {isGenerating ? '✨ Generating...' : assets ? '✅ Assets Generated' : '✨ Improve Your GEO →'}
                </button>
            </div>

            {/* Collapsible Details */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    style={{
                        background: 'transparent',
                        border: '1px solid #30363d',
                        color: '#8b949e',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.95rem'
                    }}
                >
                    {showDetails ? '▲ Hide Details' : '▼ View Detailed Breakdown'}
                </button>
            </div>

            {showDetails && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '1rem',
                    marginBottom: '3rem'
                }}>
                    {/* Wins Details */}
                    <div className="card" style={{ borderColor: '#238636' }}>
                        <h3 style={{ color: '#238636', marginBottom: '1rem' }}>🏆 Top 3 Rankings</h3>
                        {wins.length === 0 && <p style={{ color: '#8b949e' }}>No top 3 rankings yet.</p>}
                        {wins.map((r, i) => (
                            <div key={i} style={{ padding: '0.5rem', borderBottom: '1px solid #30363d', marginBottom: '0.5rem' }}>
                                <div style={{ fontSize: '0.9rem', color: '#c9d1d9' }}>"{r.promptText}"</div>
                                <div style={{ fontSize: '0.75rem', color: '#58a6ff' }}>Rank #{r.judgeResult.rankPosition} • {r.model}</div>
                            </div>
                        ))}
                    </div>

                    {/* Opportunities Details */}
                    <div className="card" style={{ borderColor: '#d29922' }}>
                        <h3 style={{ color: '#d29922', marginBottom: '1rem' }}>⚡ Opportunities</h3>
                        {opportunities.length === 0 && <p style={{ color: '#8b949e' }}>No opportunities found.</p>}
                        {opportunities.map((r, i) => (
                            <div key={i} style={{ padding: '0.5rem', borderBottom: '1px solid #30363d', marginBottom: '0.5rem' }}>
                                <div style={{ fontSize: '0.9rem', color: '#c9d1d9' }}>"{r.promptText}"</div>
                                <div style={{ fontSize: '0.75rem', color: '#58a6ff' }}>Rank {r.judgeResult.rankPosition || '>10'} • {r.model}</div>
                            </div>
                        ))}
                    </div>

                    {/* Gaps Details */}
                    <div className="card" style={{ borderColor: '#da3633' }}>
                        <h3 style={{ color: '#da3633', marginBottom: '1rem' }}>👻 Visibility Gaps</h3>
                        {ghosts.map((r, i) => (
                            <div key={i} style={{ padding: '0.25rem', color: '#8b949e', fontSize: '0.85rem' }}>
                                "{r.promptText}" <span style={{ fontSize: '0.7em' }}>({r.model})</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Generated Assets Section (if exists) */}
            {assets && (
                <div className="card" style={{
                    background: 'linear-gradient(135deg, rgba(35, 134, 54, 0.05) 0%, rgba(35, 134, 54, 0.02) 100%)',
                    border: '1px solid rgba(35, 134, 54, 0.3)'
                }}>
                    <h2 style={{ color: '#3fb950', marginBottom: '1rem' }}>✅ Your GEO Assets Are Ready!</h2>
                    <p style={{ color: '#8b949e', marginBottom: '1.5rem' }}>
                        Copy and implement these AI-optimized elements on your website:
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <details style={{ background: '#0d1117', padding: '1rem', borderRadius: '8px' }}>
                            <summary style={{ cursor: 'pointer', color: '#58a6ff', fontWeight: 600 }}>FAQ Schema (JSON-LD)</summary>
                            <pre style={{ marginTop: '1rem', fontSize: '0.85rem', overflow: 'auto' }}>
                                {JSON.stringify(assets.faq.jsonLd, null, 2)}
                            </pre>
                        </details>

                        <details style={{ background: '#0d1117', padding: '1rem', borderRadius: '8px' }}>
                            <summary style={{ cursor: 'pointer', color: '#58a6ff', fontWeight: 600 }}>About Snippet</summary>
                            <p style={{ marginTop: '1rem', color: '#c9d1d9' }}>{assets.aboutSnippet}</p>
                        </details>

                        <details style={{ background: '#0d1117', padding: '1rem', borderRadius: '8px' }}>
                            <summary style={{ cursor: 'pointer', color: '#58a6ff', fontWeight: 600 }}>Organization Schema</summary>
                            <pre style={{ marginTop: '1rem', fontSize: '0.85rem', overflow: 'auto' }}>
                                {JSON.stringify(assets.orgSchema, null, 2)}
                            </pre>
                        </details>
                    </div>
                </div>
            )}

            {/* Secondary Actions */}
            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                <button
                    onClick={reset}
                    style={{
                        background: 'transparent',
                        border: '1px solid #30363d',
                        color: '#8b949e',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    ← New Scan
                </button>
            </div>
        </div>
    );
}
