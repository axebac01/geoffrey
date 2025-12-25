import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

interface Prompt {
    id: string;
    prompt_text: string;
    keyword: string | null;
    intent: string | null;
    quality_score: number | null;
    is_approved: boolean;
    created_at: string;
}

interface TestResult {
    id: string;
    is_mentioned: boolean;
    mention_type: string;
    rank_position: number | null;
    industry_match: boolean;
    location_match: boolean;
    sentiment: string | null;
    responder_answer: string;
    tested_at: string;
}

export function PromptsPage() {
    const { getToken } = useAuth();
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [loading, setLoading] = useState(true);
    const [newPrompt, setNewPrompt] = useState('');
    const [adding, setAdding] = useState(false);
    const [testingId, setTestingId] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<string, TestResult | null>>({});
    const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
    const [promptHistory, setPromptHistory] = useState<Record<string, TestResult[]>>({});

    useEffect(() => {
        loadPrompts();
    }, []);

    async function loadPrompts() {
        try {
            const token = await getToken();
            const res = await fetch('/api/prompts', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setPrompts(data.prompts || []);
        } catch (error) {
            console.error('Failed to load prompts:', error);
        } finally {
            setLoading(false);
        }
    }

    async function addPrompt() {
        if (!newPrompt.trim()) return;
        setAdding(true);

        try {
            const token = await getToken();
            const res = await fetch('/api/prompts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ promptText: newPrompt.trim() })
            });
            const data = await res.json();
            if (data.prompt) {
                setPrompts([data.prompt, ...prompts]);
                setNewPrompt('');
            }
        } catch (error) {
            console.error('Failed to add prompt:', error);
        } finally {
            setAdding(false);
        }
    }

    async function deletePrompt(id: string) {
        if (!confirm('Are you sure you want to delete this prompt?')) return;

        try {
            const token = await getToken();
            await fetch(`/api/prompts/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            setPrompts(prompts.filter(p => p.id !== id));
        } catch (error) {
            console.error('Failed to delete prompt:', error);
        }
    }

    async function testPrompt(id: string) {
        setTestingId(id);
        setTestResults(prev => ({ ...prev, [id]: null }));

        try {
            const token = await getToken();
            const res = await fetch(`/api/prompts/${id}/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    businessName: 'Test Business', // TODO: Get from user's business
                    industry: 'Unknown',
                    region: 'Unknown'
                })
            });
            const data = await res.json();
            if (data.test) {
                setTestResults(prev => ({ ...prev, [id]: data.test }));
            }
        } catch (error) {
            console.error('Failed to test prompt:', error);
        } finally {
            setTestingId(null);
        }
    }

    async function loadHistory(id: string) {
        if (promptHistory[id]) return; // Already loaded

        try {
            const token = await getToken();
            const res = await fetch(`/api/prompts/${id}/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setPromptHistory(prev => ({ ...prev, [id]: data.tests || [] }));
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }

    function toggleExpand(id: string) {
        if (expandedPrompt === id) {
            setExpandedPrompt(null);
        } else {
            setExpandedPrompt(id);
            loadHistory(id);
        }
    }

    const getResultBadge = (result: TestResult | null) => {
        if (!result) return null;

        if (result.is_mentioned) {
            const color = result.rank_position && result.rank_position <= 3 ? '#3fb950' : '#d29922';
            return (
                <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    background: `${color}20`,
                    color: color,
                    fontSize: '0.8rem',
                    fontWeight: 500
                }}>
                    {result.rank_position && result.rank_position <= 3 ? '🏆' : '⚡'} 
                    {result.mention_type === 'direct' ? 'Direct' : result.mention_type} mention
                    {result.rank_position && ` • Rank #${result.rank_position}`}
                </span>
            );
        }

        return (
            <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                background: 'rgba(218, 54, 51, 0.2)',
                color: '#f85149',
                fontSize: '0.8rem',
                fontWeight: 500
            }}>
                👻 Not mentioned
            </span>
        );
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: '#8b949e' }}>Loading prompts...</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '900px' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>🔍 Prompt Testing</h1>
                <p style={{ color: '#8b949e' }}>
                    Test how AI assistants respond to search queries about your business.
                </p>
            </div>

            {/* Add new prompt */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Add New Prompt</h3>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                        type="text"
                        value={newPrompt}
                        onChange={(e) => setNewPrompt(e.target.value)}
                        placeholder="Enter a search query to test..."
                        onKeyPress={(e) => e.key === 'Enter' && addPrompt()}
                        style={{
                            flex: 1,
                            padding: '0.75rem 1rem',
                            background: 'rgba(13, 17, 23, 0.8)',
                            border: '1px solid #30363d',
                            borderRadius: '8px',
                            color: '#c9d1d9',
                            fontSize: '0.95rem'
                        }}
                    />
                    <button
                        onClick={addPrompt}
                        disabled={adding || !newPrompt.trim()}
                        className="btn-primary"
                        style={{ padding: '0.75rem 1.5rem' }}
                    >
                        {adding ? 'Adding...' : 'Add Prompt'}
                    </button>
                </div>
            </div>

            {/* Prompts list */}
            {prompts.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                    <h3 style={{ marginBottom: '0.5rem' }}>No prompts yet</h3>
                    <p style={{ color: '#8b949e' }}>
                        Add search queries above to start testing your AI visibility.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {prompts.map((prompt) => (
                        <div
                            key={prompt.id}
                            className="card"
                            style={{
                                padding: '1.25rem',
                                border: testResults[prompt.id]?.is_mentioned 
                                    ? '1px solid rgba(63, 185, 80, 0.3)' 
                                    : testResults[prompt.id] 
                                        ? '1px solid rgba(218, 54, 51, 0.3)'
                                        : undefined
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <p style={{ 
                                        color: '#c9d1d9', 
                                        fontSize: '1rem',
                                        marginBottom: '0.5rem'
                                    }}>
                                        "{prompt.prompt_text}"
                                    </p>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {prompt.intent && (
                                            <span style={{
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '4px',
                                                background: 'rgba(88, 166, 255, 0.1)',
                                                color: '#58a6ff',
                                                fontSize: '0.75rem'
                                            }}>
                                                {prompt.intent}
                                            </span>
                                        )}
                                        {testResults[prompt.id] && getResultBadge(testResults[prompt.id])}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                    <button
                                        onClick={() => testPrompt(prompt.id)}
                                        disabled={testingId === prompt.id}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            background: testingId === prompt.id 
                                                ? 'rgba(88, 166, 255, 0.3)' 
                                                : 'linear-gradient(90deg, #58a6ff, #bc8cf2)',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: '#fff',
                                            cursor: testingId === prompt.id ? 'not-allowed' : 'pointer',
                                            fontSize: '0.85rem',
                                            fontWeight: 500
                                        }}
                                    >
                                        {testingId === prompt.id ? '⏳ Testing...' : '▶ Test'}
                                    </button>
                                    <button
                                        onClick={() => toggleExpand(prompt.id)}
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            background: 'rgba(48, 54, 61, 0.5)',
                                            border: '1px solid #30363d',
                                            borderRadius: '6px',
                                            color: '#8b949e',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        {expandedPrompt === prompt.id ? '▲' : '▼'}
                                    </button>
                                    <button
                                        onClick={() => deletePrompt(prompt.id)}
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            background: 'transparent',
                                            border: '1px solid rgba(218, 54, 51, 0.3)',
                                            borderRadius: '6px',
                                            color: '#f85149',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        🗑
                                    </button>
                                </div>
                            </div>

                            {/* Expanded view with AI response and history */}
                            {expandedPrompt === prompt.id && (
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #30363d' }}>
                                    {testResults[prompt.id]?.responder_answer && (
                                        <div style={{ marginBottom: '1rem' }}>
                                            <h4 style={{ fontSize: '0.9rem', color: '#8b949e', marginBottom: '0.5rem' }}>
                                                Latest AI Response
                                            </h4>
                                            <div style={{
                                                background: 'rgba(13, 17, 23, 0.6)',
                                                borderRadius: '8px',
                                                padding: '1rem',
                                                fontSize: '0.85rem',
                                                color: '#c9d1d9',
                                                maxHeight: '200px',
                                                overflowY: 'auto'
                                            }}>
                                                {testResults[prompt.id]?.responder_answer}
                                            </div>
                                        </div>
                                    )}

                                    {/* Test history */}
                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', color: '#8b949e', marginBottom: '0.5rem' }}>
                                            Test History
                                        </h4>
                                        {promptHistory[prompt.id]?.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {promptHistory[prompt.id].map((test) => (
                                                    <div
                                                        key={test.id}
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            padding: '0.5rem 0.75rem',
                                                            background: 'rgba(13, 17, 23, 0.4)',
                                                            borderRadius: '6px'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <span style={{
                                                                width: '8px',
                                                                height: '8px',
                                                                borderRadius: '50%',
                                                                background: test.is_mentioned ? '#3fb950' : '#f85149'
                                                            }} />
                                                            <span style={{ color: '#8b949e', fontSize: '0.8rem' }}>
                                                                {test.is_mentioned 
                                                                    ? `Mentioned (${test.mention_type})${test.rank_position ? ` - Rank #${test.rank_position}` : ''}`
                                                                    : 'Not mentioned'
                                                                }
                                                            </span>
                                                        </div>
                                                        <span style={{ color: '#6e7681', fontSize: '0.75rem' }}>
                                                            {new Date(test.tested_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p style={{ color: '#6e7681', fontSize: '0.85rem' }}>
                                                No test history yet. Run a test to see results here.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

