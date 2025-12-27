import { SignIn, useAuth } from "@clerk/clerk-react";
import { getApiUrl } from '../../lib/api';
import { AuthLayout } from "../../components/layouts/AuthLayout";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SignInPage() {
    const { isSignedIn, getToken } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        async function redirectAfterSignIn() {
            if (!isSignedIn) return;

            try {
                const token = await getToken();
                const res = await fetch(getApiUrl('/api/onboarding/next-step'), {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.isComplete) {
                        navigate('/dashboard');
                    } else {
                        navigate(`/onboarding/${data.nextStep}`);
                    }
                }
            } catch (error) {
                console.error('Failed to check onboarding:', error);
                navigate('/dashboard'); // Fallback
            }
        }

        redirectAfterSignIn();
    }, [isSignedIn, getToken, navigate]);

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Sign in to your account to continue"
        >
            <SignIn 
                routing="path" 
                path="/sign-in"
                appearance={{
                    elements: {
                        rootBox: {
                            width: '100%'
                        },
                        card: {
                            background: 'transparent',
                            boxShadow: 'none',
                            border: 'none'
                        },
                        headerTitle: {
                            display: 'none'
                        },
                        headerSubtitle: {
                            display: 'none'
                        },
                        socialButtonsBlockButton: {
                            background: 'rgba(48, 54, 61, 0.5)',
                            border: '1px solid #30363d',
                            color: '#c9d1d9',
                            '&:hover': {
                                background: 'rgba(48, 54, 61, 0.8)'
                            }
                        },
                        formFieldInput: {
                            background: 'rgba(13, 17, 23, 0.8)',
                            border: '1px solid #30363d',
                            color: '#c9d1d9',
                            '&:focus': {
                                borderColor: '#58a6ff'
                            }
                        },
                        formButtonPrimary: {
                            background: 'linear-gradient(90deg, #58a6ff, #bc8cf2)',
                            '&:hover': {
                                background: 'linear-gradient(90deg, #4a90e2, #a87de0)'
                            }
                        },
                        footerActionLink: {
                            color: '#58a6ff'
                        },
                        identityPreviewEditButton: {
                            color: '#58a6ff'
                        }
                    }
                }}
            />
        </AuthLayout>
    );
}
