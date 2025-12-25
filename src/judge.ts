import { createOpenAIClient } from "./config";
import { EntitySnapshot, JudgeOutput } from "./types";
import { logger } from "./logger";

/**
 * Pass 2: Judge
 * Evaluates the answer text against the target company entity.
 * Strictly checks for mentions, industry context, and location context.
 */
export async function runJudge(
    answerText: string,
    snapshot: EntitySnapshot
): Promise<JudgeOutput> {
    const openai = createOpenAIClient();

    const systemPrompt = `
You are an impartial judge evaluating an AI's response to see if it recommends a specific business.
Input:
1. Target Business Snapshot
2. The AI's Answer Text

Task:
Analyze if the 'Target Business' is mentioned in the 'Answer Text'.

Return JSON only conforming to this schema:
{
  "isMentioned": boolean,
  "mentionType": "direct" | "alias" | "implied" | "none",
  "rankPosition": number | null, // 1-based rank if a list, null otherwise
  "industryMatch": boolean, // does the answer discuss the correct industry?
  "locationMatch": boolean, // does the answer discuss the correct location?
  "sentiment": "positive" | "neutral" | "negative"
}

Target Business:
Name: ${snapshot.businessName}
Region: ${snapshot.region}
Specs: ${snapshot.descriptionSpecs.join("; ")}
Website: ${snapshot.website || "N/A"}
`;

    const userPrompt = `
AI Answer Text to Evaluate:
"""
${answerText}
"""
`;

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                temperature: 0.0, // Strict evaluation
                response_format: { type: "json_object" },
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error("No content from Judge");
            }

            // Try to parse JSON, handle invalid JSON gracefully
            let result: JudgeOutput;
            try {
                result = JSON.parse(content) as JudgeOutput;
            } catch (parseError) {
                logger.warn('Judge returned invalid JSON', {
                    attempt,
                    contentLength: content.length,
                    contentPreview: content.slice(0, 100),
                }, parseError as Error);
                // Try to extract basic info from malformed JSON
                if (attempt < maxRetries) {
                    lastError = new Error(`Invalid JSON response: ${parseError}`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
                    continue;
                }
                // Last attempt failed, return safe fallback
                return {
                    isMentioned: false,
                    mentionType: "none",
                    rankPosition: undefined,
                    industryMatch: false,
                    locationMatch: false,
                    sentiment: "neutral"
                };
            }

            // Validate required fields
            if (typeof result.isMentioned !== 'boolean' || 
                typeof result.industryMatch !== 'boolean' || 
                typeof result.locationMatch !== 'boolean') {
                logger.warn('Judge returned invalid response structure', {
                    attempt,
                    hasIsMentioned: typeof result.isMentioned === 'boolean',
                    hasIndustryMatch: typeof result.industryMatch === 'boolean',
                    hasLocationMatch: typeof result.locationMatch === 'boolean',
                });
                if (attempt < maxRetries) {
                    lastError = new Error("Invalid response structure");
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    continue;
                }
                // Return safe fallback
                return {
                    isMentioned: false,
                    mentionType: "none",
                    rankPosition: undefined,
                    industryMatch: false,
                    locationMatch: false,
                    sentiment: "neutral"
                };
            }

            logger.debug('Judge completed successfully', {
                attempt,
                isMentioned: result.isMentioned,
                rankPosition: result.rankPosition,
            });
            return result;
        } catch (error: any) {
            logger.warn('Judge error', {
                attempt,
                maxRetries,
                retryable: error.message?.includes('rate limit') || error.message?.includes('timeout'),
            }, error);
            lastError = error;
            
            // Retry on transient errors (network, rate limits)
            if (attempt < maxRetries && (
                error.message?.includes('rate limit') ||
                error.message?.includes('timeout') ||
                error.code === 'ECONNRESET' ||
                error.status === 429
            )) {
                const backoffDelay = 1000 * Math.pow(2, attempt - 1); // Exponential backoff
                console.log(`[Judge] Retrying after ${backoffDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                continue;
            }
            
            // Non-retryable error - return safe fallback
            if (attempt === maxRetries) {
                logger.error('Judge failed with non-retryable error, returning safe fallback', error);
                return {
                    isMentioned: false,
                    mentionType: "none",
                    rankPosition: undefined,
                    industryMatch: false,
                    locationMatch: false,
                    sentiment: "neutral"
                };
            }
        }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError || new Error("Judge failed after all retries");
}
