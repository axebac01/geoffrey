import { useState, useEffect } from 'react';

const SCAN_STATUS_MESSAGES = [
    { text: "Fetching website content...", sub: "Analyzing page structure and metadata" },
    { text: "Extracting business intelligence...", sub: "Identifying value propositions and audience signals" },
    { text: "Analyzing market positioning...", sub: "Mapping competitive advantages and niche" },
    { text: "Mapping user intent patterns...", sub: "Understanding customer search behaviors" },
    { text: "Generating strategic prompts...", sub: "Creating hyper-specific discovery queries" },
    { text: "Finalizing analysis...", sub: "Preparing your visibility audit" }
];

const SCAN_FACTS = [
    { label: "Deep Analysis", text: "Geoffrey analyzes over 15 data points from your website to create persona-specific prompts." },
    { label: "Intent Mapping", text: "We identify exactly what your ideal customers are asking AI chatbots." },
    { label: "Niche Precision", text: "Generic prompts miss 80% of real opportunities. Our AI finds your unique positioning." },
    { label: "Multi-Model", text: "Your prompts will be tested against both ChatGPT and Gemini for complete coverage." }
];

export function ScanningLoadingScreen() {
    const [statusIndex, setStatusIndex] = useState(0);
    const [selectedFact] = useState(() => Math.floor(Math.random() * SCAN_FACTS.length));
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Cycle status every 3s
        const statusInterval = setInterval(() => {
            setStatusIndex((prev) => {
                const next = (prev + 1) % SCAN_STATUS_MESSAGES.length;
                return next;
            });
        }, 3000);

        // Simulate smart progress: 0 to 95% over ~18 seconds
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) return 95;
                const increment = prev < 40 ? 3 : (prev < 75 ? 1.5 : 0.3);
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
                    {SCAN_STATUS_MESSAGES[statusIndex].text}
                </span>
            </div>
            <div className="loading-subtext">
                {SCAN_STATUS_MESSAGES[statusIndex].sub}
            </div>

            <div className="facts-box">
                <div className="fact-label">🔬 Intelligence Layer: {SCAN_FACTS[selectedFact].label}</div>
                <div className="fact-text">
                    "{SCAN_FACTS[selectedFact].text}"
                </div>
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: '#30363d', letterSpacing: '2px' }}>
                DEEP WEBSITE AUDIT IN PROGRESS
            </div>
        </div>
    );
}
