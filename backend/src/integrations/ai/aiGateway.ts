import { GroqAdapter } from "../groq";
import { OpenAiAdapter } from "../openai";
import { AccountDocument } from "../../models/Account";
import { AnalyticsSnapshotDocument } from "../../models/AnalyticsSnapshot";
import { CeoDecision, TrendInsight, ViralScript } from "../../types";

export class AiGateway {
  constructor(
    private readonly groq = new GroqAdapter(),
    private readonly openai = new OpenAiAdapter()
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
    return this.openai.generateScript(account, trend, hookTemplates, feedback);
  }

  ceoReview(account: AccountDocument, script: ViralScript, trend: TrendInsight): Promise<CeoDecision> {
    return this.openai.ceoReview(account, script, trend);
  }
}
