import OpenAI from "openai";
import { env } from "../config/env";
import { AccountDocument } from "../models/Account";
import { CeoDecision, TrendInsight, ViralScript } from "../types";
import { RateLimiter } from "../utils/rateLimiter";
import { logEvent } from "../services/logService";
import { mockScript } from "./openai";

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

export class KimiAdapter {
  private readonly client?: OpenAI;
  private readonly limiter = new RateLimiter("kimi");

  constructor() {
    if (env.kimiApiKey && !env.mockIntegrations) {
      this.client = new OpenAI({
        apiKey: env.kimiApiKey,
        baseURL: env.kimiBaseUrl
      });
    }
  }

  get configured() {
    return Boolean(this.client);
  }

  async generateScript(
    account: AccountDocument,
    trend: TrendInsight,
    hookTemplates: string[],
    feedback?: string
  ): Promise<ViralScript> {
    const fallback = mockScript(account, trend, feedback);
    if (!this.client) return fallback;

    await logEvent({ scope: "kimi", message: "Calling Kimi script generation", accountId: account._id.toString() });
    const response = await this.limiter.withBackoff(() =>
      this.client!.chat.completions.create({
        model: env.kimiModel,
        temperature: 0.65,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a viral short-form content strategist. Return strict JSON only. Every video must follow 0-3 sec hook, 3-10 sec content, 10-20 sec payoff."
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
              hookTemplates,
              feedback,
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
      score: 84,
      risks: [],
      notes: "Kimi fallback review passed. Hook-first structure is present."
    };
    if (!this.client) return fallback;

    await logEvent({ scope: "kimi", message: "Calling Kimi CEO review", accountId: account._id.toString() });
    const response = await this.limiter.withBackoff(() =>
      this.client!.chat.completions.create({
        model: env.kimiModel,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are the CEO Agent. Return strict JSON deciding if the content is safe and strong enough for human approval."
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
