import React, { useState } from 'react';
import type { EntitySnapshot } from '../types';
import { ScanningLoadingScreen } from './ScanningLoadingScreen';
import { ProfileReview } from './ProfileReview';
import { PromptsReview } from './PromptsReview';
import { CompetitorsReview } from './CompetitorsReview';

interface OnboardingProps {
    onComplete: (snapshot: EntitySnapshot, prompts: string[], competitors: string[]) => void;
    isLoading: boolean;
}

export function Onboarding({ onComplete, isLoading }: OnboardingProps) {
    const [view, setView] = useState<'landing' | 'scanning' | 'profile' | 'prompts' | 'competitors'>('landing');

    const [snapshot, setSnapshot] = useState<EntitySnapshot>({
        businessName: '',
        industry: '',
        region: '',
        website: '',
        descriptionSpecs: []
    });

    const [prompts, setPrompts] = useState<string[]>([]);
    const [competitors, setCompetitors] = useState<string[]>([]);
    const [scanUrl, setScanUrl] = useState('');

    const handleScan = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!scanUrl) {
            alert("Please enter a URL first");
            return;
        }
        setView('scanning');
        try {
            const res = await fetch('/api/scan-website', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: scanUrl })
            });
            if (!res.ok) throw new Error("Scan failed");

            const data = await res.json();
            setSnapshot({
                ...data.snapshot,
                website: scanUrl
            });
            setPrompts(data.suggestedPrompts || []);
            setCompetitors(data.suggestedCompetitors || []);

            // Move to profile review
            setView('profile');

        } catch (e: any) {
            alert("Failed to scan: " + e.message + "\nPlease try entering details manually.");
            setView('landing');
        }
    };

    const handleAnalyze = () => {
        onComplete(snapshot, prompts, competitors);
    };

    // --- VIEW 1: LANDING ---
    if (view === 'landing') {
        return (
            <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(90deg, #58a6ff, #8b949e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Optimized AI Visibility.
                </h1>
                <p style={{ fontSize: '1.2rem', color: '#8b949e', marginBottom: '2rem' }}>
                    Enter your website to instantly audit your brand's presence on ChatGPT and Gemini.
                </p>

                <form onSubmit={handleScan} className="card" style={{ padding: '2rem', display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            value={scanUrl}
                            onChange={e => setScanUrl(e.target.value)}
                            placeholder="example.com"
                            style={{
                                fontSize: '1.2rem',
                                padding: '1rem',
                                marginBottom: '1rem',
                                width: '100%',
                                border: '2px solid #30363d'
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn-primary"
                        style={{ fontSize: '1.2rem', padding: '1rem' }}
                    >
                        Analyze My Brand
                    </button>
                </form>
            </div>
        );
    }

    // --- VIEW 2: SCANNING ---
    if (view === 'scanning') {
        return <ScanningLoadingScreen />;
    }

    // --- VIEW 3: PROFILE REVIEW ---
    if (view === 'profile') {
        return (
            <ProfileReview
                snapshot={snapshot}
                onEdit={setSnapshot}
                onContinue={() => setView('prompts')}
                onBack={() => setView('landing')}
            />
        );
    }

    // --- VIEW 4: PROMPTS REVIEW ---
    if (view === 'prompts') {
        return (
            <PromptsReview
                prompts={prompts}
                onUpdate={setPrompts}
                onContinue={() => setView('competitors')}
                onBack={() => setView('profile')}
            />
        );
    }

    // --- VIEW 5: COMPETITORS REVIEW ---
    if (view === 'competitors') {
        return (
            <CompetitorsReview
                competitors={competitors}
                onUpdate={setCompetitors}
                onContinue={handleAnalyze}
                onBack={() => setView('prompts')}
            />
        );
    }

    return null;
}
