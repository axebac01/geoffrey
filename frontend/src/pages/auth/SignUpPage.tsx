import { SignUp } from "@clerk/clerk-react";

export default function SignUpPage() {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, rgba(88, 166, 255, 0.05) 0%, rgba(188, 140, 242, 0.05) 100%)'
        }}>
            <SignUp routing="path" path="/sign-up" />
        </div>
    );
}
