import { createOpenAIClient, createGeminiClient } from "./config";

/**
 * Pass 1: Responder
 * Asks the model the user's prompt and captures the raw answer text.
 * We use a low temperature to ensure stability, but enough creativity to simulate a real user interaction.
 */
export async function runResponder(
    prompt: string,
    provider: "openai" | "gemini" = "openai"
): Promise<string> {
    try {
        if (provider === "openai") {
            const openai = createOpenAIClient();
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
            });
            return response.choices[0]?.message?.content || "";
        } else {
            // Gemini Logic
            const gemini = createGeminiClient();
            const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            console.log(`[Responder] Gemini response: ${text.slice(0, 50)}...`);
            return text;
        }
    } catch (error) {
        console.error(`Error in runResponder (${provider}):`, error);
        // For MVP, if one fails, we might just return an error string or rethrow.
        // Rethrowing allows the top level to handle it.
        throw error;
    }
}
