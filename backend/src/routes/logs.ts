import { Router } from "express";
import { z } from "zod";
import { LogEntry } from "../models/LogEntry";
import { asyncHandler } from "./asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      level: z.string().optional(),
      scope: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(250).default(100)
    });
    const query = schema.parse(req.query);
    const filter: Record<string, unknown> = {};
    if (query.level) filter.level = query.level;
    if (query.scope) filter.scope = query.scope;

    const logs = await LogEntry.find(filter).sort({ createdAt: -1 }).limit(query.limit);
    res.json(logs);
  })
);

export default router;
