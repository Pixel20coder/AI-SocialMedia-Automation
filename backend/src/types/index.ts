export type AccountNiche = "motivation" | "culture" | "facts" | "custom";

export type ContentStatus =
  | "draft"
  | "generating"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "needs_revision"
  | "publishing"
  | "posted"
  | "failed";

export type PipelineStage =
  | "analytics"
  | "content"
  | "voice"
  | "video"
  | "editing"
  | "ceo_review"
  | "approval"
  | "publishing"
  | "complete";

export interface TrendInsight {
  hooks: string[];
  captions: string[];
  formats: string[];
  keywords: string[];
  rationale: string;
}

export interface ScriptSection {
  start: number;
  end: number;
  text: string;
}

export interface ViralScript {
  title: string;
  hook: string;
  body: string;
  payoff: string;
  sections: ScriptSection[];
  caption: string;
  hashtags: string[];
  visualPrompt: string;
  voiceDirection: string;
}

export interface CeoDecision {
  approvedForUserReview: boolean;
  score: number;
  risks: string[];
  notes: string;
}

export interface GeneratedAsset {
  provider: string;
  filePath?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface SafetyReview {
  allowed: boolean;
  score: number;
  category: "general" | "adult_glam" | "kids" | "unknown";
  reasons: string[];
  recommendations: string[];
}
