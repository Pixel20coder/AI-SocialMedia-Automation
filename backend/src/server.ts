import { createApp } from "./app";
import { connectDb } from "./config/db";
import { env } from "./config/env";
import { startScheduler } from "./jobs/scheduler";
import { seedDemoData } from "./services/demoSeed";
import { startQueueWorkers } from "./services/queueService";
import { logger } from "./utils/logger";
import { ensureMediaDirs } from "./utils/media";

async function main() {
  await ensureMediaDirs();
  await connectDb();
  if (env.seedOnStart || env.useMemoryDb) {
    await seedDemoData();
  }
  startQueueWorkers();
  const app = createApp();

  app.listen(env.port, () => {
    logger.info({ port: env.port }, "Backend listening");
    startScheduler();
  });
}

main().catch((error) => {
  logger.error({ error }, "Failed to start server");
  process.exit(1);
});
