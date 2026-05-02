import cron from "node-cron";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { pipelineService } from "../services/pipelineService";
import { queueService } from "../services/queueService";

export function startScheduler() {
  if (!env.enableCron) {
    logger.info("Cron scheduler disabled");
    return;
  }

  cron.schedule(env.contentCron, async () => {
    logger.info({ cron: env.contentCron }, "Daily content generation started");
    await pipelineService.generateForAllEnabled();
  });

  cron.schedule(env.analyticsCron, async () => {
    logger.info({ cron: env.analyticsCron }, "Feedback analytics collection started");
    await queueService.enqueueAnalytics();
  });

  logger.info({ contentCron: env.contentCron, analyticsCron: env.analyticsCron }, "Cron scheduler started");
}
