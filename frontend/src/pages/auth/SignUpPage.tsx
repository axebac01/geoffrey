import { SignUp } from "@clerk/clerk-react";
import { AuthLayout } from "../../components/layouts/AuthLayout";

export default function SignUpPage() {
    return (
        <AuthLayout
            title="Create your account"
            subtitle="Start optimizing your AI visibility today"
        >
            <SignUp 
                routing="path" 
                path="/sign-up"
                afterSignUpUrl="/onboarding/company"
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
