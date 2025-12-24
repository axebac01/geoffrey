export function ImprovementsPage() {
    return (
        <div style={{ maxWidth: '800px' }}>
            <h1 style={{ marginBottom: '1rem' }}>⚡ Improvements</h1>
            <p style={{ color: '#8b949e', marginBottom: '2rem' }}>
                Based on your latest scan, here are the top actions to improve your AI visibility.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <ImprovementCard
                    title="Implement FAQ Schema"
                    desc="Help Search GPT and Gemini find structured answers to common customer questions."
                    icon="🏷️"
                    difficulty="Easy"
                />
                <ImprovementCard
                    title="Optimize About Snippet"
                    desc="Update your homepage meta description to include primary value propositions identified by Geoffrey."
                    icon="✍️"
                    difficulty="Medium"
                />
                <ImprovementCard
                    title="Natural Language Content"
                    desc="Rewrite your service descriptions to match the conversational intent clusters we found."
                    icon="🤖"
                    difficulty="Hard"
                />
            </div>
        </div>
    );
}

function ImprovementCard({ title, desc, icon, difficulty }: { title: string; desc: string; icon: string; difficulty: string }) {
    const color = difficulty === 'Easy' ? '#3fb950' : (difficulty === 'Medium' ? '#d29922' : '#f85149');

    return (
        <div className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem' }}>{icon}</div>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0 }}>{title}</h3>
                    <span style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        border: `1px solid ${color}`,
                        color: color
                    }}>{difficulty}</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#8b949e', margin: 0 }}>{desc}</p>
                <button className="btn-secondary" style={{ marginTop: '1rem', padding: '0.4rem 1rem', fontSize: '0.85rem' }}>View Assets</button>
            </div>
        </div>
    );
}
