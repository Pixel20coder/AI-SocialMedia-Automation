import { AiGateway } from "../integrations/ai/aiGateway";
import { AccountDocument } from "../models/Account";
import { HookTemplate } from "../models/HookTemplate";
import { TrendInsight, ViralScript } from "../types";

export class ContentAgent {
  constructor(private readonly ai: AiGateway) {}

  async createScript(account: AccountDocument, trend: TrendInsight, feedback?: string): Promise<ViralScript> {
    const hookTemplates = await HookTemplate.find({
      $or: [{ accountId: account._id }, { niche: account.niche }]
    })
      .sort({ score: -1, usageCount: 1 })
      .limit(12);

    const script = await this.ai.generateScript(
      account,
      trend,
      hookTemplates.map((hook) => hook.template),
      feedback
    );

    if (script.hook) {
      await HookTemplate.updateOne(
        { template: script.hook, niche: account.niche },
        {
          $setOnInsert: {
            accountId: account._id,
            niche: account.niche,
            source: "generated",
            format: "hook-content-payoff"
          },
          $inc: { usageCount: 1 },
          $set: { lastUsedAt: new Date() }
        },
        { upsert: true }
      );
    }

    return script;
  }
}
