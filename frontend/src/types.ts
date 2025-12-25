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
  strategicFocus?: string[]; // e.g., ["Eco-friendly EVs", "Family safety"]
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
}

export interface JudgeOutput {
  isMentioned: boolean;
  mentionType: "direct" | "alias" | "implied" | "none";
  rankPosition?: number; // 0 if not applicable/found
  industryMatch: boolean;
  locationMatch: boolean;
  sentiment?: "positive" | "neutral" | "negative";
}

export interface CompetitorMention {
  competitorName: string;
  isMentioned: boolean;
  mentionCount: number;
  averageRankPosition: number | null;
  mentionRate: number;
}

export interface ShareOfVoice {
  brandMentionRate: number;
  competitorMentions: CompetitorMention[];
  totalMentions: number;
  brandShare: number;
  topCompetitors: CompetitorMention[];
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
  competitors?: string[];
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
