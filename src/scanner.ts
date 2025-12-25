import axios from "axios";
import * as cheerio from "cheerio";
import { createOpenAIClient } from "./config";
import { EntitySnapshot, CompanyDescription, KeywordPromptPair, CompetitorInfo } from "./types";

interface ScanResult {
    snapshot: EntitySnapshot;
    suggestedPrompts: string[];
    suggestedCompetitors: string[];
    keywordPromptPairs?: KeywordPromptPair[];
    competitorDetails?: CompetitorInfo[];
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

    // === Extract TLD and detect country ===
    const hostname = new URL(targetUrl).hostname;
    const domainParts = hostname.split('.');
    const tld = domainParts.length > 1 ? domainParts.slice(-2).join('.') : domainParts.pop()?.toLowerCase() || '';
    const simpleTld = domainParts.pop()?.toLowerCase() || '';
    
    // Map TLD to country
    const tldToCountry: Record<string, string> = {
        'se': 'Sweden',
        'no': 'Norway',
        'dk': 'Denmark',
        'fi': 'Finland',
        'is': 'Iceland',
        'de': 'Germany',
        'fr': 'France',
        'es': 'Spain',
        'it': 'Italy',
        'nl': 'Netherlands',
        'be': 'Belgium',
        'at': 'Austria',
        'ch': 'Switzerland',
        'pl': 'Poland',
        'cz': 'Czech Republic',
        'ie': 'Ireland',
        'pt': 'Portugal',
        'gr': 'Greece',
        'hu': 'Hungary',
        'ro': 'Romania',
        'bg': 'Bulgaria',
        'hr': 'Croatia',
        'sk': 'Slovakia',
        'si': 'Slovenia',
        'ee': 'Estonia',
        'lv': 'Latvia',
        'lt': 'Lithuania',
        'uk': 'United Kingdom',
        'co.uk': 'United Kingdom',
        'com': 'International',
        'org': 'International',
        'net': 'International'
    };
    
    const detectedCountry = tldToCountry[tld] || tldToCountry[simpleTld] || null;
    const isCountrySpecificTLD = detectedCountry && detectedCountry !== 'International';
    
    // Detect language from content (simple heuristic)
    const textSample = text.slice(0, 1000).toLowerCase();
    const swedishWords = ['och', 'är', 'för', 'med', 'på', 'av', 'till', 'om', 'det', 'som', 'inte', 'den', 'han', 'hon', 'de', 'vi', 'ni', 'dem', 'sin', 'sitt', 'sina', 'vår', 'vårt', 'våra', 'er', 'ert', 'era', 'sverige', 'svensk', 'svenska'];
    const norwegianWords = ['og', 'er', 'for', 'med', 'på', 'av', 'til', 'om', 'det', 'som', 'ikke', 'den', 'han', 'hun', 'de', 'vi', 'dere', 'dem', 'norge', 'norsk', 'norske'];
    const danishWords = ['og', 'er', 'for', 'med', 'på', 'af', 'til', 'om', 'det', 'som', 'ikke', 'den', 'han', 'hun', 'de', 'vi', 'i', 'jeg', 'danmark', 'dansk', 'danske'];
    
    let detectedLanguage = 'unknown';
    let detectedLanguageCountry: string | null = null;
    
    const swedishCount = swedishWords.filter(word => textSample.includes(word)).length;
    const norwegianCount = norwegianWords.filter(word => textSample.includes(word)).length;
    const danishCount = danishWords.filter(word => textSample.includes(word)).length;
    
    if (swedishCount > 5) {
        detectedLanguage = 'swedish';
        detectedLanguageCountry = 'Sweden';
    } else if (norwegianCount > 5) {
        detectedLanguage = 'norwegian';
        detectedLanguageCountry = 'Norway';
    } else if (danishCount > 5) {
        detectedLanguage = 'danish';
        detectedLanguageCountry = 'Denmark';
    }
    
    // Determine primary country (TLD takes precedence, but language is a strong signal)
    const primaryCountry = isCountrySpecificTLD ? detectedCountry : (detectedLanguageCountry || null);
    const isCountrySpecific = isCountrySpecificTLD || detectedLanguageCountry !== null;
    
    console.log(`[Scanner] TLD: ${tld} (simple: ${simpleTld}), Country: ${primaryCountry}, Language: ${detectedLanguage}, Country-specific: ${isCountrySpecific}`);

    // Final truncate - reduced to 4000 chars for faster processing
    const safeText = text.slice(0, 4000);
    console.log(`[Scanner] Analyzing ${safeText.length} chars with AI...`);

    // 3. Optimized 2-Pass Deep Intelligence Pipeline
    const openai = createOpenAIClient();

    // Extract business name from domain (more reliable than LLM) - do this early
    const domainName = new URL(targetUrl).hostname.replace('www.', '').split('.')[0];
    const beautifiedName = domainName.charAt(0).toUpperCase() + domainName.slice(1);

    // === PASS 1: Combined Extraction + Positioning + Prompts ===
    console.log(`[Scanner] Pass 1/2: Combined Extraction, Positioning & Prompt Generation...`);
    const combinedPrompt = `
You are a Business Intelligence Agent.
Task: Extract business information, analyze positioning, and generate discovery prompts in ONE comprehensive analysis.

Website Content:
"${safeText}"

Website URL: ${targetUrl}
TLD: ${tld} ${isCountrySpecificTLD ? `(Country-specific: ${detectedCountry})` : '(Generic)'}
Detected Language: ${detectedLanguage} ${detectedLanguageCountry ? `(Country: ${detectedLanguageCountry})` : ''}
Primary Country: ${primaryCountry || 'Unknown'} ${isCountrySpecific ? '(⚠️ STRONG COUNTRY-SPECIFIC SIGNAL ⚠️)' : ''}

Return ONLY JSON:
{
  "extraction": {
    "companyDescription": "Brief 1-2 sentence description of what the company does",
    "valuePropositions": ["prop1", "prop2", ...],
    "targetAudience": ["audience signal 1", "audience signal 2", ...],
    "competitorMentions": ["competitor or comparison", ...],
    "comparisonSignals": {
      "vsPages": ["competitor mentioned in vs/comparison pages"],
      "alternativesMentioned": ["alternative solutions mentioned"],
      "competitorComparisons": ["explicit comparisons with competitors"]
    },
    "serviceGeographicScope": {
      "services": [
        {
          "service": "service name",
          "scope": "local" | "regional" | "national" | "international",
          "geographicDetails": "specific area served"
        }
      ]
    }
  },
  "positioning": {
    "marketNiche": "specific niche description",
    "strategicFocus": ["focus area 1", "focus area 2", ...],
    "competitiveAdvantages": ["advantage 1", "advantage 2", ...]
  },
  "prompts": {
    "businessName": "...",
    "industry": "...",
    "region": "City, Country",
    "descriptionSpecs": ["fact 1", "fact 2", "fact 3", "fact 4"],
    "suggestedPrompts": ["Query 1", "Query 2", ... "Query 12"]
  }
}

CRITICAL Guidelines:
- **Language**: Detect the native language from the website content. ALL suggestedPrompts MUST be in that SAME language.
- **Prompts**: Generate exactly 12 prompts (3x Transactional, 3x Informational, 3x Comparative, 3x Conversational)
- **NON-BRANDED PROMPTS (CRITICAL)**: 
  * NEVER include the company name or brand in prompts
  * Prompts should be SEARCH QUERIES that potential customers would use when looking for solutions
  * Examples of GOOD prompts: "Svenska CRM för småföretag", "Bästa projektledningsverktyg för startups", "Alternativ till Salesforce för svenska företag"
  * Examples of BAD prompts: "Hur skiljer [CompanyName] från andra leverantörer", "[CompanyName] vs konkurrenter", "Varför välja [CompanyName]"
  * Think: What would someone search for BEFORE they know about this company?
  * Focus on: problem statements, solution categories, industry + geography, target audience + use case
- **Specificity**: Prompts must be hyper-specific, persona-based, and include value propositions
- **Market Niche**: Be hyper-specific (e.g., "Eco-friendly baby products for urban millennials" not just "baby products")
- **Strategic Focus**: 5-7 core areas the business emphasizes most
`;

    const combinedResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: combinedPrompt },
            { role: "user", content: `Analyze this business comprehensively.` }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
        max_tokens: 4000
    });

    const combinedData = JSON.parse(combinedResponse.choices[0]?.message?.content || "{}");
    const extractedData = combinedData.extraction || {};
    const positioningData = combinedData.positioning || {};
    const data = combinedData.prompts || {};
    const focusAreas = positioningData.strategicFocus || [];

    // === PASS 2: Combined Geographic, Competitor & Company Description ===
    console.log(`[Scanner] Pass 2/2: Combined Geographic, Competitor & Description Analysis...`);

    // Pass 5A: Extract competitors from website comparison signals
    const websiteCompetitors = extractedData.competitorMentions || [];
    const comparisonSignals = extractedData.comparisonSignals || {};
    const vsPageCompetitors = comparisonSignals.vsPages || [];
    const alternativesMentioned = comparisonSignals.alternativesMentioned || [];
    const explicitComparisons = comparisonSignals.competitorComparisons || [];

    // High-confidence competitors from website
    // Helper function to normalize competitor names for comparison
    const normalizeCompetitorName = (name: string): string => {
        return name.trim()
            .toLowerCase()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[.,;:!?]/g, '') // Remove punctuation
            .trim();
    };

    // Collect and deduplicate high-confidence competitors
    const highConfidenceCompetitorsRaw = [
        ...websiteCompetitors,
        ...vsPageCompetitors,
        ...alternativesMentioned,
        ...explicitComparisons
    ].map(c => c.trim()).filter(Boolean);
    
    // Deduplicate by normalized name
    const seenNames = new Set<string>();
    const highConfidenceCompetitors: string[] = [];
    highConfidenceCompetitorsRaw.forEach(name => {
        const normalized = normalizeCompetitorName(name);
        if (!seenNames.has(normalized)) {
            seenNames.add(normalized);
            highConfidenceCompetitors.push(name); // Keep original casing
        }
    });

    // Combined prompt: Geographic analysis + Competitor detection + Company Description
    const combinedGeographicCompetitorDescPrompt = `
You are a Geographic Market Intelligence Agent, Market Intelligence Analyst, and Business Analyst.
Task: Analyze geographic scope, identify competitors, AND generate structured company description in ONE comprehensive analysis.

Business Information:
- Name: ${beautifiedName || data.businessName || "Unknown"}
- Industry/Niche: ${positioningData.marketNiche || data.industry || "Unknown"}
- Region: ${data.region || "Unknown"}
- Website: ${targetUrl}
- TLD: ${tld} ${isCountrySpecificTLD ? `(Country-specific: ${detectedCountry})` : '(Generic)'}
- Detected Language: ${detectedLanguage} ${detectedLanguageCountry ? `(Country: ${detectedLanguageCountry})` : ''}
- Primary Country Signal: ${primaryCountry || 'Unknown'} ${isCountrySpecific ? '(⚠️ STRONG COUNTRY-SPECIFIC SIGNAL ⚠️)' : ''}
- Website Content: "${safeText.slice(0, 3000)}"
- Extracted Services: ${JSON.stringify(extractedData.serviceGeographicScope?.services || [])}
- Services: ${data.descriptionSpecs?.join(", ") || "Unknown"}
- Strategic Focus: ${focusAreas.join(", ")}

Competitors Already Found on Website:
${highConfidenceCompetitors.length > 0 ? highConfidenceCompetitors.join(", ") : "None found"}

🚨 CRITICAL: If TLD is country-specific (${isCountrySpecificTLD ? 'YES - ' + detectedCountry : 'NO'}) OR language is country-specific (${detectedLanguageCountry ? 'YES - ' + detectedLanguageCountry : 'NO'}), this is a STRONG signal that the business primarily serves ${primaryCountry || 'that country'}'s market. Competitors MUST be prioritized from ${primaryCountry || 'the same country'}.

Return ONLY JSON:
{
  "geographicAnalysis": {
    "primaryMarketType": "local" | "regional" | "national" | "international" | "hybrid",
    "primaryCountry": "${primaryCountry || "Unknown"}",
    "isCountrySpecific": ${isCountrySpecific},
    "marketBreakdown": {
      "localWeight": 0.0-1.0,
      "regionalWeight": 0.0-1.0,
      "nationalWeight": 0.0-1.0,
      "internationalWeight": 0.0-1.0
    },
    "serviceScopeAnalysis": [
      {
        "service": "service name",
        "scope": "local" | "regional" | "national" | "international",
        "geographicMarkers": ["city name", "region name", ...],
        "serviceArea": "specific geographic area"
      }
    ],
    "locationSignals": {
      "cities": ["city names mentioned"],
      "regions": ["region names mentioned"],
      "countries": ["country names mentioned"],
      "localMarkers": ["local landmarks", "neighborhoods", "local events"]
    }
  },
  "competitors": [
    {
      "name": "Exact Company Name - MUST be a real, specific company brand name (e.g., 'Salesforce', 'HubSpot', 'Visma'). NEVER use generic phrases like 'Global CRM solutions' or 'Other providers'",
      "type": "direct" | "indirect" | "market_leader" | "emerging",
      "geographicMatch": "local" | "regional" | "national" | "international",
      "countryMatch": "${primaryCountry || "Unknown"}" | "other",
      "serviceMatch": "high" | "medium" | "low",
      "reason": "Detailed explanation including geographic context and country",
      "confidence": "high" | "medium" | "low",
      "source": "market_knowledge" | "industry_standard" | "inferred"
    }
  ],
  "competitiveLandscape": {
    "localMarket": "description of local competitive landscape",
    "regionalMarket": "description of regional competitive landscape",
    "nationalMarket": "description of national competitive landscape",
    "marketLeaders": ["Specific company brand names - e.g., 'Salesforce', 'HubSpot', 'Visma' - NOT generic phrases"],
    "emergingPlayers": ["Specific company brand names of newer competitors - e.g., 'Pipedrive', 'Zoho CRM' - NOT generic phrases"]
  },
  "companyDescription": {
    "overview": "A 2-3 sentence overview of the company, what they do, and their mission",
    "productsAndServices": ["service 1", "service 2", "service 3"],
    "targetMarket": ["target segment 1", "target segment 2"],
    "keyDifferentiators": ["differentiator 1", "differentiator 2", "differentiator 3"],
    "notableInfo": ["achievement 1", "certification", "any notable fact"],
    "practicalDetails": {
      "website": "${targetUrl}",
      "contact": "extracted contact info or empty string",
      "positioningNote": "brief note on their market positioning"
    }
  }
}

🚨 CRITICAL PRIORITY RULES (MANDATORY) 🚨

**RULE 1: COUNTRY-SPECIFIC DETECTION (HIGHEST PRIORITY)**
${isCountrySpecific ? `
⚠️ STRONG COUNTRY-SPECIFIC SIGNAL DETECTED ⚠️
- TLD: ${tld} → ${detectedCountry}
- Language: ${detectedLanguage} → ${detectedLanguageCountry}
- Primary Country: ${primaryCountry}

**MANDATORY**: You MUST prioritize competitors from ${primaryCountry}:
- 70-80% of competitors MUST be from ${primaryCountry}
- Focus on ${primaryCountry} market leaders in this industry
- Include ${primaryCountry} regional/local competitors
- Only include international competitors if they have strong presence in ${primaryCountry}
- Examples: For Swedish SaaS (${primaryCountry}), prioritize Swedish competitors like [list Swedish competitors in this industry]
` : `
- TLD is generic (.com) or language is not country-specific
- Can include more international competitors
`}

**RULE 2: Geographic Analysis**
- Analyze the business holistically: some businesses are HYBRID (e.g., local services + national online products)
- Calculate weights: If 70% of services are local, localWeight = 0.7
- **For country-specific businesses**: Set nationalWeight high (0.7-0.9) for ${primaryCountry || 'the specific country'}, internationalWeight low (0.1-0.3)
- Service Scope Analysis: For each service, determine its geographic reach
- Location Signals: Extract all geographic references to understand market focus

**RULE 3: Use Website Competitors**
The competitors found on the website (${highConfidenceCompetitors.length > 0 ? highConfidenceCompetitors.join(", ") : "none"}) are HIGH CONFIDENCE. Include and expand on these.

**RULE 3.5: SYSTEMATIC COMPETITOR RESEARCH (PRECISION FOCUS)**
Before listing competitors, systematically research and think through these categories:

1. **Direct Competitors** (highest priority - same product/service, same target market):
   - Companies offering the exact same solution
   - Same pricing tier and customer segment
   - Primary alternatives customers would consider
   
2. **Market Leaders** (well-known, established brands):
   - Dominant players in the industry with significant market share
   - Household names in this category
   - Companies that appear in industry reports, G2, Capterra reviews
   
3. **Regional/Local Competitors** (especially for country-specific markets):
   ${isCountrySpecific ? `- ${primaryCountry}-based companies serving the same market
   - Local alternatives that customers in ${primaryCountry} would actually consider
   - Regional players with strong presence in ${primaryCountry}
   - Think: "What ${primaryCountry} companies compete in this space?"` : '- Regional players in the same geographic area'}
   
4. **Emerging/Alternative Players**:
   - Newer companies disrupting the space
   - Alternative solutions that solve the same problem differently

**Research Methodology (CRITICAL FOR PRECISION):**
- Use your knowledge of REAL companies in this industry - only include companies you know exist
- Think: "If I were a customer in ${primaryCountry || 'this market'} looking for [service/product], what specific companies would I find when searching?"
- Consider: "What companies appear in industry reports, G2, Capterra, or similar review sites for this category?"
- Research: "What are the well-known, established brands in [industry] for ${primaryCountry || 'this market'}?"
- Prioritize ACCURACY over quantity - better to return 5 correct competitors than 10 with 2 wrong ones
- If you're not certain a company exists or competes in this space, DON'T include it

**RULE 4: SPECIFIC COMPANY NAMES ONLY (CRITICAL - STRICTLY ENFORCED)**
🚨🚨🚨 ABSOLUTE MANDATORY RULE 🚨🚨🚨

You MUST return ONLY specific, real company brand names. This is NON-NEGOTIABLE.

✅ CORRECT EXAMPLES (Real company names):
- "Salesforce"
- "HubSpot"
- "Pipedrive"
- "Teamleader"
- "Visma"
- "Fortnox"
- "Microsoft Dynamics"
- "Oracle NetSuite"
- "Zoho CRM"
- "SugarCRM"

❌ ABSOLUTELY FORBIDDEN (These will be rejected):
- "Global CRM solutions"
- "Other CRM providers"
- "Competing solutions"
- "Alternative platforms"
- "International providers"
- "Enterprise solutions"
- "Business platforms"
- "Other companies in this space"
- "Various CRM tools"
- ANY phrase containing: "solutions", "providers", "platforms", "companies", "services", "tools" as the final word
- ANY phrase starting with: "Other", "Global", "International", "Local", "Regional", "Enterprise", "Business", "Various", "Multiple", "Several"

VALIDATION RULES:
1. Each "name" field MUST be a recognizable brand name that a user could search for on Google and find a specific company website
2. If you cannot find a specific company name, DO NOT include that competitor. Return fewer competitors (even 0) rather than generic ones.
3. Think: "Would a user search for '[name]' and find a specific company website?" If NO, it's invalid.
4. Research actual companies in this industry. Use real brand names you know exist.
5. For country-specific markets, research companies that actually operate in that country.

If you return ANY generic category instead of a company name, the entire response will be invalid.

**RULE 5: Service-Level Matching**
For each competitor, indicate how well their services match:
- High: Same core services
- Medium: Overlapping services
- Low: Indirect/substitute services

Guidelines:
- **Target: 5-7 competitors (MAX 10)** - Precision is MORE important than quantity
- **Quality over quantity**: Better to return 5 accurate competitors than 10 with errors
- **Only include competitors you are CERTAIN about** - if unsure, exclude them
${isCountrySpecific ? `- **70-80% MUST be from ${primaryCountry}**` : '- Mix of local, regional, and national competitors'}
- **CRITICAL: Each competitor name MUST be a real, searchable company brand name**
- **ABSOLUTELY FORBIDDEN: Generic phrases, categories, or descriptions**
- **Examples of INVALID names: "Global CRM solutions", "Other providers", "Enterprise platforms", "Business tools"**
- **Examples of VALID names: "Salesforce", "HubSpot", "Visma", "Microsoft Dynamics"**
- **Priority order**: 1) Direct competitors, 2) Market leaders, 3) Regional/local competitors, 4) Emerging players
- If you cannot find enough specific company names you're certain about, return fewer competitors (even 3-5) rather than guessing
- Include location context in reason field
- For country-specific businesses: Prioritize country-specific competitors heavily
- Company Description: Use ONLY factual information from extracted data. Do NOT invent facts, certifications, or achievements.
`;

    const combinedGeoCompetitorDescResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: combinedGeographicCompetitorDescPrompt },
            { role: "user", content: `Analyze geographic scope, identify competitors, and generate company description for this ${isCountrySpecific ? primaryCountry + ' ' : ''}business.` }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
        max_tokens: 4000
    });

    const combinedGeoData = JSON.parse(combinedGeoCompetitorDescResponse.choices[0]?.message?.content || "{}");
    const geographicData = combinedGeoData.geographicAnalysis || {};
    const marketIntelligenceData = {
        competitors: combinedGeoData.competitors || [],
        competitiveLandscape: combinedGeoData.competitiveLandscape || {}
    };
    const companyDescription: CompanyDescription = combinedGeoData.companyDescription || {};

    // Pass 6D: Merge, Deduplicate, and Weight Competitors
    const allCompetitors: Array<{
        name: string;
        type: string;
        reason: string;
        confidence: number;
        sources: string[];
        geographicMatch?: string;
        serviceMatch?: string;
    }> = [];

    // 1. High-confidence from website (confidence: 0.95)
    highConfidenceCompetitors.forEach(name => {
        allCompetitors.push({
            name,
            type: 'direct',
            reason: 'Mentioned on company website or comparison pages',
            confidence: 0.95,
            sources: ['website'],
            geographicMatch: 'unknown',
            serviceMatch: 'high'
        });
    });

    // 2. Market intelligence competitors (confidence: 0.7-0.9 based on match)
    (marketIntelligenceData.competitors || []).forEach((c: any) => {
        const existing = allCompetitors.find(comp => 
            normalizeCompetitorName(comp.name) === normalizeCompetitorName(c.name)
        );
        
        if (existing) {
            // Merge: increase confidence, add source
            existing.sources.push('market_intelligence');
            existing.confidence = Math.min(0.98, existing.confidence + 0.1);
            if (c.geographicMatch) existing.geographicMatch = c.geographicMatch;
            if (c.serviceMatch) existing.serviceMatch = c.serviceMatch;
            if (c.countryMatch) (existing as any).countryMatch = c.countryMatch;
        } else {
            const confidenceMap = { high: 0.85, medium: 0.7, low: 0.5 };
            allCompetitors.push({
                name: c.name,
                type: c.type || 'direct',
                reason: c.reason || '',
                confidence: confidenceMap[c.confidence as keyof typeof confidenceMap] || 0.7,
                sources: ['market_intelligence'],
                geographicMatch: c.geographicMatch,
                serviceMatch: c.serviceMatch,
                countryMatch: c.countryMatch
            } as any);
        }
    });

    // 3. Extract additional competitors from competitiveLandscape (market leaders and emerging players)
    const marketLeaders = marketIntelligenceData.competitiveLandscape?.marketLeaders || [];
    const emergingPlayers = marketIntelligenceData.competitiveLandscape?.emergingPlayers || [];
    
    // Add these to the competitor list if they're not already there and are valid company names
    [...marketLeaders, ...emergingPlayers].forEach(name => {
        if (typeof name === 'string' && name.trim()) {
            const nameTrimmed = name.trim();
            const existing = allCompetitors.find(comp => 
                normalizeCompetitorName(comp.name) === normalizeCompetitorName(nameTrimmed)
            );
            
            if (!existing) {
                // Check if it's a valid company name (not generic)
                const nameLower = nameTrimmed.toLowerCase();
                const isGeneric = /^(other|global|international|local|regional|enterprise|business|various|multiple|several)\s+/i.test(nameLower) ||
                                 /\s+(solutions?|providers?|platforms?|companies?|services?|tools?|systems?|software)$/i.test(nameLower);
                
                // Only add if it's a valid company name and not too short
                if (!isGeneric && nameTrimmed.length >= 3) {
                    const isMarketLeader = marketLeaders.includes(name);
                    allCompetitors.push({
                        name: nameTrimmed,
                        type: isMarketLeader ? 'market_leader' : 'emerging',
                        reason: `Listed in competitive landscape as ${isMarketLeader ? 'market leader' : 'emerging player'}`,
                        confidence: isMarketLeader ? 0.75 : 0.65,
                        sources: ['competitive_landscape'],
                        geographicMatch: 'unknown',
                        serviceMatch: 'medium'
                    });
                }
            }
        }
    });

    // 4. Sort by relevance score (weighted by market type)
    const marketWeights = geographicData.marketBreakdown || {
        localWeight: 0,
        regionalWeight: 0,
        nationalWeight: 0,
        internationalWeight: 0
    };

    allCompetitors.forEach(comp => {
        // Calculate relevance score
        let relevanceScore = comp.confidence;
        
        // 🚨 COUNTRY MATCH BONUS (HIGHEST PRIORITY) 🚨
        if (isCountrySpecific && primaryCountry) {
            // Check if competitor name or reason mentions the country
            const compLower = (comp.name + ' ' + comp.reason).toLowerCase();
            const countryLower = primaryCountry.toLowerCase();
            const countryCode = primaryCountry === 'Sweden' ? 'svensk' : 
                              primaryCountry === 'Norway' ? 'norsk' :
                              primaryCountry === 'Denmark' ? 'dansk' : '';
            
            // Check countryMatch field if available
            const hasCountryMatch = (comp as any).countryMatch === primaryCountry || 
                                   (comp as any).countryMatch?.toLowerCase() === primaryCountry.toLowerCase();
            
            if (hasCountryMatch || 
                compLower.includes(countryLower) || 
                (countryCode && compLower.includes(countryCode)) ||
                (comp.geographicMatch === 'national' && comp.reason?.toLowerCase().includes(primaryCountry.toLowerCase()))) {
                relevanceScore += 0.3; // Huge bonus for country match
            }
        }
        
        // Geographic match bonus
        if (comp.geographicMatch === 'local' && marketWeights.localWeight > 0.3) {
            relevanceScore += 0.15 * marketWeights.localWeight;
        }
        if (comp.geographicMatch === 'regional' && marketWeights.regionalWeight > 0.3) {
            relevanceScore += 0.1 * marketWeights.regionalWeight;
        }
        if (comp.geographicMatch === 'national' && marketWeights.nationalWeight > 0.3) {
            relevanceScore += 0.1 * marketWeights.nationalWeight;
        }
        
        // Service match bonus
        if (comp.serviceMatch === 'high') relevanceScore += 0.1;
        if (comp.serviceMatch === 'medium') relevanceScore += 0.05;
        
        // Source diversity bonus
        if (comp.sources.length > 1) relevanceScore += 0.05;
        
        (comp as any).relevanceScore = Math.min(1.0, relevanceScore);
    });

    // 5. FILTER OUT GENERIC/INVALID COMPETITORS (Pre-validation filter)
    const invalidPatterns = [
        /^other\s+/i,
        /^competing\s+/i,
        /^alternative\s+/i,
        /^other\s+.*\s+in\s+/i,
        /providers?\s+in\s+/i,
        /solutions?\s+in\s+/i,
        /companies?\s+in\s+/i,
        /platforms?\s+in\s+/i,
        /^various\s+/i,
        /^multiple\s+/i,
        /^several\s+/i,
        /\s+and\s+others?$/i,
        /^etc\.?$/i,
        // NEW: Catch phrases ending with generic category words
        /\s+(solutions?|providers?|platforms?|companies?|services?|tools?)$/i,
        // NEW: Catch phrases starting with geographic/generic adjectives
        /^(global|international|local|regional|national|european|enterprise|business|professional|commercial)\s+/i
    ];
    
    const preFilteredCompetitors = allCompetitors.filter(comp => {
        const name = comp.name.trim();
        
        // Reject if matches invalid patterns
        if (invalidPatterns.some(pattern => pattern.test(name))) {
            console.log(`[Scanner] Pre-filter removed generic competitor: "${name}"`);
            return false;
        }
        
        // Reject if too short (likely not a real company name)
        if (name.length < 3) {
            return false;
        }
        
        // Reject if it's just a category (common words that aren't company names)
        const categoryWords = ['providers', 'solutions', 'platforms', 'companies', 'services', 'tools', 'systems', 'software'];
        const words = name.toLowerCase().split(/\s+/);
        if (words.length === 1 && categoryWords.includes(words[0])) {
            return false;
        }
        
        return true;
    });

    // Sort by relevance score (highest first)
    preFilteredCompetitors.sort((a, b) => (b as any).relevanceScore - (a as any).relevanceScore);

    // Take top candidates for validation (max 15, will be reduced after validation)
    const candidatesForValidation = preFilteredCompetitors.slice(0, 15);

    // === PASS 3: Competitor Validation ===
    console.log(`[Scanner] Pass 3: Validating ${candidatesForValidation.length} competitors...`);

    const rawCompetitorNames = candidatesForValidation.map(c => c.name);

    const validationPrompt = `
You are a Company Name Validator. Your ONLY job is to check if each item is a real, specific company brand name.

For each item in the list below, respond with:
- "VALID" if it's a real, specific company brand name that you can verify exists (e.g., "Salesforce", "HubSpot", "Visma", "Fortnox")
- "INVALID" if it's a generic phrase, category, description, or you're not sure it's a real company

Input list:
${rawCompetitorNames.map((name: string, i: number) => `${i + 1}. ${name}`).join('\n')}

Return JSON:
{
  "validations": [
    {
      "original": "Original name from list",
      "status": "VALID" | "INVALID",
      "reason": "Brief explanation"
    }
  ]
}

VALIDATION RULES:
1. A VALID name is a recognizable brand that has a company website you can find on Google
2. Generic phrases are ALWAYS INVALID: "Global CRM Solutions", "Enterprise platforms", "Other providers"
3. Category descriptions are ALWAYS INVALID: "CRM providers", "Software solutions", "Business tools"
4. Phrases starting with adjectives + category are INVALID: "International solutions", "Professional services"
5. When in doubt, mark as INVALID - precision is more important than recall
6. Only mark as VALID if you are CERTAIN it's a real, specific company brand
`;

    let validatedNames: string[] = [];
    
    try {
        const validationResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: validationPrompt },
                { role: "user", content: "Validate each competitor name. Be strict - only VALID for real company names you're certain about." }
            ],
            temperature: 0.1, // Very low temperature for consistency
            response_format: { type: "json_object" },
            max_tokens: 2000
        });

        const validationData = JSON.parse(validationResponse.choices[0]?.message?.content || "{}");
        validatedNames = (validationData.validations || [])
            .filter((v: any) => v.status === 'VALID')
            .map((v: any) => v.original);
        
        console.log(`[Scanner] Validation complete: ${validatedNames.length}/${rawCompetitorNames.length} competitors validated`);
        
        // Log rejected competitors for debugging
        const rejectedNames = (validationData.validations || [])
            .filter((v: any) => v.status === 'INVALID')
            .map((v: any) => `${v.original} (${v.reason})`);
        if (rejectedNames.length > 0) {
            console.log(`[Scanner] Rejected competitors: ${rejectedNames.join(', ')}`);
        }
    } catch (validationError) {
        console.error(`[Scanner] Validation pass failed, using pre-filtered list:`, validationError);
        // Fallback to pre-filtered list if validation fails
        validatedNames = rawCompetitorNames;
    }

    // Only keep validated competitors
    const validatedCompetitors = candidatesForValidation.filter(comp => 
        validatedNames.some(vn => normalizeCompetitorName(vn) === normalizeCompetitorName(comp.name))
    );

    // Final deduplication pass - ensure no duplicates in final list
    const finalSeenNames = new Set<string>();
    const deduplicatedCompetitors: typeof validatedCompetitors = [];
    
    validatedCompetitors.forEach(comp => {
        const normalized = normalizeCompetitorName(comp.name);
        if (!finalSeenNames.has(normalized)) {
            finalSeenNames.add(normalized);
            deduplicatedCompetitors.push(comp);
        } else {
            console.log(`[Scanner] Removed duplicate competitor: "${comp.name}"`);
        }
    });

    // Take top competitors (max 10, target 5-7 for precision)
    const finalCompetitors = deduplicatedCompetitors.slice(0, 10);

    const suggestedCompetitors = finalCompetitors.map(c => c.name);
    const competitorDetails: CompetitorInfo[] = finalCompetitors.map(c => ({
        name: c.name,
        type: c.type as 'direct' | 'indirect' | 'market_leader' | 'emerging',
        reason: `${c.reason} (Sources: ${c.sources.join(', ')})`,
        confidence: c.confidence,
        geographicMatch: c.geographicMatch as 'local' | 'regional' | 'national' | 'international' | undefined,
        serviceMatch: c.serviceMatch as 'high' | 'medium' | 'low' | undefined,
        sources: c.sources
    }));


    // Ensure practicalDetails has website
    if (!companyDescription.practicalDetails) {
        companyDescription.practicalDetails = {
            website: targetUrl,
            contact: '',
            positioningNote: ''
        };
    } else if (!companyDescription.practicalDetails.website) {
        companyDescription.practicalDetails.website = targetUrl;
    }

    // Build keyword-prompt pairs with intent classification (12 prompts: 3x each type)
    const keywordPromptPairs: KeywordPromptPair[] = (data.suggestedPrompts || []).slice(0, 12).map((prompt: string, index: number) => {
        let intent: KeywordPromptPair['intent'] = 'informational';
        if (index < 3) intent = 'transactional';
        else if (index < 6) intent = 'informational';
        else if (index < 9) intent = 'comparative';
        else intent = 'conversational';

        // Extract keyword from prompt (simplified)
        const keyword = prompt.split(' ').slice(0, 4).join(' ').toLowerCase();

        return {
            keyword,
            prompt,
            intent,
            qualityScore: 80 + Math.floor(Math.random() * 15) // Placeholder score
        };
    });

    return {
        snapshot: {
            businessName: beautifiedName || data.businessName || "Unknown Business",
            industry: positioningData.marketNiche || data.industry || "Unknown Industry",
            region: data.region || "Unknown Region",
            website: targetUrl,
            descriptionSpecs: data.descriptionSpecs || [],
            strategicFocus: focusAreas,
            logoUrl: logoUrl || undefined,
            description: extractedData.companyDescription || "",
            companyDescription: companyDescription
        },
        suggestedPrompts: data.suggestedPrompts || [],
        suggestedCompetitors: suggestedCompetitors,
        keywordPromptPairs: keywordPromptPairs,
        competitorDetails: competitorDetails
    };
}
