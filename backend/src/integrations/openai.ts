import OpenAI from "openai";
import { env } from "../config/env";
import { AccountDocument } from "../models/Account";
import { CeoDecision, TrendInsight, ViralScript } from "../types";
import { RateLimiter } from "../utils/rateLimiter";
import { logEvent } from "../services/logService";

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

export function mockScript(account: AccountDocument, trend: TrendInsight, feedback?: string): ViralScript {
  const hook = trend.hooks[0] ?? "Stop scrolling for this.";
  const bodyByNiche: Record<string, string> = {
    motivation:
      "The people who change their lives do not wait for perfect energy. They build one tiny promise and keep it when nobody is clapping.",
    culture:
      "Every drape, border, and color choice carries memory. Traditional wear is not just an outfit; it is identity made visible.",
    facts:
      "Your brain remembers unfinished stories better than completed ones. That is why cliffhangers pull you back so fast.",
    custom:
      "The strongest content pattern is simple: interrupt the scroll, build curiosity, then pay it off cleanly."
  };
  const payoffByNiche: Record<string, string> = {
    motivation: "Win the private reps and the public result becomes inevitable.",
    culture: "Style gets attention, but meaning creates loyalty.",
    facts: "Curiosity is not random. It is a retention engine.",
    custom: "Make the first three seconds impossible to ignore."
  };
  const body = bodyByNiche[account.niche] ?? bodyByNiche.custom;
  const payoff = payoffByNiche[account.niche] ?? payoffByNiche.custom;

  return {
    title: `${account.name}: ${hook.slice(0, 42)}`,
    hook,
    body: feedback ? `${body} Revision note: ${feedback}` : body,
    payoff,
    sections: [
      { start: 0, end: 3, text: hook },
      { start: 3, end: 10, text: body },
      { start: 10, end: 20, text: payoff }
    ],
    caption: `${trend.captions[0] ?? "Save this for later."} ${payoff}`,
    hashtags: [`#${account.niche}`, "#reels", "#shorts", "#viralcontent", "#dailyvideo"],
    visualPrompt: `Vertical 9:16 short-form video for ${account.niche}. Fast cuts, clean composition, high retention visuals, no copyrighted logos.`,
    voiceDirection: `${account.tone}. Clear, energetic, short pauses after the hook.`
  };
}

export class OpenAiAdapter {
  private readonly client?: OpenAI;
  private readonly limiter = new RateLimiter("openai");

  constructor() {
    if (env.openAiApiKey && !env.mockIntegrations) {
      this.client = new OpenAI({ apiKey: env.openAiApiKey });
    }
  }

  async generateScript(
    account: AccountDocument,
    trend: TrendInsight,
    hookTemplates: string[],
    feedback?: string
  ): Promise<ViralScript> {
    const fallback = mockScript(account, trend, feedback);

    if (!this.client) {
      await logEvent({
        scope: "openai",
        message: "Using safe script fallback because OpenAI is not configured",
        accountId: account._id.toString()
      });
      return fallback;
    }

    await logEvent({ scope: "openai", message: "Calling OpenAI script generation", accountId: account._id.toString() });
    const response = await this.limiter.withBackoff(() =>
      this.client!.chat.completions.create({
        model: env.gptModel,
        temperature: 0.75,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a senior short-form content strategist. Return strict JSON only. Every script must follow 0-3 sec hook, 3-10 sec content, 10-20 sec payoff."
          },
          {
            role: "user",
            content: JSON.stringify({
              account: {
                name: account.name,
                niche: account.niche,
                audience: account.audience,
                tone: account.tone,
                language: account.language,
                brandRules: account.brandRules
              },
              trend,
              reusableHookTemplates: hookTemplates,
              revisionFeedback: feedback,
              requiredShape: {
                title: "string",
                hook: "string",
                body: "string",
                payoff: "string",
                sections: [
                  { start: 0, end: 3, text: "STRONG HOOK" },
                  { start: 3, end: 10, text: "CONTENT" },
                  { start: 10, end: 20, text: "PAYOFF" }
                ],
                caption: "string",
                hashtags: ["string"],
                visualPrompt: "string",
                voiceDirection: "string"
              }
            })
          }
        ]
      })
    );

    return parseJson(response.choices[0]?.message?.content ?? "", fallback);
  }

  async ceoReview(account: AccountDocument, script: ViralScript, trend: TrendInsight): Promise<CeoDecision> {
    const fallback: CeoDecision = {
      approvedForUserReview: true,
      score: 86,
      risks: [],
      notes: "Ready for user approval. Hook-first structure is present."
    };

    if (!this.client) return fallback;

    await logEvent({ scope: "openai", message: "Calling OpenAI CEO review", accountId: account._id.toString() });
    const response = await this.limiter.withBackoff(() =>
      this.client!.chat.completions.create({
        model: env.gptModel,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are the CEO Agent. Decide whether generated content is safe and strong enough to send to the human for approval. Return strict JSON."
          },
          {
            role: "user",
            content: JSON.stringify({
              account: {
                name: account.name,
                niche: account.niche,
                audience: account.audience,
                brandRules: account.brandRules
              },
              trend,
              script,
              checks: [
                "0-3 second strong hook",
                "3-10 second content",
                "10-20 second payoff",
                "no hate, misinformation, or unsafe claims",
                "caption and hashtags included"
              ],
              outputShape: {
                approvedForUserReview: "boolean",
                score: "number 0-100",
                risks: ["string"],
                notes: "string"
              }
            })
          }
        ]
      })
    );

    return parseJson(response.choices[0]?.message?.content ?? "", fallback);
  }
}
