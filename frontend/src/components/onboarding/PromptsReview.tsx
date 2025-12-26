import { useState } from 'react';

interface PromptsReviewProps {
    prompts: string[];
    onUpdate: (prompts: string[]) => void;
    onContinue: () => void;
    onBack: () => void;
}

export function PromptsReview({ prompts, onUpdate, onContinue, onBack }: PromptsReviewProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editText, setEditText] = useState('');

    const handleEdit = (index: number) => {
        setEditingIndex(index);
        setEditText(prompts[index]);
    };

    const handleSave = () => {
        if (editingIndex !== null) {
            const updated = [...prompts];
            updated[editingIndex] = editText;
            onUpdate(updated);
            setEditingIndex(null);
        }
    };

    const handleDelete = (index: number) => {
        const updated = prompts.filter((_, i) => i !== index);
        onUpdate(updated);
    };

    const handleAdd = () => {
        onUpdate([...prompts, "New prompt..."]);
        setEditingIndex(prompts.length);
        setEditText("New prompt...");
    };

    const getTypeColor = (index: number) => {
        const typeIndex = Math.floor(index / 5) % 4;
        const colors = [
            { bg: 'rgba(88, 166, 255, 0.1)', border: 'rgba(88, 166, 255, 0.3)', text: '#58a6ff' }, // Blue - Transactional
            { bg: 'rgba(188, 140, 242, 0.1)', border: 'rgba(188, 140, 242, 0.3)', text: '#bc8cf2' }, // Purple - Informational
            { bg: 'rgba(247, 120, 186, 0.1)', border: 'rgba(247, 120, 186, 0.3)', text: '#f778ba' }, // Pink - Comparative
            { bg: 'rgba(35, 134, 54, 0.1)', border: 'rgba(35, 134, 54, 0.3)', text: '#238636' } // Green - Natural Language
        ];
        return colors[typeIndex];
    };

    return (
        <div style={{ maxWidth: '800px', margin: '3rem auto' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#c9d1d9' }}>
                    Discovery Prompts
                </h2>
                <p style={{ color: '#8b949e' }}>
                    Review and customize the {prompts.length} prompts we'll test
                </p>
                <div style={{ marginTop: '1rem' }}>
                    <span style={{
                        background: 'rgba(88, 166, 255, 0.1)',
                        border: '1px solid rgba(88, 166, 255, 0.2)',
                        color: '#58a6ff',
                        padding: '0.3rem 1rem',
                        borderRadius: '20px',
                        fontSize: '0.9rem'
                    }}>
                        {prompts.length}/20 prompts
                    </span>
                </div>
            </div>

            {/* Prompts Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                {prompts.map((prompt, index) => {
                    const colors = getTypeColor(index);
                    const isEditing = editingIndex === index;

                    return (
                        <div
                            key={index}
                            style={{
                                background: colors.bg,
                                border: `1px solid ${colors.border}`,
                                borderRadius: '10px',
                                padding: '1rem 1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                transition: 'all 0.2s',
                                position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateX(4px)';
                                e.currentTarget.style.boxShadow = `0 4px 12px ${colors.border}`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateX(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            {/* Number Badge */}
                            <div style={{
                                minWidth: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: colors.border,
                                color: colors.text,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.85rem'
                            }}>
                                {index + 1}
                            </div>

                            {/* Prompt Text */}
                            {isEditing ? (
                                <input
                                    autoFocus
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    onBlur={handleSave}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSave();
                                        if (e.key === 'Escape') setEditingIndex(null);
                                    }}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(13, 17, 23, 0.6)',
                                        border: `1px solid ${colors.text}`,
                                        color: '#fff',
                                        padding: '0.5rem',
                                        borderRadius: '6px',
                                        fontSize: '1rem',
                                        outline: 'none'
                                    }}
                                />
                            ) : (
                                <div
                                    onClick={() => handleEdit(index)}
                                    style={{
                                        flex: 1,
                                        color: '#c9d1d9',
                                        fontSize: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {prompt}
                                </div>
                            )}

                            {/* Delete Button */}
                            <button
                                onClick={() => handleDelete(index)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#8b949e',
                                    fontSize: '1.2rem',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    opacity: 0.5,
                                    transition: 'opacity 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                            >
                                ×
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Add Prompt Button */}
            <button
                onClick={handleAdd}
                style={{
                    width: '100%',
                    background: 'rgba(88, 166, 255, 0.05)',
                    border: '2px dashed rgba(88, 166, 255, 0.3)',
                    color: '#58a6ff',
                    padding: '1rem',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    marginBottom: '2rem',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(88, 166, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(88, 166, 255, 0.5)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(88, 166, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(88, 166, 255, 0.3)';
                }}
            >
                + Add Custom Prompt
            </button>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
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
                    Start Analysis →
                </button>
            </div>
        </div>
    );
}
