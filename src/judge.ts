import { createOpenAIClient } from "./config";
import { EntitySnapshot, JudgeOutput } from "./types";

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
        if (!content) throw new Error("No content from Judge");

        const result = JSON.parse(content) as JudgeOutput;
        return result;
    } catch (error) {
        console.error("Error in runJudge:", error);
        // Return a safe fallback to avoid crashing calculations, or rethrow?
        // For now, rethrow so we know something went wrong with the judge logic.
        throw error;
    }
}
