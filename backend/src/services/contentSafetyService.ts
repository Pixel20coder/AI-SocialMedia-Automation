import { AccountDocument } from "../models/Account";
import { ContentItemDocument } from "../models/ContentItem";
import { SafetyReview, ViralScript } from "../types";
import { logEvent } from "./logService";

const explicitSexualTerms = [
  /\bsex\b/i,
  /\bporn\b/i,
  /\bnude(s|)\b/i,
  /\bnaked\b/i,
  /\bblowjob\b/i,
  /\bhandjob\b/i,
  /\bpenetrat(e|ion|ing)\b/i,
  /\borgasm\b/i,
  /\bxxx\b/i,
  /\bexplicit\b/i,
  /\buncensored\b/i
];

const solicitationTerms = [
  /\bonlyfans\b/i,
  /\bprivate\s*(show|content|video|pics|photos)\b/i,
  /\bdm\s*(me|for)\b/i,
  /\blink\s*in\s*bio\s*(for|to)\s*(nudes|private|uncensored|xxx)/i,
  /\bsubscribe\s*(for|to)\s*(nudes|private|uncensored|xxx)/i,
  /\bescort\b/i,
  /\bmeet\s*up\b/i
];

const minorCodedTerms = [
  /\bteen\b/i,
  /\bbarely\s*legal\b/i,
  /\bschool\s*girl\b/i,
  /\bschoolgirl\b/i,
  /\bunder\s*18\b/i,
  /\byoung\s*girl\b/i,
  /\blolita\b/i,
  /\bchild\b/i,
  /\bkid\b/i,
  /\bminor\b/i
];

const nudityTerms = [
  /\bvisible\s*(genitals|nipples)\b/i,
  /\bsee[-\s]*through\b/i,
  /\btransparent\s*(top|lingerie|dress)\b/i,
  /\bfully\s*nude\b/i,
  /\btopless\b/i,
  /\bclose[-\s]*up\s*buttocks\b/i
];

const adultGlamPositiveTerms = [
  /\badult\b/i,
  /\b18\+\b/i,
  /\bglam(our|)\b/i,
  /\bfashion\b/i,
  /\bbikini\b/i,
  /\blingerie\b/i,
  /\bbeauty\b/i,
  /\blifestyle\b/i,
  /\bfitness\b/i,
  /\bconsent[-\s]*safe\b/i
];

function isAdultGlamAccount(account: AccountDocument) {
  const text = [account.name, account.description, account.audience, account.tone, ...account.brandRules]
    .join(" ")
    .toLowerCase();
  return /\b(glam|beauty|model|bikini|lingerie|adult|creator|lifestyle|fashion|onlyfans|premium)\b/.test(text);
}

function collectMatches(text: string, patterns: RegExp[], label: string) {
  return patterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => `${label}: ${pattern.source.replace(/\\b|\\s\*|\\s|\(\|.*?\)|\(|\)|\?/g, " ")}`.trim());
}

export class ContentSafetyService {
  reviewScript(account: AccountDocument, script: ViralScript): SafetyReview {
    const text = [
      account.name,
      account.description,
      account.audience,
      account.tone,
      ...account.brandRules,
      script.title,
      script.hook,
      script.body,
      script.payoff,
      script.caption,
      script.hashtags.join(" "),
      script.visualPrompt,
      script.voiceDirection
    ].join(" ");

    const category = isAdultGlamAccount(account) ? "adult_glam" : account.niche === "custom" ? "unknown" : "general";
    const reasons = [
      ...collectMatches(text, minorCodedTerms, "minor-coded"),
      ...collectMatches(text, explicitSexualTerms, "explicit sexual"),
      ...collectMatches(text, solicitationTerms, "sexual solicitation"),
      ...collectMatches(text, nudityTerms, "nudity risk")
    ];

    const positiveSignals = collectMatches(text, adultGlamPositiveTerms, "adult-glam safe signal");
    const recommendations: string[] = [];

    if (category === "adult_glam") {
      recommendations.push("Keep every depicted person clearly adult/18+.");
      recommendations.push("Use glamour, fashion, fitness, bikini, or lingerie framing without explicit nudity.");
      recommendations.push("Avoid direct sexual offers, private-content promises, or explicit link-in-bio phrasing.");
      recommendations.push("Avoid see-through clothing, visible nipples/genitals, sexual acts, or minor-coded styling.");
    }

    if (positiveSignals.length === 0 && category === "adult_glam") {
      recommendations.push("Add adult-safe fashion/beauty context so the post reads as glamour, not solicitation.");
    }

    const score = Math.max(0, 100 - reasons.length * 28 + Math.min(positiveSignals.length, 3) * 4);

    return {
      allowed: reasons.length === 0,
      score,
      category,
      reasons,
      recommendations
    };
  }

  async assertContentAllowed(account: AccountDocument, content: ContentItemDocument) {
    if (!content.script) {
      throw new Error("Cannot safety-check content without a script.");
    }

    const review = this.reviewScript(account, content.script as ViralScript);
    content.safetyReview = review;
    await (content as unknown as { save: () => Promise<unknown> }).save();

    await logEvent({
      level: review.allowed ? "info" : "warn",
      scope: "content-safety",
      accountId: account._id.toString(),
      contentId: content._id.toString(),
      message: review.allowed ? "Content safety review passed" : "Content safety review blocked content",
      metadata: { ...review }
    });

    if (!review.allowed) {
      throw new Error(`Content safety blocked post: ${review.reasons.join("; ")}`);
    }

    return review;
  }
}

export const contentSafetyService = new ContentSafetyService();
