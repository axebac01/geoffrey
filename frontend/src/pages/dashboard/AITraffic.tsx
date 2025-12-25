import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import chatgptLogo from '../../assets/logos/chatgpt.png';
import perplexityLogo from '../../assets/logos/perplexity.png';
import geminiLogo from '../../assets/logos/gemini.png';
import deepseekLogo from '../../assets/logos/deepseek.png';
import copilotLogo from '../../assets/logos/copilot.png';
import claudeLogo from '../../assets/logos/claude.png';

interface TimeSeriesData {
    date: string;
    chatgpt: number;
    perplexity: number;
    gemini: number;
    deepseek: number;
    copilot: number;
    claude: number;
    total: number;
}

interface TimeSeriesResponse {
    dateRange: { start: string; end: string };
    groupBy: 'day' | 'week' | 'month';
    data: TimeSeriesData[];
}

const ASSISTANT_CONFIG = {
    chatgpt: { logo: chatgptLogo, color: '#10a37f', name: 'ChatGPT' },
    perplexity: { logo: perplexityLogo, color: '#20b2aa', name: 'Perplexity' },
    gemini: { logo: geminiLogo, color: '#4285f4', name: 'Gemini' },
    deepseek: { logo: deepseekLogo, color: '#4a9eff', name: 'Deepseek' },
    copilot: { logo: copilotLogo, color: '#0078d4', name: 'Copilot' },
    claude: { logo: claudeLogo, color: '#cc785c', name: 'Claude' },
};

export function AITrafficPage() {
    const { getToken } = useAuth();
    
    // Date range state
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 28);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    
    // Model selection state
    const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set(['chatgpt', 'perplexity', 'gemini', 'deepseek', 'copilot', 'claude']));
    
    // Time grouping state
    const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
    
    // Data state
    const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Fetch time-series data
    useEffect(() => {
        fetchTimeSeriesData();
    }, [startDate, endDate, groupBy]);
    
    async function fetchTimeSeriesData() {
        setLoading(true);
        setError(null);
        
        try {
            const token = await getToken();
            const params = new URLSearchParams({
                start: startDate,
                end: endDate,
                groupBy,
            });
            
            const response = await fetch(`/api/metrics/ai-clicks/timeseries?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch time-series data');
            }
            
            const data: TimeSeriesResponse = await response.json();
            setTimeSeriesData(data.data);
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
            setTimeSeriesData([]);
        } finally {
            setLoading(false);
        }
    }
    
    // Calculate summary metrics
    const totalSessions = timeSeriesData.reduce((sum, d) => sum + d.total, 0);
    const modelTotals = {
        chatgpt: timeSeriesData.reduce((sum, d) => sum + d.chatgpt, 0),
        perplexity: timeSeriesData.reduce((sum, d) => sum + d.perplexity, 0),
        gemini: timeSeriesData.reduce((sum, d) => sum + d.gemini, 0),
        deepseek: timeSeriesData.reduce((sum, d) => sum + d.deepseek, 0),
        copilot: timeSeriesData.reduce((sum, d) => sum + d.copilot, 0),
        claude: timeSeriesData.reduce((sum, d) => sum + d.claude, 0),
    };
    const topModel = Object.entries(modelTotals).reduce((a, b) => 
        modelTotals[a[0] as keyof typeof modelTotals] > modelTotals[b[0] as keyof typeof modelTotals] ? a : b
    )[0];
    const avgDailySessions = timeSeriesData.length > 0 ? totalSessions / timeSeriesData.length : 0;
    
    // Calculate growth (compare first half vs second half of period)
    const midPoint = Math.floor(timeSeriesData.length / 2);
    const firstHalf = timeSeriesData.slice(0, midPoint).reduce((sum, d) => sum + d.total, 0);
    const secondHalf = timeSeriesData.slice(midPoint).reduce((sum, d) => sum + d.total, 0);
    const growth = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
    
    // Toggle model selection
    function toggleModel(model: string) {
        const newSet = new Set(selectedModels);
        if (newSet.has(model)) {
            newSet.delete(model);
        } else {
            newSet.add(model);
        }
        setSelectedModels(newSet);
    }
    
    function selectAllModels() {
        setSelectedModels(new Set(['chatgpt', 'perplexity', 'gemini', 'deepseek', 'copilot', 'claude']));
    }
    
    function deselectAllModels() {
        setSelectedModels(new Set());
    }
    
    // Format date for display - handles GA4 date formats
    function formatDate(dateStr: string): string {
        let date: Date;
        
        if (groupBy === 'month') {
            // Format: "YYYYMM" -> "202512"
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            date = new Date(`${year}-${month}-01`);
            if (isNaN(date.getTime())) {
                return dateStr; // Fallback if parsing fails
            }
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        } else if (groupBy === 'week') {
            // Format: "YYYYWww" -> "2025W52"
            const match = dateStr.match(/(\d{4})W(\d{2})/);
            if (match) {
                const year = parseInt(match[1], 10);
                const week = parseInt(match[2], 10);
                // Calculate date from year and week number
                // ISO week starts on Monday, week 1 is the week with Jan 4
                const jan4 = new Date(year, 0, 4);
                const jan4Day = jan4.getDay() || 7; // Convert Sunday (0) to 7
                const daysToMonday = (8 - jan4Day) % 7;
                const firstMonday = new Date(jan4.getTime() + (daysToMonday * 24 * 60 * 60 * 1000));
                const days = (week - 1) * 7;
                date = new Date(firstMonday.getTime() + (days * 24 * 60 * 60 * 1000));
            } else {
                // Fallback: try to parse as regular date
                date = new Date(dateStr);
            }
            if (isNaN(date.getTime())) {
                return dateStr; // Fallback if parsing fails
            }
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else {
            // Format: "YYYYMMDD" -> "20251225"
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            date = new Date(`${year}-${month}-${day}`);
            if (isNaN(date.getTime())) {
                return dateStr; // Fallback if parsing fails
            }
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }
    
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem' }}>AI Traffic Analytics</h1>
            </div>
            
            {/* Controls */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    {/* Date Range */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#8b949e', marginBottom: '0.5rem' }}>
                            From
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            max={endDate}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                background: '#21262d',
                                border: '1px solid #30363d',
                                borderRadius: '6px',
                                color: '#c9d1d9',
                                fontSize: '0.9rem',
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#8b949e', marginBottom: '0.5rem' }}>
                            To
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate}
                            max={new Date().toISOString().split('T')[0]}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                background: '#21262d',
                                border: '1px solid #30363d',
                                borderRadius: '6px',
                                color: '#c9d1d9',
                                fontSize: '0.9rem',
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#8b949e', marginBottom: '0.5rem' }}>
                            Group By
                        </label>
                        <select
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                background: '#21262d',
                                border: '1px solid #30363d',
                                borderRadius: '6px',
                                color: '#c9d1d9',
                                fontSize: '0.9rem',
                            }}
                        >
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                        </select>
                    </div>
                </div>
                
                {/* Model Selection */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <label style={{ fontSize: '0.85rem', color: '#8b949e' }}>Select Models to Display</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={selectAllModels}
                                style={{
                                    padding: '0.25rem 0.75rem',
                                    background: 'transparent',
                                    border: '1px solid #30363d',
                                    borderRadius: '4px',
                                    color: '#8b949e',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                }}
                            >
                                Select All
                            </button>
                            <button
                                onClick={deselectAllModels}
                                style={{
                                    padding: '0.25rem 0.75rem',
                                    background: 'transparent',
                                    border: '1px solid #30363d',
                                    borderRadius: '4px',
                                    color: '#8b949e',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                }}
                            >
                                Deselect All
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        {Object.entries(ASSISTANT_CONFIG).map(([key, config]) => (
                            <label
                                key={key}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    cursor: 'pointer',
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                    background: selectedModels.has(key) ? 'rgba(88, 166, 255, 0.1)' : 'transparent',
                                    border: selectedModels.has(key) ? '1px solid rgba(88, 166, 255, 0.3)' : '1px solid transparent',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedModels.has(key)}
                                    onChange={() => toggleModel(key)}
                                    style={{ cursor: 'pointer' }}
                                />
                                {config.logo ? (
                                    <img src={config.logo} alt={config.name} style={{ width: '20px', height: '20px' }} />
                                ) : (
                                    <span style={{ fontSize: '1.2rem' }}>{config.icon}</span>
                                )}
                                <span style={{ fontSize: '0.9rem' }}>{config.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#8b949e', marginBottom: '0.5rem' }}>Total Sessions</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>{totalSessions.toLocaleString()}</div>
                </div>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#8b949e', marginBottom: '0.5rem' }}>Top Model</div>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '0.5rem',
                        fontSize: '1.25rem', 
                        fontWeight: 600 
                    }}>
                        {(() => {
                            const config = ASSISTANT_CONFIG[topModel as keyof typeof ASSISTANT_CONFIG];
                            if (!config) return '—';
                            return (
                                <>
                                    {config.logo ? (
                                        <img 
                                            src={config.logo} 
                                            alt={config.name} 
                                            style={{ width: '24px', height: '24px' }} 
                                        />
                                    ) : (
                                        config.icon && <span>{config.icon}</span>
                                    )}
                                    <span>{config.name}</span>
                                </>
                            );
                        })()}
                    </div>
                </div>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#8b949e', marginBottom: '0.5rem' }}>Growth</div>
                    <div style={{ 
                        fontSize: '2rem', 
                        fontWeight: 700,
                        color: growth >= 0 ? '#3fb950' : '#f85149'
                    }}>
                        {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                    </div>
                </div>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#8b949e', marginBottom: '0.5rem' }}>Avg Daily</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>{avgDailySessions.toFixed(0)}</div>
                </div>
            </div>
            
            {/* Graph */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>AI Traffic Over Time</h3>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#8b949e' }}>Loading data...</div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#f85149' }}>{error}</div>
                ) : timeSeriesData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#8b949e' }}>No data available for this period</div>
                ) : (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={timeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                            <XAxis 
                                dataKey="date" 
                                tickFormatter={formatDate}
                                stroke="#8b949e"
                                style={{ fontSize: '0.75rem' }}
                            />
                            <YAxis 
                                stroke="#8b949e"
                                style={{ fontSize: '0.75rem' }}
                                tickFormatter={(value) => Math.round(value).toString()}
                                allowDecimals={false}
                            />
                            <Tooltip 
                                contentStyle={{
                                    background: '#161b22',
                                    border: '1px solid #30363d',
                                    borderRadius: '6px',
                                    color: '#c9d1d9',
                                }}
                                labelFormatter={(label) => formatDate(label)}
                            />
                            <Legend 
                                content={(props) => {
                                    const { payload } = props;
                                    if (!payload) return null;
                                    
                                    return (
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'center', 
                                            flexWrap: 'wrap', 
                                            gap: '1rem',
                                            paddingTop: '1rem' 
                                        }}>
                                            {payload.map((entry: any, index: number) => {
                                                const modelKey = entry.dataKey;
                                                const config = ASSISTANT_CONFIG[modelKey as keyof typeof ASSISTANT_CONFIG];
                                                if (!config || !selectedModels.has(modelKey)) return null;
                                                
                                                return (
                                                    <div 
                                                        key={index} 
                                                        style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: '0.5rem',
                                                            fontSize: '0.85rem'
                                                        }}
                                                    >
                                                        {config.logo ? (
                                                            <img 
                                                                src={config.logo} 
                                                                alt={config.name} 
                                                                style={{ width: '16px', height: '16px' }} 
                                                            />
                                                        ) : (
                                                            config.icon && <span style={{ fontSize: '1rem' }}>{config.icon}</span>
                                                        )}
                                                        <span style={{ color: entry.color }}>{config.name}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                }}
                            />
                            {selectedModels.has('chatgpt') && (
                                <Line 
                                    type="monotone" 
                                    dataKey="chatgpt" 
                                    stroke={ASSISTANT_CONFIG.chatgpt.color} 
                                    strokeWidth={2}
                                    name="ChatGPT"
                                    dot={false}
                                />
                            )}
                            {selectedModels.has('perplexity') && (
                                <Line 
                                    type="monotone" 
                                    dataKey="perplexity" 
                                    stroke={ASSISTANT_CONFIG.perplexity.color} 
                                    strokeWidth={2}
                                    name="Perplexity"
                                    dot={false}
                                />
                            )}
                            {selectedModels.has('gemini') && (
                                <Line 
                                    type="monotone" 
                                    dataKey="gemini" 
                                    stroke={ASSISTANT_CONFIG.gemini.color} 
                                    strokeWidth={2}
                                    name="Gemini"
                                    dot={false}
                                />
                            )}
                            {selectedModels.has('deepseek') && (
                                <Line 
                                    type="monotone" 
                                    dataKey="deepseek" 
                                    stroke={ASSISTANT_CONFIG.deepseek.color} 
                                    strokeWidth={2}
                                    name="Deepseek"
                                    dot={false}
                                />
                            )}
                            {selectedModels.has('copilot') && (
                                <Line 
                                    type="monotone" 
                                    dataKey="copilot" 
                                    stroke={ASSISTANT_CONFIG.copilot.color} 
                                    strokeWidth={2}
                                    name="Copilot"
                                    dot={false}
                                />
                            )}
                            {selectedModels.has('claude') && (
                                <Line 
                                    type="monotone" 
                                    dataKey="claude" 
                                    stroke={ASSISTANT_CONFIG.claude.color} 
                                    strokeWidth={2}
                                    name="Claude"
                                    dot={false}
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
            
            {/* Model Comparison Table */}
            <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Model Comparison</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #30363d' }}>
                            <th style={{ textAlign: 'left', padding: '0.75rem', color: '#8b949e', fontSize: '0.85rem', fontWeight: 600 }}>Model</th>
                            <th style={{ textAlign: 'right', padding: '0.75rem', color: '#8b949e', fontSize: '0.85rem', fontWeight: 600 }}>Sessions</th>
                            <th style={{ textAlign: 'right', padding: '0.75rem', color: '#8b949e', fontSize: '0.85rem', fontWeight: 600 }}>Share</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(modelTotals)
                            .sort((a, b) => b[1] - a[1])
                            .map(([key, sessions]) => {
                                const config = ASSISTANT_CONFIG[key as keyof typeof ASSISTANT_CONFIG];
                                const share = totalSessions > 0 ? (sessions / totalSessions) * 100 : 0;
                                
                                return (
                                    <tr key={key} style={{ borderBottom: '1px solid #21262d' }}>
                                        <td style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {config.logo ? (
                                                <img src={config.logo} alt={config.name} style={{ width: '24px', height: '24px' }} />
                                            ) : (
                                                <span style={{ fontSize: '1.2rem' }}>{config.icon}</span>
                                            )}
                                            <span>{config.name}</span>
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 600 }}>
                                            {sessions.toLocaleString()}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '0.75rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <div style={{ width: '100px', background: '#21262d', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                                                    <div 
                                                        style={{ 
                                                            width: `${share}%`, 
                                                            height: '100%', 
                                                            background: config.color,
                                                            borderRadius: '4px',
                                                        }} 
                                                    />
                                                </div>
                                                <span style={{ fontSize: '0.9rem', color: '#8b949e', minWidth: '50px' }}>
                                                    {share.toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

