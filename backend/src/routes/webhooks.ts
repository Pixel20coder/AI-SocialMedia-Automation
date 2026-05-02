import { Router } from "express";
import { agents } from "../services/agentRegistry";
import { pipelineService } from "../services/pipelineService";
import { asyncHandler } from "./asyncHandler";

const router = Router();

router.post(
  "/telegram",
  asyncHandler(async (req, res) => {
    const callback = agents.telegram.parseCallback(req.body);
    if (!callback) {
      res.json({ ok: true, ignored: true });
      return;
    }

    if (callback.action === "approve") {
      const content = await pipelineService.approve(callback.contentId, callback.user ?? "telegram");
      res.json({ ok: true, action: callback.action, content });
      return;
    }

    const result = await pipelineService.reject(callback.contentId, callback.user ?? "telegram", true);
    res.json({ ok: true, action: callback.action, result });
  })
);

export default router;
