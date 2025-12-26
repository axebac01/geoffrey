import { JudgeOutput, AggregatedJudgeResult } from "../types";

/**
 * Aggregates multiple judge results into a single aggregated result with confidence intervals
 */
export function aggregateJudgeResults(judgeResults: JudgeOutput[]): AggregatedJudgeResult {
    if (judgeResults.length === 0) {
        throw new Error("Cannot aggregate empty results");
    }

    const totalRuns = judgeResults.length;
    const mentionedCount = judgeResults.filter(r => r.isMentioned).length;
    const mentionRate = mentionedCount / totalRuns;

    // Calculate average rank position (only for runs where brand was mentioned)
    const ranks = judgeResults
        .filter(r => r.isMentioned && r.rankPosition !== null && r.rankPosition !== undefined)
        .map(r => r.rankPosition!);
    const averageRankPosition = ranks.length > 0 
        ? ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length 
        : null;

    // Calculate match rates
    const industryMatchCount = judgeResults.filter(r => r.industryMatch).length;
    const locationMatchCount = judgeResults.filter(r => r.locationMatch).length;
    const industryMatchRate = industryMatchCount / totalRuns;
    const locationMatchRate = locationMatchCount / totalRuns;

    // Calculate sentiment distribution
    const sentimentCounts = judgeResults.reduce((acc, r) => {
        const sentiment = r.sentiment || "neutral";
        acc[sentiment] = (acc[sentiment] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const sentimentDistribution = {
        positive: (sentimentCounts.positive || 0) / totalRuns,
        neutral: (sentimentCounts.neutral || 0) / totalRuns,
        negative: (sentimentCounts.negative || 0) / totalRuns,
    };

    // Calculate 95% confidence interval for mention rate using Wilson score interval
    // This is more accurate for small sample sizes than normal approximation
    const z = 1.96; // z-score for 95% confidence
    const n = totalRuns;
    const p = mentionRate;
    const denominator = 1 + (z * z) / n;
    const center = (p + (z * z) / (2 * n)) / denominator;
    const margin = (z / denominator) * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));

    const confidenceInterval = {
        lower: Math.max(0, center - margin),
        upper: Math.min(1, center + margin),
    };

    return {
        mentionRate,
        averageRankPosition,
        industryMatchRate,
        locationMatchRate,
        sentimentDistribution,
        confidenceInterval,
        runCount: totalRuns,
        totalRuns: totalRuns,
    };
}


