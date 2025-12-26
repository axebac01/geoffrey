import { useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from "@clerk/clerk-react";
import SignInPage from './pages/auth/SignInPage';
import SignUpPage from './pages/auth/SignUpPage';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { DashboardOverview } from './pages/dashboard/Overview';
import { NewScanPage } from './pages/dashboard/NewScan';
import { ImprovementsPage } from './pages/dashboard/Improvements';
import { PromptsPage } from './pages/dashboard/Prompts';
import { ProfilePage } from './pages/dashboard/Profile';
import { SettingsPage } from './pages/dashboard/Settings';
import { AITrafficPage } from './pages/dashboard/AITraffic';
// Onboarding flow pages
import { CompanyStep } from './pages/onboarding/CompanyStep';
import { ScanningStep } from './pages/onboarding/ScanningStep';
import { ReviewStep } from './pages/onboarding/ReviewStep';
import { OnboardingGuard } from './components/onboarding/OnboardingGuard';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken, isSignedIn } = useAuth();
  const hasCheckedOnboarding = useRef(false);

  // Redirect signed-in users from homepage to onboarding or dashboard
  useEffect(() => {
    async function handleSignedInUser() {
      // Only redirect on homepage, not on other routes
      if (location.pathname !== '/') return;
      if (!isSignedIn) return;
      if (hasCheckedOnboarding.current) return;
      hasCheckedOnboarding.current = true;
      
      try {
        const token = await getToken();
        const res = await fetch('/api/onboarding/next-step', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.isComplete) {
            navigate('/dashboard', { replace: true });
          } else {
            navigate(`/onboarding/${data.nextStep}`, { replace: true });
          }
        } else {
          // API failed, assume new user
          navigate('/onboarding/company', { replace: true });
        }
      } catch (error) {
        // Error checking, redirect to onboarding
        navigate('/onboarding/company', { replace: true });
      }
    }
    
    handleSignedInUser();
  }, [isSignedIn, getToken, navigate]);


  return (
    <Routes>
      <Route path="/" element={
        <>
          <SignedOut>
            <Navigate to="/sign-in" replace />
          </SignedOut>
          <SignedIn>
            {/* Redirect logic finns redan i useEffect */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              minHeight: '100vh',
              background: '#0d1117'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  border: '3px solid rgba(48, 54, 61, 0.5)',
                  borderTopColor: '#58a6ff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem'
                }} />
                <style>{`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
                <p style={{ color: '#8b949e' }}>Loading...</p>
              </div>
            </div>
          </SignedIn>
        </>
      } />

      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      {/* Onboarding Flow (Protected) */}
      <Route
        path="/onboarding/company"
        element={
          <>
            <SignedIn>
              <CompanyStep />
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        }
      />
      <Route
        path="/onboarding/scanning"
        element={
          <>
            <SignedIn>
              <ScanningStep />
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        }
      />
      <Route
        path="/onboarding/review"
        element={
          <>
            <SignedIn>
              <ReviewStep />
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        }
      />

      {/* Dashboard (Protected) */}
      <Route
        path="/dashboard"
        element={
          <>
            <SignedIn>
              <OnboardingGuard>
                <DashboardLayout />
              </OnboardingGuard>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        }
      >
        <Route index element={<DashboardOverview />} />
        <Route path="scan" element={<NewScanPage />} />
        <Route path="ai-traffic" element={<AITrafficPage />} />
        <Route path="prompts" element={<PromptsPage />} />
        <Route path="improve" element={<ImprovementsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/integrations" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
