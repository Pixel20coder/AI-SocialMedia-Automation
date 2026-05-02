import { Router } from "express";
import { pipelineService } from "../services/pipelineService";
import { AnalyticsSnapshot } from "../models/AnalyticsSnapshot";
import { asyncHandler } from "./asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const snapshots = await AnalyticsSnapshot.find().populate("accountId").sort({ createdAt: -1 }).limit(100);
    res.json(snapshots);
  })
);

router.post(
  "/collect",
  asyncHandler(async (_req, res) => {
    const snapshots = await pipelineService.collectFeedback();
    res.status(202).json(snapshots);
  })
);

export default router;
