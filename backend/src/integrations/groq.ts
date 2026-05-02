import { env } from "../config/env";
import { AccountDocument } from "../models/Account";
import { AnalyticsSnapshotDocument } from "../models/AnalyticsSnapshot";
import { TrendInsight } from "../types";
import { RateLimiter, fetchWithRateLimit } from "../utils/rateLimiter";
import { logEvent } from "../services/logService";

type ChatMessage = { role: "system" | "user"; content: string };

function parseJson<T>(text: string, fallback: T): T {
  try {
    const trimmed = text.trim();
    const json = trimmed.startsWith("```")
      ? trimmed.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim()
      : trimmed;
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export function mockTrend(account: AccountDocument): TrendInsight {
  const nicheHooks: Record<string, string[]> = {
    motivation: [
      "Stop scrolling if you are building your life in silence.",
      "Nobody tells you this about discipline.",
      "The version of you that wins does this daily."
    ],
    culture: [
      "This saree detail has a story most people miss.",
      "One tradition, three generations, one timeless look.",
      "Before you call it fashion, know the meaning."
    ],
    facts: [
      "This sounds fake, but it is real.",
      "You use this every day and never noticed why.",
      "Here is the 15-second fact that changes the story."
    ],
    custom: [
      "This tiny shift changes everything.",
      "Most people miss this simple pattern.",
      "Here is the fastest way to understand it."
    ]
  };

  return {
    hooks: nicheHooks[account.niche] ?? nicheHooks.custom,
    captions: [
      "Save this before it disappears from your feed.",
      "Which part hit hardest?",
      "Send this to someone who needs the reminder."
    ],
    formats: ["hook-list-payoff", "myth-truth-reveal", "story-detail-meaning"],
    keywords: [account.niche, "shorts", "reels", "viral", "retention"],
    rationale: `Fallback trend pack tuned for ${account.name}.`
  };
}

export class GroqAdapter {
  private readonly limiter = new RateLimiter("groq");

  async analyzeTrends(
    account: AccountDocument,
    snapshots: AnalyticsSnapshotDocument[],
    existingHooks: string[]
  ): Promise<TrendInsight> {
    const fallback = mockTrend(account);

    if (!env.groqApiKey || env.mockIntegrations) {
      await logEvent({
        scope: "groq",
        message: "Using safe trend fallback because Groq is not configured"
      });
      return fallback;
    }

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are a fast social trend analyst. Return strict JSON only with hooks, captions, formats, keywords, rationale."
      },
      {
        role: "user",
        content: JSON.stringify({
          account: {
            name: account.name,
            niche: account.niche,
            audience: account.audience,
            tone: account.tone,
            brandRules: account.brandRules
          },
          recentPerformance: snapshots.slice(0, 20),
          existingHooks,
          outputShape: {
            hooks: ["string"],
            captions: ["string"],
            formats: ["string"],
            keywords: ["string"],
            rationale: "string"
          }
        })
      }
    ];

    await logEvent({ scope: "groq", message: "Calling Groq trend analysis API", accountId: account._id.toString() });
    const response = await fetchWithRateLimit(
      this.limiter,
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.groqApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.groqModel,
          messages,
          temperature: 0.4,
          response_format: { type: "json_object" }
        })
      },
      "Groq trend analysis"
    );

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return parseJson(data.choices?.[0]?.message?.content ?? "", fallback);
  }
}
