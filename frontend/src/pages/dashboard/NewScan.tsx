import { useState } from 'react';
import { Onboarding } from '../../components/Onboarding';
import { LoadingScreen } from '../../components/LoadingScreen';
import { Results } from '../../components/Results';
import type { EntitySnapshot, AnalysisResult, GeneratorOutput } from '../../types';
import { useAuth, useUser } from '@clerk/clerk-react';
import { supabase } from '../../lib/supabase';

export function NewScanPage() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [step, setStep] = useState<'input' | 'analyzing' | 'results'>('input');
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [snapshot, setSnapshot] = useState<EntitySnapshot | null>(null);
    const [assets, setAssets] = useState<GeneratorOutput | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleAnalyze = async (data: EntitySnapshot, prompts: string[], competitors: string[] = []) => {
        setSnapshot(data);
        setStep('analyzing');

        try {
            const token = await getToken();
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ snapshot: data, prompts, competitors })
            });

            if (!res.ok) throw new Error("Analysis failed");

            const result: AnalysisResult = await res.json();

            // SAVE TO SUPABASE
            if (user) {
                await saveToSupabase(data, result, user.id);
            }

            setAnalysis(result);
            setStep('results');
        } catch (err) {
            console.error(err);
            alert("Analysis failed. Please try again.");
            setStep('input');
        }
    };

    const saveToSupabase = async (snap: EntitySnapshot, res: AnalysisResult, clerkUserId: string) => {
        try {
            // 1. Get current business or create one
            const { data: business, error: bError } = await supabase
                .from('businesses')
                .upsert({
                    website: snap.website,
                    business_name: snap.businessName,
                    industry: snap.industry,
                    region: snap.region,
                    logo_url: snap.logoUrl,
                    description: snap.description,
                    user_id: clerkUserId
                }, { onConflict: 'website' })
                .select()
                .single();

            if (bError) throw bError;

            // 2. Save scan
            const { error: sError } = await supabase
                .from('scans')
                .insert({
                    business_id: business.id,
                    overall_score: res.overallScore,
                    coverage_fraction: res.coverageFraction,
                    results: JSON.stringify(res),
                    user_id: clerkUserId
                });

            if (sError) throw sError;
            console.log("✅ Scan saved to Supabase");
        } catch (err: any) {
            console.error("Supabase Save Error:", err);
            alert("Kunde inte spara resultatet till databasen: " + err.message);
        }
    };

    const handleGenerate = async () => {
        if (!snapshot) return;
        setIsGenerating(true);
        try {
            const token = await getToken();
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ snapshot })
            });

            const result: GeneratorOutput = await res.json();
            setAssets(result);
        } catch (err) {
            alert("Generation failed");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div>
            {step === 'input' && <Onboarding onComplete={handleAnalyze} isLoading={false} />}
            {step === 'analyzing' && <LoadingScreen />}
            {step === 'results' && analysis && (
                <Results
                    analysis={analysis}
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                    assets={assets}
                    reset={() => setStep('input')}
                />
            )}
        </div>
    );
}
