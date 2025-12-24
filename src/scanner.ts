import axios from "axios";
import * as cheerio from "cheerio";
import { createOpenAIClient } from "./config";
import { EntitySnapshot } from "./types";

interface ScanResult {
    snapshot: EntitySnapshot;
    suggestedPrompts: string[];
}

/**
 * Scrapes a website and uses LLM to extract entity details.
 */
export async function scanWebsite(url: string): Promise<ScanResult> {
    console.log(`[Scanner] Fetching ${url}...`);

    // Auto-prepend https if missing
    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        targetUrl = "https://" + targetUrl;
    }

    // 1. Fetch HTML with robust headers
    let html = "";
    try {
        const res = await axios.get(targetUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9"
            },
            timeout: 15000 // 15s timeout
        });
        html = res.data;
    } catch (e: any) {
        // Should we try http if https failed? Maybe later. For now, just throw clear error.
        console.error(`[Scanner] Fetch failed for ${targetUrl}: ${e.message}`);
        if (e.response && e.response.status === 403) {
            throw new Error("Access Denied (403). website blocks bots. Try entering details manually.");
        }
        throw new Error(`Failed to visit website: ${e.message}`);
    }

    // 2. Extract Content (Robust Strategy)
    const $ = cheerio.load(html);

    // Remove noise
    $("script").remove();
    $("style").remove();
    $("nav").remove();
    $("footer").remove();

    // Strategy A: Body Text
    let text = $("body").text().replace(/\s+/g, " ").trim();

    // Strategy B: Fallback for SPAs (empty body) -> Use Meta Tags
    if (text.length < 200) {
        console.log("[Scanner] Body text too short (likely SPA). extracting metadata...");
        const title = $("title").text();
        const desc = $('meta[name="description"]').attr("content") || "";
        const ogDesc = $('meta[property="og:description"]').attr("content") || "";
        const ogSite = $('meta[property="og:site_name"]').attr("content") || "";
        const keywords = $('meta[name="keywords"]').attr("content") || "";

        text = `
        Title: ${title}
        Description: ${desc}
        OG Description: ${ogDesc}
        Site Name: ${ogSite}
        Keywords: ${keywords}
        `;
    }

    // Extract Logo URL
    let logoUrl = "";
    // Strategy 1: Check for apple-touch-icon (usually high quality)
    const appleTouchIcon = $('link[rel="apple-touch-icon"]').attr("href");
    if (appleTouchIcon) {
        logoUrl = new URL(appleTouchIcon, targetUrl).href;
    } else {
        // Strategy 2: Check for og:image
        const ogImage = $('meta[property="og:image"]').attr("content");
        if (ogImage) {
            logoUrl = new URL(ogImage, targetUrl).href;
        } else {
            // Strategy 3: Check for favicon
            const favicon = $('link[rel="icon"]').attr("href") || $('link[rel="shortcut icon"]').attr("href");
            if (favicon) {
                logoUrl = new URL(favicon, targetUrl).href;
            }
        }
    }
    console.log(`[Scanner] Logo extracted: ${logoUrl || "none"}`);

    // Final truncate
    const safeText = text.slice(0, 6000);
    console.log(`[Scanner] Analyzing ${safeText.length} chars with AI...`);

    // 3. Multi-Stage Deep Intelligence Pipeline
    const openai = createOpenAIClient();

    // === PASS 1: Content Extraction Agent ===
    console.log(`[Scanner] Pass 1/4: Deep Content Extraction...`);
    const extractionPrompt = `
You are a Content Intelligence Agent.
Task: Perform deep semantic analysis of the website content and extract key business intelligence.

Return ONLY JSON:
{
  "companyDescription": "Brief 1-2 sentence description of what the company does",
  "valuePropositions": ["prop1", "prop2", ...],
  "targetAudience": ["audience signal 1", "audience signal 2", ...],
  "pricingSignals": ["pricing mention 1", ...],
  "competitorMentions": ["competitor or comparison", ...],
  "uniqueTerminology": ["industry-specific term 1", ...]
}

Instructions:
- Company Description: A concise, clear summary of the business (what they do, who they serve)
- Value Propositions: What benefits/outcomes does the business promise?
- Target Audience: Who are they speaking to? (demographics, psychographics, pain points)
- Pricing Signals: Any mentions of price points, affordability, premium positioning
- Competitor Mentions: Any competitors mentioned or implied comparisons
- Unique Terminology: Industry jargon, branded terms, or specific service names
`;

    const extractionResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: extractionPrompt },
            { role: "user", content: `Website Content:\n"${safeText}"` }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
    });

    const extractedData = JSON.parse(extractionResponse.choices[0]?.message?.content || "{}");

    // === PASS 2: Market Positioning Agent ===
    console.log(`[Scanner] Pass 2/4: Market Positioning Analysis...`);
    const positioningPrompt = `
You are a Market Positioning Strategist.
Task: Analyze the business positioning and differentiation based on the extracted intelligence.

Extracted Data:
${JSON.stringify(extractedData, null, 2)}

Return ONLY JSON:
{
  "marketNiche": "specific niche description",
  "audiencePersonas": ["persona 1", "persona 2", ...],
  "competitiveAdvantages": ["advantage 1", "advantage 2", ...],
  "strategicFocus": ["focus area 1", "focus area 2", ...]
}

Instructions:
- Market Niche: Be hyper-specific (e.g., "Eco-friendly baby products for urban millennials" not just "baby products")
- Audience Personas: Describe the ideal customer profiles
- Competitive Advantages: What makes them different from competitors?
- Strategic Focus: 5-7 core areas the business emphasizes most
`;

    const positioningResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: positioningPrompt },
            { role: "user", content: `Analyze positioning for this business.` }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
    });

    const positioningData = JSON.parse(positioningResponse.choices[0]?.message?.content || "{}");
    const focusAreas = positioningData.strategicFocus || [];

    // === PASS 3: Intent Mapping Agent ===
    console.log(`[Scanner] Pass 3/4: User Intent Mapping...`);
    const intentPrompt = `
You are a Search Intent Specialist.
Task: Map user search behaviors and intent patterns based on the business positioning.

Market Positioning:
${JSON.stringify(positioningData, null, 2)}

Return ONLY JSON:
{
  "intentClusters": [
    {
      "persona": "persona name",
      "searchBehaviors": ["behavior 1", "behavior 2", ...],
      "painPoints": ["pain point 1", ...]
    }
  ]
}

Instructions:
- Create 3-4 intent clusters representing different user personas
- Search behaviors: What would they actually type into ChatGPT/search?
- Pain points: What problems are they trying to solve?
`;

    const intentResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: intentPrompt },
            { role: "user", content: `Map search intents.` }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
    });

    const intentData = JSON.parse(intentResponse.choices[0]?.message?.content || "{}");

    // === PASS 4: Strategic Prompt Generator ===
    console.log(`[Scanner] Pass 4/4: Strategic Prompt Generation...`);
    const generatorPrompt = `
You are a GEO Discovery Strategist.
Task: Generate 20 hyper-specific discovery prompts based on the complete intelligence analysis.

Strategic Focus: ${focusAreas.join(", ")}
Intent Clusters: ${JSON.stringify(intentData.intentClusters, null, 2)}
Website Content (for language detection): "${safeText.slice(0, 1000)}"

Return ONLY JSON:
{
  "businessName": "...",
  "industry": "...",
  "region": "City, Country",
  "descriptionSpecs": ["fact 1", "fact 2", "fact 3", "fact 4"],
  "suggestedPrompts": ["Query 1", "Query 2", ... "Query 20"]
}

CRITICAL Guidelines:
- **Language**: Detect the native language from the website content. ALL suggestedPrompts MUST be in that SAME language.
- **Specificity**: Prompts must be hyper-specific, including:
  - Persona-based needs (e.g., "best organic baby formula for sensitive skin")
  - Specific value propositions (e.g., "same-day emergency dental care")
  - Competitive differentiators (e.g., "eco-friendly car detailing near me")
- **Diversity**: 
  - 5x Transactional (buying intent)
  - 5x Informational (learning/researching)
  - 5x Comparative (vs competitors or alternatives)
  - 5x Natural Language (conversational AI queries)
- Map each prompt to identified personas and pain points
`;

    const generatorResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: generatorPrompt },
            { role: "user", content: `Generate strategic prompts.` }
        ],
        temperature: 0.6,
        response_format: { type: "json_object" }
    });

    const data = JSON.parse(generatorResponse.choices[0]?.message?.content || "{}");

    // Extract business name from domain (more reliable than LLM)
    const domainName = new URL(targetUrl).hostname.replace('www.', '').split('.')[0];
    const beautifiedName = domainName.charAt(0).toUpperCase() + domainName.slice(1);

    return {
        snapshot: {
            businessName: beautifiedName || data.businessName || "Unknown Business",
            industry: positioningData.marketNiche || data.industry || "Unknown Industry",
            region: data.region || "Unknown Region",
            website: targetUrl,
            descriptionSpecs: data.descriptionSpecs || [],
            strategicFocus: focusAreas,
            logoUrl: logoUrl || undefined,
            description: extractedData.companyDescription || ""
        },
        suggestedPrompts: data.suggestedPrompts || []
    };
}
