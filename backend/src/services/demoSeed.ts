import { Account } from "../models/Account";
import { AnalyticsSnapshot } from "../models/AnalyticsSnapshot";
import { HookTemplate } from "../models/HookTemplate";

export async function seedDemoData() {
  const accounts = [
    {
      name: "Daily Discipline",
      niche: "motivation",
      description: "High-retention motivation reels for builders, students, and creators.",
      audience: "Young professionals, students, founders, and self-improvement audiences.",
      tone: "Direct, cinematic, practical",
      dailyQuota: 1,
      channels: [
        { platform: "instagram", handle: "@daily.discipline" },
        { platform: "youtube", handle: "@DailyDisciplineShorts" }
      ],
      brandRules: ["No fake guru claims", "No medical or financial promises", "Keep payoff practical"]
    },
    {
      name: "Saree Stories",
      niche: "culture",
      description: "Indian saree and traditional content with meaning-first storytelling.",
      audience: "Indian fashion, culture, wedding, and heritage audiences.",
      tone: "Warm, elegant, respectful",
      dailyQuota: 1,
      channels: [
        { platform: "instagram", handle: "@saree.stories" },
        { platform: "youtube", handle: "@SareeStoriesShorts" }
      ],
      brandRules: ["Respect regional differences", "Avoid flattening cultural meaning", "No synthetic stereotypes"]
    },
    {
      name: "Fact Flash",
      niche: "facts",
      description: "Fast, surprising facts designed for replay and shares.",
      audience: "Curious short-form viewers who like science, history, and everyday facts.",
      tone: "Curious, crisp, surprising",
      dailyQuota: 1,
      channels: [
        { platform: "instagram", handle: "@fact.flash" },
        { platform: "youtube", handle: "@FactFlashShorts" }
      ],
      brandRules: ["Avoid unsupported claims", "Prefer evergreen facts", "Use simple language"]
    }
  ] as const;

  const savedAccounts = [];
  for (const account of accounts) {
    const saved = await Account.findOneAndUpdate({ name: account.name }, account, {
      upsert: true,
      new: true
    });
    savedAccounts.push(saved);
  }

  for (const account of savedAccounts) {
    await HookTemplate.updateOne(
      { template: "Stop scrolling if this is you.", niche: account.niche },
      {
        $setOnInsert: {
          accountId: account._id,
          niche: account.niche,
          source: "manual",
          format: "direct-callout",
          score: 88
        }
      },
      { upsert: true }
    );

    const existingSnapshot = await AnalyticsSnapshot.findOne({ accountId: account._id });
    if (!existingSnapshot) {
      await AnalyticsSnapshot.create({
        accountId: account._id,
        platform: "instagram",
        views: 15200,
        likes: 1340,
        comments: 112,
        shares: 290,
        saves: 420,
        followers: 5200,
        engagementRate: 14.22,
        topHooks: ["Stop scrolling if this is you.", "Nobody tells you this part."],
        topFormats: ["hook-list-payoff", "story-detail-meaning"],
        raw: { source: "seed" }
      });
    }
  }

  return savedAccounts;
}
