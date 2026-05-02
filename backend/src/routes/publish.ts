import { Router } from "express";
import { pipelineService } from "../services/pipelineService";
import { asyncHandler } from "./asyncHandler";

const router = Router();

router.post(
  "/:id",
  asyncHandler(async (req, res) => {
    const content = await pipelineService.publish(String(req.params.id));
    res.json(content);
  })
);

export default router;
