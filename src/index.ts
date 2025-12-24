import { runResponder } from "./responder";
import { runJudge } from "./judge";
import { EntitySnapshot, AnalysisResult, PromptResult } from "./types";

export async function analyzeVisibility(
    snapshot: EntitySnapshot,
    prompts: string[]
): Promise<AnalysisResult> {
    const results: PromptResult[] = [];
    const providers: ("openai" | "gemini")[] = ["openai"];
    if (process.env.GEMINI_API_KEY) {
        providers.push("gemini");
    }

    // Run sequentially for now to avoid rate limits or confusion, but could be parallel.
    // Generate all Tasks (Prompt + Provider)
    const tasks: Array<{ prompt: string; provider: "openai" | "gemini" }> = [];
    for (const prompt of prompts) {
        for (const provider of providers) {
            tasks.push({ prompt, provider });
        }
    }

    console.log(`[Analysis] Processing ${tasks.length} checks in parallel batches...`);

    // Helper for concurrency control
    const batchSize = 12; // Increased from 5 for 3x speed
    const processTask = async (task: { prompt: string; provider: "openai" | "gemini" }) => {
        try {
            console.log(`Running: "${task.prompt.slice(0, 30)}..." [${task.provider}]`);
            const responderAnswer = await runResponder(task.prompt, task.provider);
            const judgeResult = await runJudge(responderAnswer, snapshot);
            return {
                model: task.provider,
                promptText: task.prompt,
                responderAnswer,
                judgeResult,
            } as PromptResult;
        } catch (err: any) {
            console.error(`[Analysis] Task failed: "${task.prompt.slice(0, 20)}..." [${task.provider}] -> Error: ${err.message}`);
            return null;
        }
    };

    // Execute in batches
    for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processTask));
        batchResults.forEach(r => {
            if (r) results.push(r);
        });
    }

    // Scoring Logic (simplified MVP version)
    // Max 100.
    // Base logic:
    // - Mentioned: +10
    // - Rank 1-3: +6
    // - Industry Match: +2
    // - Location Match: +2
    // Total potential per prompt: 20

    // NOTE: If we run 2 models, we have 2x the results. 
    // Should we average the score? Or sum it up? 
    // Let's normalize by the TOTAL number of successful checks run.

    let totalScore = 0;
    const maxScorePerCheck = 20;

    // Use results.length to determine max score (handles skipped/failed providers)
    const maxTotalScore = results.length * maxScorePerCheck;

    let mentions = 0;

    for (const res of results) {
        const j = res.judgeResult;
        let promptScore = 0;

        if (j.isMentioned) {
            mentions++;
            promptScore += 10;
            if (j.rankPosition && j.rankPosition <= 3) {
                promptScore += 6;
            }
        }
        if (j.industryMatch) promptScore += 2;
        if (j.locationMatch) promptScore += 2;

        totalScore += promptScore;
    }

    // Normalize to 0-100 scale for simplicity in this MVP function
    const finalScore = maxTotalScore > 0 ? Math.round((totalScore / maxTotalScore) * 100) : 0;
    const coverage = `${mentions}/${results.length}`; // e.g. "4/10" if 5 prompts * 2 models

    return {
        snapshot,
        results,
        overallScore: finalScore,
        coverageFraction: coverage,
    };
}
