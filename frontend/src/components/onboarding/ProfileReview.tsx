import { useState } from 'react';
import type { EntitySnapshot } from '../../types';

interface ProfileReviewProps {
    snapshot: EntitySnapshot;
    onEdit: (snapshot: EntitySnapshot) => void;
    onContinue: () => void;
    onBack: () => void;
}

export function ProfileReview({ snapshot, onEdit, onContinue, onBack }: ProfileReviewProps) {
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(snapshot.businessName);

    const handleNameSave = () => {
        onEdit({ ...snapshot, businessName: editedName });
        setIsEditingName(false);
    };

    return (
        <div style={{ maxWidth: '700px', margin: '3rem auto', textAlign: 'center' }}>
            {/* Header */}
            <div style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#c9d1d9' }}>
                    Business Profile
                </h2>
                <p style={{ color: '#8b949e' }}>
                    We analyzed your website. Does this look correct?
                </p>
            </div>

            {/* Futuristic Profile Card */}
            <div className="card" style={{
                background: 'linear-gradient(135deg, rgba(88, 166, 255, 0.05) 0%, rgba(188, 140, 242, 0.05) 100%)',
                border: '1px solid rgba(88, 166, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(88, 166, 255, 0.1)',
                padding: '3rem 2rem',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Animated background glow */}
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

                {/* Logo */}
                {snapshot.logoUrl && (
                    <div style={{
                        width: '120px',
                        height: '120px',
                        margin: '0 auto 2rem',
                        borderRadius: '20px',
                        background: 'rgba(22, 27, 34, 0.8)',
                        border: '2px solid rgba(88, 166, 255, 0.3)',
                        boxShadow: '0 0 30px rgba(88, 166, 255, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        zIndex: 1
                    }}>
                        <img
                            src={snapshot.logoUrl}
                            alt={`${snapshot.businessName} logo`}
                            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
                            onError={(e) => {
                                // Hide logo if it fails to load
                                (e.target as HTMLElement).style.display = 'none';
                            }}
                        />
                    </div>
                )}

                {/* Company Name */}
                <div style={{ position: 'relative', zIndex: 1, marginBottom: '2rem' }}>
                    {isEditingName ? (
                        <div>
                            <input
                                autoFocus
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                onBlur={handleNameSave}
                                onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                                style={{
                                    fontSize: '2.5rem',
                                    fontWeight: 700,
                                    textAlign: 'center',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: '2px solid #58a6ff',
                                    color: '#fff',
                                    padding: '0.5rem',
                                    width: '100%',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    ) : (
                        <h1
                            onClick={() => setIsEditingName(true)}
                            style={{
                                fontSize: '2.5rem',
                                fontWeight: 700,
                                marginBottom: '0.5rem',
                                background: 'linear-gradient(90deg, #58a6ff, #bc8cf2, #f778ba)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            {snapshot.businessName}
                        </h1>
                    )}
                </div>

                {/* Company Description */}
                {snapshot.description && (
                    <p style={{
                        color: '#8b949e',
                        fontSize: '1.05rem',
                        lineHeight: '1.6',
                        marginBottom: '2rem',
                        maxWidth: '600px',
                        margin: '0 auto 2rem',
                        position: 'relative',
                        zIndex: 1
                    }}>
                        {snapshot.description}
                    </p>
                )}

                {/* Industry Badge */}
                <div style={{ marginBottom: '2rem' }}>
                    <span style={{
                        display: 'inline-block',
                        background: 'rgba(88, 166, 255, 0.15)',
                        border: '1px solid rgba(88, 166, 255, 0.3)',
                        color: '#58a6ff',
                        padding: '0.5rem 1.5rem',
                        borderRadius: '30px',
                        fontSize: '1rem',
                        fontWeight: 500
                    }}>
                        {snapshot.industry}
                    </span>
                </div>

                {/* Region */}
                <div style={{ marginBottom: '2rem', color: '#8b949e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>📍</span>
                    <span style={{ fontSize: '1rem' }}>{snapshot.region}</span>
                </div>

                {/* Strategic Focus */}
                {snapshot.strategicFocus && snapshot.strategicFocus.length > 0 && (
                    <div style={{ margin: '2rem 0' }}>
                        <label style={{ display: 'block', marginBottom: '1rem', color: '#8b949e', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            ✨ Strategic Focus
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                            {snapshot.strategicFocus.map((f: string, i: number) => (
                                <span key={i} style={{
                                    background: 'rgba(188, 140, 242, 0.1)',
                                    color: '#bc8cf2',
                                    padding: '0.4rem 1rem',
                                    borderRadius: '20px',
                                    fontSize: '0.85rem',
                                    border: '1px solid rgba(188, 140, 242, 0.3)',
                                    fontWeight: 500
                                }}>
                                    {f}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'transparent',
                        border: '1px solid #30363d',
                        color: '#8b949e',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        fontSize: '1rem'
                    }}
                >
                    ← Back
                </button>
                <button
                    onClick={onContinue}
                    className="btn-primary"
                    style={{
                        fontSize: '1.1rem',
                        padding: '0.75rem 2rem',
                        background: 'linear-gradient(90deg, #58a6ff, #bc8cf2)',
                        border: 'none',
                        boxShadow: '0 4px 15px rgba(88, 166, 255, 0.3)'
                    }}
                >
                    Looks correct →
                </button>
            </div>
        </div>
    );
}
