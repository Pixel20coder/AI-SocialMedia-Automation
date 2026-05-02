import { Router } from "express";
import { z } from "zod";
import { JobStatus } from "../models/JobStatus";
import { queueService } from "../services/queueService";
import { asyncHandler } from "./asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      status: z.string().optional(),
      queueName: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(250).default(100)
    });
    const query = schema.parse(req.query);
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.queueName) filter.queueName = query.queueName;

    const jobs = await JobStatus.find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit)
      .populate("accountId")
      .populate("contentId");
    res.json(jobs);
  })
);

router.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    res.json(await queueService.summary());
  })
);

export default router;
