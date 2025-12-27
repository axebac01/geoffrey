import { useState, useEffect } from 'react';
import { Onboarding } from '../../components/Onboarding';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { Results } from '../../components/results/Results';
import type { EntitySnapshot, AnalysisResult, GeneratorOutput } from '../../types';
import { useAuth, useUser } from '@clerk/clerk-react';
import { supabase } from '../../lib/supabase';
import { getApiUrl } from '../../lib/api';

export function NewScanPage() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [step, setStep] = useState<'input' | 'analyzing' | 'results' | 'auto-starting'>('auto-starting');
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [snapshot, setSnapshot] = useState<EntitySnapshot | null>(null);
    const [assets, setAssets] = useState<GeneratorOutput | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Auto-start scan with prompts from database
    useEffect(() => {
        async function autoStartScan() {
            try {
                const token = await getToken();
                if (!token) {
                    setStep('input');
                    return;
                }

                // 1. Fetch prompts from database
                let promptsToUse: string[] = [];
                const promptsRes = await fetch(getApiUrl('/api/prompts'), {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (promptsRes.ok) {
                    const promptsData = await promptsRes.json();
                    promptsToUse = promptsData.prompts?.map((p: any) => p.prompt_text) || [];
                }

                // 2. Fallback to onboarding prompts if none in database
                if (promptsToUse.length === 0) {
                    const onboardingRes = await fetch(getApiUrl('/api/onboarding/scan-result'), {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (onboardingRes.ok) {
                        const onboardingData = await onboardingRes.json();
                        promptsToUse = onboardingData.scanResult?.scan_data?.prompts || [];
                    }
                }

                // 3. Fetch business/snapshot data
                let businessSnapshot: EntitySnapshot | null = null;
                const profileRes = await fetch(getApiUrl('/api/user/profile'), {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    if (profileData.profile) {
                        businessSnapshot = {
                            businessName: profileData.profile.business_name,
                            industry: profileData.profile.industry,
                            region: profileData.profile.region,
                            website: profileData.profile.website,
                            description: profileData.profile.description || '',
                            descriptionSpecs: [],
                            logoUrl: profileData.profile.logo_url,
                            companyDescription: undefined
                        };
                    }
                }

                // 4. Fallback to onboarding snapshot if no business data
                if (!businessSnapshot) {
                    const onboardingRes = await fetch(getApiUrl('/api/onboarding/scan-result'), {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (onboardingRes.ok) {
                        const onboardingData = await onboardingRes.json();
                        const onboardingSnapshot = onboardingData.scanResult?.scan_data?.snapshot;
                        if (onboardingSnapshot) {
                            businessSnapshot = onboardingSnapshot;
                        }
                    }
                }

                // 5. Fetch competitors
                let competitorsToUse: string[] = [];
                const onboardingRes = await fetch('/api/onboarding/scan-result', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (onboardingRes.ok) {
                    const onboardingData = await onboardingRes.json();
                    const competitors = onboardingData.scanResult?.scan_data?.competitors || [];
                    competitorsToUse = competitors.map((c: any) => typeof c === 'string' ? c : c.name);
                }

                // 6. If we have prompts and snapshot, start scan automatically
                if (promptsToUse.length > 0 && businessSnapshot) {
                    await handleAnalyze(businessSnapshot, promptsToUse, competitorsToUse);
                } else {
                    // Not enough data, show input form
                    setStep('input');
                }
            } catch (error) {
                console.error('Failed to auto-start scan:', error);
                setStep('input');
            }
        }

        if (step === 'auto-starting') {
            autoStartScan();
        }
    }, [step, getToken]);

    const handleAnalyze = async (data: EntitySnapshot, prompts: string[], competitors: string[] = []) => {
        setSnapshot(data);
        setStep('analyzing');

        try {
            const token = await getToken();
            const res = await fetch(getApiUrl('/api/analyze'), {
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
            const res = await fetch(getApiUrl('/api/generate'), {
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
            {step === 'auto-starting' && (
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    minHeight: '50vh',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid rgba(48, 54, 61, 0.5)',
                        borderTopColor: '#58a6ff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                    }} />
                    <style>{`
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                    <p style={{ color: '#8b949e' }}>Preparing your scan...</p>
                </div>
            )}
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
