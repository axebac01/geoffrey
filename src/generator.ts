import { createOpenAIClient } from "./config";
import { EntitySnapshot, FAQResult, GeneratorOutput, FAQItem } from "./types";

/**
 * Generates FAQs based on the entity snapshot.
 * STRICTLY uses the snapshot data to avoid hallucinations.
 */
export async function generateFAQ(snapshot: EntitySnapshot): Promise<FAQResult> {
    const openai = createOpenAIClient();

    const systemPrompt = `
You are an expert SEO copywriter for small businesses.
Task: Generate 5 FAQs (Question & Answer pairs) based STRICTLY on the provided business details.
Rules:
1. Do NOT invent facts. Use only the provided "Snapshot" details.
2. If info is missing, be generic/safe or skip that angle.
3. Tone: Professional, helpful, trustworthy.
4. Output JSON: { "items": [{ "question": "...", "answer": "..." }] }
    `;

    const userPrompt = `
Business Snapshot:
Name: ${snapshot.businessName}
Region: ${snapshot.region}
Specs: ${snapshot.descriptionSpecs.join("; ")}
Website: ${snapshot.website || "N/A"}
`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.3, // Low temp for factual accuracy
            response_format: { type: "json_object" }
        });

        const content = response.choices[0]?.message?.content || "{}";
        const data = JSON.parse(content) as { items: FAQItem[] };

        // Post-process to generate formats
        const items = data.items || [];

        // 1. Markdown
        const markdown = items.map(i => `### ${i.question}\n${i.answer}`).join("\n\n");

        // 2. HTML
        const html = items.map(i => `<div class="faq-item">\n  <h3>${i.question}</h3>\n  <p>${i.answer}</p>\n</div>`).join("\n");

        // 3. JSON-LD (FAQPage)
        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": items.map(i => ({
                "@type": "Question",
                "name": i.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": i.answer
                }
            }))
        };

        return { items, markdown, html, jsonLd };

    } catch (e) {
        console.error("Error generating FAQ:", e);
        throw e;
    }
}

/**
 * Generates an "About" snippet optimized for AI contexts.
 */
export async function generateAbout(snapshot: EntitySnapshot): Promise<string> {
    const openai = createOpenAIClient();

    const systemPrompt = `
You are an AI Optimization expert.
Task: Write a 150-word "About Us" description for the business.
Goal: This text should be dense with entities (Location, Services, Brand Name) to help LLMs understand the business.
Rules:
1. Use ONLY provided facts.
2. Structure: One cohesive paragraph.
    `;

    const userPrompt = `
Business Snapshot:
Name: ${snapshot.businessName}
Region: ${snapshot.region}
Specs: ${snapshot.descriptionSpecs.join("; ")}
    `;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.4,
        });

        return response.choices[0]?.message?.content || "";
    } catch (e) {
        console.error("Error generating About snippet:", e);
        throw e;
    }
}

/**
 * Generates LocalBusiness/Organization JSON-LD.
 */
export function generateOrganizationSchema(snapshot: EntitySnapshot): object {
    // Deterministic generation - no AI needed for basic schema, reduces cost/latency.
    return {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": snapshot.businessName,
        "url": snapshot.website,
        "address": {
            "@type": "PostalAddress",
            "addressRegion": snapshot.region
        },
        "description": snapshot.descriptionSpecs.join(". ")
    };
}

/**
 * Orchestrator
 */
export async function runGeoffreyGenerator(snapshot: EntitySnapshot): Promise<GeneratorOutput> {
    const [faq, aboutSnippet] = await Promise.all([
        generateFAQ(snapshot),
        generateAbout(snapshot)
    ]);
    const orgSchema = generateOrganizationSchema(snapshot);

    return { faq, aboutSnippet, orgSchema };
}
