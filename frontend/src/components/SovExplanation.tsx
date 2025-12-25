import { useState } from 'react';

interface SovExplanationProps {
    shareOfVoice?: {
        brandShare: number;
        brandMentionRate: number;
        totalMentions: number;
    };
}

export function SovExplanation({ shareOfVoice }: SovExplanationProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div style={{
            background: 'rgba(88, 166, 255, 0.05)',
            border: '1px solid rgba(88, 166, 255, 0.2)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer'
            }}
            onClick={() => setIsExpanded(!isExpanded)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
                    <h4 style={{
                        margin: 0,
                        color: '#c9d1d9',
                        fontSize: '1.1rem',
                        fontWeight: 600
                    }}>
                        Vad är Share of Voice (SoV)?
                    </h4>
                </div>
                <span style={{
                    color: '#58a6ff',
                    fontSize: '1.2rem',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s'
                }}>
                    ▼
                </span>
            </div>

            {isExpanded && (
                <div style={{
                    marginTop: '1.5rem',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid rgba(88, 166, 255, 0.2)',
                    color: '#8b949e',
                    lineHeight: '1.6'
                }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h5 style={{ color: '#c9d1d9', marginBottom: '0.5rem', fontSize: '1rem' }}>
                            Definition
                        </h5>
                        <p style={{ margin: 0, fontSize: '0.95rem' }}>
                            <strong style={{ color: '#58a6ff' }}>Share of Voice (SoV)</strong> mäter din brands andel av alla mentions i AI-svar jämfört med dina konkurrenter. 
                            Det visar hur stor del av "rösten" i AI-svar som tillhör din brand.
                        </p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <h5 style={{ color: '#c9d1d9', marginBottom: '0.5rem', fontSize: '1rem' }}>
                            Hur beräknas SoV?
                        </h5>
                        <ol style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.95rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>
                                Vi räknar antal gånger din brand nämns i AI-svar
                            </li>
                            <li style={{ marginBottom: '0.5rem' }}>
                                Vi räknar antal gånger varje konkurrent nämns
                            </li>
                            <li style={{ marginBottom: '0.5rem' }}>
                                Vi beräknar totala mentions (brand + alla competitors)
                            </li>
                            <li>
                                <strong style={{ color: '#58a6ff' }}>SoV = (Brand Mentions / Total Mentions) × 100%</strong>
                            </li>
                        </ol>
                    </div>

                    {shareOfVoice && (
                        <div style={{
                            background: 'rgba(13, 17, 23, 0.6)',
                            borderRadius: '8px',
                            padding: '1rem',
                            marginBottom: '1.5rem'
                        }}>
                            <h5 style={{ color: '#c9d1d9', marginBottom: '0.75rem', fontSize: '1rem' }}>
                                Din SoV Beräkning
                            </h5>
                            <div style={{ fontSize: '0.9rem', lineHeight: '1.8' }}>
                                <div>
                                    <strong style={{ color: '#58a6ff' }}>Brand Mentions:</strong> {shareOfVoice.totalMentions > 0 
                                        ? Math.round(shareOfVoice.brandShare * shareOfVoice.totalMentions / 100)
                                        : 0} av {shareOfVoice.totalMentions} totala mentions
                                </div>
                                <div>
                                    <strong style={{ color: '#58a6ff' }}>Brand Mention Rate:</strong> {(shareOfVoice.brandMentionRate * 100).toFixed(0)}% av prompts
                                </div>
                                <div>
                                    <strong style={{ color: '#58a6ff' }}>SoV:</strong> {shareOfVoice.brandShare.toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ marginBottom: '1.5rem' }}>
                        <h5 style={{ color: '#c9d1d9', marginBottom: '0.5rem', fontSize: '1rem' }}>
                            Varför är SoV viktigt?
                        </h5>
                        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.95rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>
                                <strong style={{ color: '#58a6ff' }}>Marknadsposition:</strong> Visar din position relativt konkurrenter i AI-svar
                            </li>
                            <li style={{ marginBottom: '0.5rem' }}>
                                <strong style={{ color: '#58a6ff' }}>Synlighet:</strong> Högre SoV = mer synlig i AI-rekommendationer
                            </li>
                            <li style={{ marginBottom: '0.5rem' }}>
                                <strong style={{ color: '#58a6ff' }}>Konkurrenskraft:</strong> Identifiera var konkurrenter vinner och var du kan förbättra
                            </li>
                            <li>
                                <strong style={{ color: '#58a6ff' }}>Mätbarhet:</strong> Konkret siffra att förbättra över tid
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h5 style={{ color: '#c9d1d9', marginBottom: '0.5rem', fontSize: '1rem' }}>
                            Vad är en bra SoV?
                        </h5>
                        <div style={{ fontSize: '0.95rem' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.5rem',
                                padding: '0.5rem',
                                background: 'rgba(35, 134, 54, 0.1)',
                                borderRadius: '6px',
                                border: '1px solid rgba(35, 134, 54, 0.3)'
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>✅</span>
                                <div>
                                    <strong style={{ color: '#3fb950' }}>50%+:</strong> Utmärkt - du dominerar marknaden
                                </div>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.5rem',
                                padding: '0.5rem',
                                background: 'rgba(210, 153, 34, 0.1)',
                                borderRadius: '6px',
                                border: '1px solid rgba(210, 153, 34, 0.3)'
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                                <div>
                                    <strong style={{ color: '#d29922' }}>25-50%:</strong> Bra - du är väl representerad
                                </div>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem',
                                background: 'rgba(218, 54, 51, 0.1)',
                                borderRadius: '6px',
                                border: '1px solid rgba(218, 54, 51, 0.3)'
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>📈</span>
                                <div>
                                    <strong style={{ color: '#f85149' }}>&lt;25%:</strong> Förbättringspotential - konkurrenter är mer synliga
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

