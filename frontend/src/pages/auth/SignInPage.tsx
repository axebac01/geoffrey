import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, rgba(88, 166, 255, 0.05) 0%, rgba(188, 140, 242, 0.05) 100%)'
        }}>
            <SignIn routing="path" path="/sign-in" />
        </div>
    );
}
