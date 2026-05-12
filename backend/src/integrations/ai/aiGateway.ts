import { GroqAdapter } from "../groq";
import { KimiAdapter } from "../kimi";
import { OpenAiAdapter } from "../openai";
import { env } from "../../config/env";
import { AccountDocument } from "../../models/Account";
import { AnalyticsSnapshotDocument } from "../../models/AnalyticsSnapshot";
import { CeoDecision, TrendInsight, ViralScript } from "../../types";

export class AiGateway {
  constructor(
    private readonly groq = new GroqAdapter(),
    private readonly openai = new OpenAiAdapter(),
    private readonly kimi = new KimiAdapter()
  ) {}

  analyzeTrends(
    account: AccountDocument,
    snapshots: AnalyticsSnapshotDocument[],
    existingHooks: string[]
  ): Promise<TrendInsight> {
    return this.groq.analyzeTrends(account, snapshots, existingHooks);
  }

  generateScript(
    account: AccountDocument,
    trend: TrendInsight,
    hookTemplates: string[],
    feedback?: string
  ): Promise<ViralScript> {
    if (env.aiContentProvider === "kimi" || (env.aiContentProvider === "auto" && this.kimi.configured)) {
      return this.kimi.generateScript(account, trend, hookTemplates, feedback);
    }
    return this.openai.generateScript(account, trend, hookTemplates, feedback);
  }

  ceoReview(account: AccountDocument, script: ViralScript, trend: TrendInsight): Promise<CeoDecision> {
    if (env.aiContentProvider === "kimi" || (env.aiContentProvider === "auto" && this.kimi.configured)) {
      return this.kimi.ceoReview(account, script, trend);
    }
    return this.openai.ceoReview(account, script, trend);
  }
}
