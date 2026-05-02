import { Router } from "express";
import { z } from "zod";
import { ContentItem } from "../models/ContentItem";
import { pipelineService } from "../services/pipelineService";
import { asyncHandler } from "./asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query: Record<string, unknown> = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.accountId) query.accountId = req.query.accountId;

    const content = await ContentItem.find(query).populate("accountId").sort({ createdAt: -1 }).limit(100);
    res.json(content);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const content = await ContentItem.findById(req.params.id).populate("accountId");
    if (!content) {
      res.status(404).json({ error: "Content not found" });
      return;
    }
    res.json(content);
  })
);

router.post(
  "/generate",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      accountId: z.string().optional(),
      feedback: z.string().optional()
    });
    const { accountId, feedback } = schema.parse(req.body ?? {});

    if (!accountId) {
      const generated = await pipelineService.generateForAllEnabled();
      res.status(202).json(generated);
      return;
    }

    const content = await pipelineService.generateForAccount(accountId, { feedback });
    res.status(202).json(content);
  })
);

router.post(
  "/:id/regenerate",
  asyncHandler(async (req, res) => {
    const schema = z.object({ feedback: z.string().optional() });
    const { feedback } = schema.parse(req.body ?? {});
    const original = await ContentItem.findById(req.params.id);
    if (!original) {
      res.status(404).json({ error: "Content not found" });
      return;
    }
    const content = await pipelineService.generateForAccount(original.accountId.toString(), {
      feedback: feedback ?? "Regenerate this draft with a stronger hook and cleaner payoff."
    });
    res.status(202).json(content);
  })
);

export default router;
