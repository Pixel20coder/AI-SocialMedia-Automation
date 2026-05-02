import { Router } from "express";
import { z } from "zod";
import { Account } from "../models/Account";
import { AnalyticsSnapshot } from "../models/AnalyticsSnapshot";
import { ContentItem } from "../models/ContentItem";
import { asyncHandler } from "./asyncHandler";

const router = Router();

const accountSchema = z.object({
  name: z.string().min(2),
  niche: z.enum(["motivation", "culture", "facts", "custom"]),
  description: z.string().min(4),
  audience: z.string().min(3),
  tone: z.string().min(3),
  language: z.string().default("English"),
  dailyQuota: z.number().int().min(1).max(10).default(1),
  enabled: z.boolean().default(true),
  channels: z
    .array(
      z.object({
        platform: z.enum(["instagram", "youtube", "tiktok", "facebook"]),
        handle: z.string(),
        externalAccountId: z.string().optional(),
        enabled: z.boolean().default(true)
      })
    )
    .default([]),
  brandRules: z.array(z.string()).default([])
});

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const accounts = await Account.find().sort({ createdAt: 1 });
    res.json(accounts);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = accountSchema.parse(req.body);
    const account = await Account.create(parsed);
    res.status(201).json(account);
  })
);

router.get(
  "/:id/analytics",
  asyncHandler(async (req, res) => {
    const [snapshots, content] = await Promise.all([
      AnalyticsSnapshot.find({ accountId: req.params.id }).sort({ createdAt: -1 }).limit(30),
      ContentItem.find({ accountId: req.params.id }).sort({ createdAt: -1 }).limit(20)
    ]);
    res.json({ snapshots, content });
  })
);

export default router;
