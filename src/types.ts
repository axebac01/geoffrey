// Structured company description following blueprint
export interface CompanyDescription {
  overview: string;
  productsAndServices: string[];
  targetMarket: string[];
  keyDifferentiators: string[];
  notableInfo: string[];
  practicalDetails: {
    website: string;
    contact: string;
    positioningNote: string;
  };
}

// Keyword-Prompt pair with quality metadata
export interface KeywordPromptPair {
  keyword: string;
  prompt: string;
  intent: 'transactional' | 'informational' | 'comparative' | 'conversational';
  qualityScore?: number;
}

// Competitor with detection metadata
export interface CompetitorInfo {
  name: string;
  type: 'direct' | 'indirect';
  reason: string;
  confidence?: number;
}

export interface EntitySnapshot {
  businessName: string;
  industry: string;
  region: string; // e.g., "Malmö, Sweden"
  website?: string;
  descriptionSpecs: string[]; // e.g., ["Sells used cars", "Offers financing"]
  strategicFocus?: string[];
  logoUrl?: string;
  description?: string;
  // Structured company description (new)
  companyDescription?: CompanyDescription;
}

export interface PromptResult {
  model: string; // e.g., "gtp-4o-mini", "gemini-1.5-flash"
  promptText: string;
  responderAnswer: string;
  judgeResult: JudgeOutput;
  // Aggregated results from multiple runs
  aggregatedResult?: AggregatedJudgeResult;
}

export interface JudgeOutput {
  isMentioned: boolean;
  mentionType: "direct" | "alias" | "implied" | "none";
  rankPosition?: number; // 0 if not applicable/found
  industryMatch: boolean;
  locationMatch: boolean;
  sentiment?: "positive" | "neutral" | "negative";
}

export interface AggregatedJudgeResult {
  // Average across multiple runs
  mentionRate: number; // 0-1, percentage of runs where brand was mentioned
  averageRankPosition: number | null; // Average rank when mentioned
  industryMatchRate: number; // 0-1
  locationMatchRate: number; // 0-1
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  confidenceInterval: {
    lower: number; // Lower bound of mention rate
    upper: number; // Upper bound of mention rate
  };
  runCount: number; // Number of successful runs
  totalRuns: number; // Total runs attempted
}

export interface CompetitorMention {
  competitorName: string;
  isMentioned: boolean;
  mentionCount: number; // Number of prompts where this competitor was mentioned
  averageRankPosition: number | null; // Average rank when mentioned
  mentionRate: number; // 0-1, percentage of prompts where mentioned
}

export interface ShareOfVoice {
  brandMentionRate: number; // 0-1, percentage of prompts where brand was mentioned
  competitorMentions: CompetitorMention[];
  totalMentions: number; // Total mentions across all prompts
  brandShare: number; // Percentage of total mentions that are the brand
  topCompetitors: CompetitorMention[]; // Top 5 competitors by mention rate
}

export interface AnalysisResult {
  snapshot: EntitySnapshot;
  results: PromptResult[];
  overallScore: number;
  coverageFraction: string; // e.g., "3/5"
  confidenceInterval?: {
    lower: number;
    upper: number;
  };
  shareOfVoice?: ShareOfVoice;
  competitors?: string[]; // List of competitors analyzed
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQResult {
  markdown: string;
  html: string;
  jsonLd: object;
  items: FAQItem[];
}

export interface GeneratorOutput {
  faq: FAQResult;
  aboutSnippet: string;
  orgSchema: object;
}
