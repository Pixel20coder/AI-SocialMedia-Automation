import { AiGateway } from "../integrations/ai/aiGateway";
import { AccountDocument } from "../models/Account";
import { AnalyticsSnapshot } from "../models/AnalyticsSnapshot";
import { HookTemplate } from "../models/HookTemplate";
import { TrendInsight } from "../types";

export class AnalyticsAgent {
  constructor(private readonly ai: AiGateway) {}

  async analyze(account: AccountDocument): Promise<TrendInsight> {
    const [snapshots, hooks] = await Promise.all([
      AnalyticsSnapshot.find({ accountId: account._id }).sort({ createdAt: -1 }).limit(25),
      HookTemplate.find({ $or: [{ accountId: account._id }, { niche: account.niche }] })
        .sort({ score: -1, usageCount: -1 })
        .limit(20)
    ]);

    const trend = await this.ai.analyzeTrends(
      account,
      snapshots,
      hooks.map((hook) => hook.template)
    );

    await Promise.all(
      trend.hooks.map((template, index) =>
        HookTemplate.updateOne(
          { template, niche: account.niche },
          {
            $setOnInsert: {
              accountId: account._id,
              niche: account.niche,
              source: "analytics",
              format: trend.formats[index % Math.max(trend.formats.length, 1)] ?? "short-form"
            },
            $max: { score: 70 + index }
          },
          { upsert: true }
        )
      )
    );

    return trend;
  }
}
