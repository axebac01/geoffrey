import { runResponder } from "./responder";
import { runJudge } from "./judge";
import { EntitySnapshot, AnalysisResult, PromptResult, AggregatedJudgeResult, JudgeOutput, CompetitorMention, ShareOfVoice } from "./types";
import { logger } from "./logger";

// Configuration for multiple runs
const RUNS_PER_PROMPT = 3; // Number of times to run each prompt (3-5 recommended)
const CONFIDENCE_LEVEL = 0.95; // 95% confidence interval

/**
 * Aggregates multiple judge results into a single aggregated result with confidence intervals
 */
function aggregateJudgeResults(judgeResults: JudgeOutput[]): AggregatedJudgeResult {
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

/**
 * Detects competitor mentions in AI response text
 * Improved version with better name matching and rank detection
 */
function detectCompetitorMentions(
    answerText: string,
    competitors: string[],
    brandName: string
): Array<{ competitor: string; mentioned: boolean; rankPosition?: number }> {
    const results: Array<{ competitor: string; mentioned: boolean; rankPosition?: number }> = [];
    const lowerAnswer = answerText.toLowerCase();
    const lowerBrandName = brandName.toLowerCase();

    // Normalize competitor names (remove common suffixes for better matching)
    const normalizeName = (name: string): string => {
        return name.toLowerCase()
            .replace(/\s+(inc|llc|ltd|ab|corp|corporation|company|co)\.?$/i, '')
            .trim();
    };

    // Extract potential list items (numbered or bulleted)
    const listPattern = /(?:^|\n)(?:\d+\.|\-|\*|\•)\s*([^\n]+)/gim;
    const listItems: string[] = [];
    let match;
    while ((match = listPattern.exec(answerText)) !== null) {
        listItems.push(match[1].trim());
    }

    for (const competitor of competitors) {
        const normalizedCompetitor = normalizeName(competitor);
        const lowerCompetitor = competitor.toLowerCase();
        let mentioned = false;
        let rankPosition: number | undefined = undefined;

        // Multiple matching strategies for better detection
        // Strategy 1: Exact match (case-insensitive)
        const exactMatch = lowerAnswer.includes(lowerCompetitor);
        
        // Strategy 2: Normalized match (without company suffixes)
        const normalizedMatch = lowerAnswer.includes(normalizedCompetitor);
        
        // Strategy 3: Word boundary match (avoid partial matches)
        const wordBoundaryPattern = new RegExp(`\\b${lowerCompetitor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        const wordBoundaryMatch = wordBoundaryPattern.test(answerText);

        mentioned = exactMatch || normalizedMatch || wordBoundaryMatch;

        if (mentioned) {
            // Try to find rank position in list items
            for (let i = 0; i < listItems.length; i++) {
                const listItemLower = listItems[i].toLowerCase();
                if (listItemLower.includes(lowerCompetitor) || 
                    listItemLower.includes(normalizedCompetitor)) {
                    rankPosition = i + 1; // 1-based ranking
                    break;
                }
            }

            // If not in explicit list, try to infer from position relative to brand
            if (!rankPosition) {
                const competitorIndex = Math.min(
                    lowerAnswer.indexOf(lowerCompetitor),
                    lowerAnswer.indexOf(normalizedCompetitor) !== -1 
                        ? lowerAnswer.indexOf(normalizedCompetitor) 
                        : Infinity
                );
                const brandIndex = lowerAnswer.indexOf(lowerBrandName);
                
                if (competitorIndex !== -1 && brandIndex !== -1) {
                    // If competitor appears before brand, it might be ranked higher
                    // But we can't determine exact rank without explicit list
                    // So we leave rankPosition as undefined
                }
            }
        }

        results.push({ competitor, mentioned, rankPosition });
    }

    return results;
}

/**
 * Counts brand mentions across all results
 * Uses aggregated results when available for more accurate counting
 */
function countBrandMentions(results: PromptResult[]): number {
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
function countCompetitorMentions(
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

export async function analyzeVisibility(
    snapshot: EntitySnapshot,
    prompts: string[],
    competitors: string[] = []
): Promise<AnalysisResult> {
    const results: PromptResult[] = [];
    const providers: ("openai" | "gemini")[] = ["openai"];
    if (process.env.GEMINI_API_KEY) {
        providers.push("gemini");
    }

    const startTime = Date.now();
    logger.logAnalysisStart(snapshot, prompts.length, RUNS_PER_PROMPT);

    // Generate all Tasks (Prompt + Provider + Run)
    const tasks: Array<{ prompt: string; provider: "openai" | "gemini"; runNumber: number }> = [];
    for (const prompt of prompts) {
        for (const provider of providers) {
            for (let run = 1; run <= RUNS_PER_PROMPT; run++) {
                tasks.push({ prompt, provider, runNumber: run });
            }
        }
    }

    // Helper for processing a single task with retry logic
    const processTask = async (task: { prompt: string; provider: "openai" | "gemini"; runNumber: number }) => {
        const maxRetries = 2;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const responderAnswer = await runResponder(task.prompt, task.provider);
                const judgeResult = await runJudge(responderAnswer, snapshot);
                return {
                    model: task.provider,
                    promptText: task.prompt,
                    responderAnswer,
                    judgeResult,
                } as PromptResult;
            } catch (err: any) {
                lastError = err;
                logger.warn('Analysis task failed', {
                    prompt: task.prompt.slice(0, 50),
                    provider: task.provider,
                    runNumber: task.runNumber,
                    attempt,
                    maxRetries,
                }, err);
                
                // Retry on transient errors
                if (attempt < maxRetries && (
                    err.message?.includes('rate limit') ||
                    err.message?.includes('timeout') ||
                    err.code === 'ECONNRESET' ||
                    err.status === 429
                )) {
                    const backoffDelay = 1000 * attempt;
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                    continue;
                }
                
                // If last attempt or non-retryable error, return null
                if (attempt === maxRetries) {
                    return null;
                }
            }
        }
        return null;
    };

    // Execute in batches to avoid overwhelming APIs
    const batchSize = 6; // Reduced to account for multiple runs
    const allTaskResults: (PromptResult | null)[] = [];
    
    for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processTask));
        allTaskResults.push(...batchResults);
    }

    // Group results by prompt and provider, then aggregate
    const groupedResults = new Map<string, PromptResult[]>();
    
    for (const result of allTaskResults) {
        if (!result) continue; // Skip failed runs
        
        const key = `${result.promptText}::${result.model}`;
        if (!groupedResults.has(key)) {
            groupedResults.set(key, []);
        }
        groupedResults.get(key)!.push(result);
    }

    // Aggregate results for each prompt+provider combination
    for (const [key, promptResults] of groupedResults.entries()) {
        if (promptResults.length === 0) continue;

        // Extract all judge results for this prompt+provider
        const judgeResults = promptResults.map(r => r.judgeResult);
        
        // Aggregate the judge results
        const aggregatedResult = aggregateJudgeResults(judgeResults);

        // Use the first result as the representative (for responderAnswer display)
        const representativeResult = promptResults[0];
        representativeResult.aggregatedResult = aggregatedResult;

        results.push(representativeResult);
    }

    // Scoring Logic (updated to use aggregated results)
    // Max 100.
    // Base logic (using aggregated rates):
    // - Mention Rate: up to 50 points (mentionRate * 50)
    // - Rank Bonus: up to 20 points (if avg rank <= 3, bonus based on position)
    // - Industry Match: up to 15 points (industryMatchRate * 15)
    // - Location Match: up to 15 points (locationMatchRate * 15)

    let totalScore = 0;
    const maxScorePerCheck = 100; // Now using 0-100 scale per check
    let totalMentions = 0;
    let totalChecks = 0;

    for (const res of results) {
        totalChecks++;
        
        // Use aggregated result if available, otherwise fall back to single judge result
        const aggregated = res.aggregatedResult;
        let promptScore = 0;

        if (aggregated) {
            // Mention rate score (0-50 points)
            promptScore += aggregated.mentionRate * 50;
            
            // Rank bonus (0-20 points) - only if mentioned in majority of runs
            if (aggregated.mentionRate >= 0.5 && aggregated.averageRankPosition !== null) {
                const avgRank = aggregated.averageRankPosition;
                if (avgRank <= 3) {
                    // Top 3 gets bonus: rank 1 = 20pts, rank 2 = 15pts, rank 3 = 10pts
                    promptScore += Math.max(0, 25 - (avgRank * 5));
                }
            }
            
            // Industry match (0-15 points)
            promptScore += aggregated.industryMatchRate * 15;
            
            // Location match (0-15 points)
            promptScore += aggregated.locationMatchRate * 15;
            
            // Count mentions (using threshold: mentioned in >= 50% of runs)
            if (aggregated.mentionRate >= 0.5) {
                totalMentions++;
            }
        } else {
            // Fallback to single judge result (for backward compatibility)
            const j = res.judgeResult;
            if (j.isMentioned) {
                totalMentions++;
                promptScore += 50; // Full mention score
                if (j.rankPosition && j.rankPosition <= 3) {
                    promptScore += Math.max(0, 25 - (j.rankPosition * 5));
                }
            }
            if (j.industryMatch) promptScore += 15;
            if (j.locationMatch) promptScore += 15;
        }

        totalScore += promptScore;
    }

    // Normalize to 0-100 scale
    const finalScore = totalChecks > 0 
        ? Math.round((totalScore / (totalChecks * maxScorePerCheck)) * 100) 
        : 0;
    
    const coverage = `${totalMentions}/${totalChecks}`;

    // Calculate overall confidence interval (average of all prompt confidence intervals)
    let avgConfidenceLower = 0;
    let avgConfidenceUpper = 0;
    let confidenceCount = 0;
    
    for (const res of results) {
        if (res.aggregatedResult) {
            avgConfidenceLower += res.aggregatedResult.confidenceInterval.lower;
            avgConfidenceUpper += res.aggregatedResult.confidenceInterval.upper;
            confidenceCount++;
        }
    }

    const confidenceInterval = confidenceCount > 0 ? {
        lower: Math.round((avgConfidenceLower / confidenceCount) * 100),
        upper: Math.round((avgConfidenceUpper / confidenceCount) * 100),
    } : undefined;

    // Calculate Share of Voice (SoV) if competitors are provided
    let shareOfVoice: ShareOfVoice | undefined = undefined;
    if (competitors.length > 0 && results.length > 0) {
        // Count brand mentions
        const brandMentions = countBrandMentions(results);
        
        // Count competitor mentions
        const competitorMentions = countCompetitorMentions(results, competitors, snapshot.businessName);
        
        // Calculate total competitor mentions
        const totalCompetitorMentions = Array.from(competitorMentions.values())
            .reduce((sum, count) => sum + count, 0);
        
        // Calculate total mentions
        const totalMentions = brandMentions + totalCompetitorMentions;
        
        // Calculate SoV percentage
        const sovPercentage = totalMentions > 0 
            ? (brandMentions / totalMentions) * 100 
            : 0;
        
        // Calculate brand mention rate (percentage of prompts where brand was mentioned)
        const brandMentionRate = results.length > 0 ? brandMentions / results.length : 0;
        
        // Build competitor mentions array with detailed data
        const competitorMentionsArray: CompetitorMention[] = Array.from(competitorMentions.entries())
            .map(([competitorName, mentionCount]) => {
                const mentionRate = results.length > 0 ? mentionCount / results.length : 0;
                
                // Calculate average rank position for this competitor
                let totalRank = 0;
                let rankCount = 0;
                for (const result of results) {
                    const detections = detectCompetitorMentions(
                        result.responderAnswer,
                        [competitorName],
                        snapshot.businessName
                    );
                    const detection = detections.find(d => d.competitor === competitorName);
                    if (detection?.mentioned && detection.rankPosition) {
                        totalRank += detection.rankPosition;
                        rankCount++;
                    }
                }
                const averageRankPosition = rankCount > 0 ? totalRank / rankCount : null;
                
                return {
                    competitorName,
                    isMentioned: mentionCount > 0,
                    mentionCount,
                    averageRankPosition,
                    mentionRate,
                };
            });
        
        // Get top 5 competitors by mention rate
        const topCompetitors = competitorMentionsArray
            .sort((a, b) => b.mentionRate - a.mentionRate)
            .slice(0, 5);
        
        shareOfVoice = {
            brandMentionRate,
            competitorMentions: competitorMentionsArray,
            totalMentions,
            brandShare: sovPercentage,
            topCompetitors,
        };
        
        logger.info('Share of Voice calculated', {
            brandMentions,
            totalCompetitorMentions,
            totalMentions,
            sovPercentage: `${sovPercentage.toFixed(1)}%`,
            brandMentionRate: `${(brandMentionRate * 100).toFixed(1)}%`,
            competitorsAnalyzed: competitors.length,
        });
    }

    const duration = Date.now() - startTime;
    logger.logAnalysisComplete(snapshot, finalScore, duration);

    return {
        snapshot,
        results,
        overallScore: finalScore,
        coverageFraction: coverage,
        confidenceInterval,
        shareOfVoice,
        competitors: competitors.length > 0 ? competitors : undefined,
    };
}
