import { Router } from "express";
import { HookTemplate } from "../models/HookTemplate";
import { asyncHandler } from "./asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query: Record<string, unknown> = {};
    if (req.query.niche) query.niche = req.query.niche;
    const hooks = await HookTemplate.find(query).sort({ score: -1, usageCount: -1 }).limit(100);
    res.json(hooks);
  })
);

export default router;
