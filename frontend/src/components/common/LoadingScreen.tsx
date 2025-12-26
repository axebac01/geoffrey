import { useState, useEffect } from 'react';

const STATUS_MESSAGES = [
    { text: "Initializing analysis engine...", sub: "Setting up secure connection" },
    { text: "Generating 20 diverse intent scenarios...", sub: "Transactional, Informational, and Local" },
    { text: "Simulating AI user queries...", sub: "Testing against ChatGPT and Gemini" },
    { text: "Benchmarking visibility rank...", sub: "Scanning top 50 results" },
    { text: "Running AI Judge (Pass 2)...", sub: "Validating accuracy and sentiment" },
    { text: "Finalizing visibility scorecard...", sub: "Mapping wins and opportunities" }
];

const GEO_FACTS = [
    { label: "Market Growth", text: "Generative AI search usage is growing 50% faster than traditional search among Gen Z." },
    { label: "Trust Factor", text: "70% of users trust AI-recommended brands more than those in 'Sponsored' ad slots." },
    { label: "Visibility Gap", text: "95% of businesses are optimized for SEO but have zero strategy for Gemini and ChatGPT visibility." },
    { label: "Conversion", text: "Direct brand mentions in LLM responses lead to a 3.5x higher click-through rate to your site." }
];

export function LoadingScreen() {
    const [statusIndex, setStatusIndex] = useState(0);
    const [selectedFact] = useState(() => Math.floor(Math.random() * GEO_FACTS.length));
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Cycle status every 2.5s
        const statusInterval = setInterval(() => {
            setStatusIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
        }, 2500);

        // Simulate smart progress: 0 to 95% over 15 seconds
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) return 95;
                // Slow down as we get closer to 100
                const increment = prev < 40 ? 4 : (prev < 80 ? 1 : 0.2);
                return prev + increment;
            });
        }, 400);

        return () => {
            clearInterval(statusInterval);
            clearInterval(progressInterval);
        };
    }, []);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '70vh',
            textAlign: 'center'
        }}>
            <div className="orb-container">
                <div className="orb-ring"></div>
                <div className="orb"></div>
                <div className="orb-inner"></div>
            </div>

            <div className="progress-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="loading-status">
                <span key={statusIndex} className="gradient-text">
                    {STATUS_MESSAGES[statusIndex].text}
                </span>
            </div>
            <div className="loading-subtext">
                {STATUS_MESSAGES[statusIndex].sub}
            </div>

            <div className="facts-box">
                <div className="fact-label">✨ GEO Insight: {GEO_FACTS[selectedFact].label}</div>
                <div className="fact-text">
                    "{GEO_FACTS[selectedFact].text}"
                </div>
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: '#30363d', letterSpacing: '2px' }}>
                DEEP AI SCAN IN PROGRESS
            </div>
        </div>
    );
}
