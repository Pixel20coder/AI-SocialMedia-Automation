export interface Channel {
  platform: "instagram" | "youtube" | "tiktok" | "facebook";
  handle: string;
  enabled: boolean;
}

export interface Account {
  _id: string;
  name: string;
  niche: "motivation" | "culture" | "facts" | "custom";
  description: string;
  audience: string;
  tone: string;
  language: string;
  dailyQuota: number;
  enabled: boolean;
  channels: Channel[];
  brandRules: string[];
}

export interface AnalyticsSnapshot {
  _id: string;
  accountId: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  followers: number;
  engagementRate: number;
  topHooks: string[];
  topFormats: string[];
  createdAt: string;
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

export interface ContentItem {
  _id: string;
  accountId: string | Account;
  status:
    | "draft"
    | "generating"
    | "pending_approval"
    | "approved"
    | "rejected"
    | "needs_revision"
    | "publishing"
    | "posted"
    | "failed";
  pipelineStage: string;
  script?: ViralScript;
  ceoDecision?: {
    approvedForUserReview: boolean;
    score: number;
    risks: string[];
    notes: string;
  };
  assets?: {
    finalVideo?: { url?: string };
    subtitles?: { url?: string };
  };
  publishResults?: Array<{
    platform: string;
    handle: string;
    url: string;
    status: string;
  }>;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HookTemplate {
  _id: string;
  template: string;
  niche: string;
  score: number;
  usageCount: number;
}

export interface JobStatus {
  _id: string;
  queueName: string;
  jobId: string;
  name: string;
  status: "pending" | "waiting" | "delayed" | "running" | "completed" | "failed";
  attemptsMade: number;
  maxAttempts: number;
  accountId?: string | Account;
  contentId?: string | ContentItem;
  error?: string;
  resultUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LogEntry {
  _id: string;
  level: "debug" | "info" | "warn" | "error";
  scope: string;
  message: string;
  jobId?: string;
  queueName?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardResponse {
  accounts: Account[];
  content: ContentItem[];
  hooks: HookTemplate[];
  jobs: JobStatus[];
  logs: LogEntry[];
  analytics: Record<string, AnalyticsSnapshot | null>;
  pendingApprovals: ContentItem[];
  queue: ContentItem[];
}
