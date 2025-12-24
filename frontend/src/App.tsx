import { useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, UserButton } from "@clerk/clerk-react";
import { Onboarding } from './components/Onboarding';
import { Results } from './components/Results';
import { LoadingScreen } from './components/LoadingScreen';
import SignInPage from './pages/auth/SignInPage';
import SignUpPage from './pages/auth/SignUpPage';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { DashboardOverview } from './pages/dashboard/Overview';
import { NewScanPage } from './pages/dashboard/NewScan';
import { ImprovementsPage } from './pages/dashboard/Improvements';
import { ProfilePage } from './pages/dashboard/Profile';
import type { EntitySnapshot, AnalysisResult, GeneratorOutput } from './types';

type Step = 'onboarding' | 'analyzing' | 'results';

function App() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('onboarding');
  const [snapshot, setSnapshot] = useState<EntitySnapshot | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [assets, setAssets] = useState<GeneratorOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Phase 1: Analyze Visibility (Public version)
  const handleAnalyze = async (data: EntitySnapshot, prompts: string[]) => {
    setSnapshot(data);
    setStep('analyzing');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: data, prompts })
      });

      if (!res.ok) {
        if (res.status === 401) {
          navigate('/sign-in');
          return;
        }
        throw new Error("Analysis failed");
      }

      const result: AnalysisResult = await res.json();
      setAnalysis(result);
      setStep('results');
    } catch (err) {
      console.error(err);
      alert("Analysis failed. Public scans are limited. Sign in for full access.");
      setStep('onboarding');
    }
  };

  // Phase 2: Generate Assets
  const handleGenerate = async () => {
    if (!snapshot) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <Routes>
      <Route path="/" element={
        <div className="container">
          <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            padding: '1rem 0'
          }}>
            <div>
              <h1 style={{ fontSize: '2rem', marginBottom: '0.2rem', cursor: 'pointer' }} onClick={() => navigate('/')}>
                Geoffrey.ai
              </h1>
              <p style={{ color: '#8b949e', fontSize: '0.9rem' }}>GEO & AI Visibility Optimization</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <SignedIn>
                <button className="btn-secondary" onClick={() => navigate('/dashboard')} style={{ padding: '0.5rem 1rem' }}>
                  Dashboard
                </button>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
              <SignedOut>
                <button className="btn-secondary" onClick={() => navigate('/sign-in')} style={{ padding: '0.5rem 1rem' }}>
                  Sign In
                </button>
              </SignedOut>
            </div>
          </header>

          {step === 'analyzing' && <LoadingScreen />}
          {step === 'onboarding' && <Onboarding onComplete={handleAnalyze} isLoading={false} />}
          {step === 'results' && analysis && (
            <Results
              analysis={analysis}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              assets={assets}
              reset={() => {
                setStep('onboarding');
                setAnalysis(null);
                setAssets(null);
              }}
            />
          )}
        </div>
      } />

      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      {/* Dashboard (Protected) */}
      <Route
        path="/dashboard"
        element={
          <>
            <SignedIn>
              <DashboardLayout />
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        }
      >
        <Route index element={<DashboardOverview />} />
        <Route path="scan" element={<NewScanPage />} />
        <Route path="improve" element={<ImprovementsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
