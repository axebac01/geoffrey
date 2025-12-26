import { PromptResult } from "../types";
import { detectCompetitorMentions } from "./competitorDetection";

/**
 * Counts brand mentions across all results
 * Uses aggregated results when available for more accurate counting
 */
export function countBrandMentions(results: PromptResult[]): number {
    let brandMentions = 0;
    
    for (const result of results) {
        const aggregated = result.aggregatedResult;
        if (aggregated) {
            // If mentioned in >= 50% of runs, count as mentioned
            if (aggregated.mentionRate >= 0.5) {
                brandMentions += 1;
            }
        } else {
            // Fallback to single judge result
            if (result.judgeResult.isMentioned) {
                brandMentions += 1;
            }
        }
    }
    
    return brandMentions;
}

/**
 * Counts competitor mentions across all results
 * Returns a map of competitor name -> mention count
 */
export function countCompetitorMentions(
    results: PromptResult[],
    competitors: string[],
    brandName: string
): Map<string, number> {
    const competitorCounts = new Map<string, number>();
    
    // Initialize all competitors to 0
    for (const competitor of competitors) {
        competitorCounts.set(competitor, 0);
    }
    
    // Count mentions across all results
    for (const result of results) {
        const detections = detectCompetitorMentions(
            result.responderAnswer,
            competitors,
            brandName
        );
        
        for (const detection of detections) {
            if (detection.mentioned) {
                const current = competitorCounts.get(detection.competitor) || 0;
                competitorCounts.set(detection.competitor, current + 1);
            }
        }
    }
    
    return competitorCounts;
}


