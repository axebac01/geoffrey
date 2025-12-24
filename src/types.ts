export interface EntitySnapshot {
  businessName: string;
  industry: string;
  region: string; // e.g., "Malmö, Sweden"
  website?: string;
  descriptionSpecs: string[]; // e.g., ["Sells used cars", "Offers financing"]
  strategicFocus?: string[];
  logoUrl?: string;
  description?: string;
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

export interface AnalysisResult {
  snapshot: EntitySnapshot;
  results: PromptResult[];
  overallScore: number;
  coverageFraction: string; // e.g., "3/5"
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
