import { Router } from "express";
import { z } from "zod";
import { pipelineService } from "../services/pipelineService";
import { asyncHandler } from "./asyncHandler";

const router = Router();

router.post(
  "/:id/approve",
  asyncHandler(async (req, res) => {
    const content = await pipelineService.approve(String(req.params.id), req.body?.actor ?? "dashboard");
    res.json(content);
  })
);

router.post(
  "/:id/reject",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      actor: z.string().default("dashboard"),
      regenerate: z.boolean().default(true)
    });
    const parsed = schema.parse(req.body ?? {});
    const result = await pipelineService.reject(String(req.params.id), parsed.actor, parsed.regenerate);
    res.json(result);
  })
);

router.post(
  "/:id/edit",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      feedback: z.string().min(3),
      actor: z.string().default("dashboard")
    });
    const parsed = schema.parse(req.body ?? {});
    const content = await pipelineService.revise(String(req.params.id), parsed.feedback, parsed.actor);
    res.status(202).json(content);
  })
);

export default router;
