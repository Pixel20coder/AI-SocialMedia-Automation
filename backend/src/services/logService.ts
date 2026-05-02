import { LogEntry } from "../models/LogEntry";
import { logger } from "../utils/logger";

type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEventInput {
  level?: LogLevel;
  scope: string;
  message: string;
  jobId?: string;
  queueName?: string;
  accountId?: string;
  contentId?: string;
  metadata?: Record<string, unknown>;
}

export async function logEvent(input: LogEventInput) {
  const level = input.level ?? "info";
  logger[level](
    {
      scope: input.scope,
      jobId: input.jobId,
      queueName: input.queueName,
      accountId: input.accountId,
      contentId: input.contentId,
      metadata: input.metadata
    },
    input.message
  );

  try {
    await LogEntry.create({
      level,
      scope: input.scope,
      message: input.message,
      jobId: input.jobId,
      queueName: input.queueName,
      accountId: input.accountId,
      contentId: input.contentId,
      metadata: input.metadata
    });
  } catch (error) {
    logger.warn({ error }, "Failed to persist log entry");
  }
}
