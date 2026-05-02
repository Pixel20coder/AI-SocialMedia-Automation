import { Job, Queue, QueueEvents, Worker } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";
import { JobStatus } from "../models/JobStatus";
import { logEvent } from "./logService";
import { delay } from "../utils/rateLimiter";

export const queueNames = {
  contentGeneration: "content-generation-queue",
  videoProcessing: "video-processing-queue",
  publishing: "publishing-queue",
  analytics: "analytics-queue"
} as const;

export type QueueName = (typeof queueNames)[keyof typeof queueNames];

type ContentGenerationPayload = { accountId: string; feedback?: string };
type VideoProcessingPayload = { contentId: string };
type PublishingPayload = { contentId: string };
type AnalyticsPayload = { accountId?: string };
type QueuePayload = ContentGenerationPayload | VideoProcessingPayload | PublishingPayload | AnalyticsPayload;

const queueConfig = {
  attempts: env.queueMaxAttempts,
  backoff: {
    type: "exponential" as const,
    delay: env.queueBackoffMs
  },
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 86400, count: 1000 }
};

let redisConnection: IORedis | undefined;
let queues: Record<QueueName, Queue> | undefined;
let workersStarted = false;
const workers: Worker[] = [];
const queueEvents: QueueEvents[] = [];

function useBullMq() {
  return env.queueDriver === "bullmq" && Boolean(env.redisUrl);
}

function getConnection() {
  if (!redisConnection) {
    redisConnection = new IORedis(env.redisUrl!, {
      maxRetriesPerRequest: null
    });
  }
  return redisConnection;
}

function getQueues() {
  if (!queues) {
    const connection = getConnection();
    queues = {
      [queueNames.contentGeneration]: new Queue(queueNames.contentGeneration, { connection }),
      [queueNames.videoProcessing]: new Queue(queueNames.videoProcessing, { connection }),
      [queueNames.publishing]: new Queue(queueNames.publishing, { connection }),
      [queueNames.analytics]: new Queue(queueNames.analytics, { connection })
    };
  }
  return queues;
}

async function updateJobStatus(input: {
  queueName: QueueName;
  jobId: string;
  name: string;
  status: "pending" | "waiting" | "delayed" | "running" | "completed" | "failed";
  payload?: QueuePayload;
  result?: Record<string, unknown>;
  error?: string;
  attemptsMade?: number;
  maxAttempts?: number;
  accountId?: string;
  contentId?: string;
  resultUrls?: string[];
}) {
  await JobStatus.updateOne(
    { queueName: input.queueName, jobId: input.jobId },
    {
      $set: {
        queueName: input.queueName,
        jobId: input.jobId,
        name: input.name,
        status: input.status,
        ...(input.payload ? { payload: input.payload } : {}),
        ...(input.result ? { result: input.result } : {}),
        ...(input.error ? { error: input.error } : {}),
        ...(input.attemptsMade !== undefined ? { attemptsMade: input.attemptsMade } : {}),
        ...(input.maxAttempts !== undefined ? { maxAttempts: input.maxAttempts } : {}),
        ...(input.accountId ? { accountId: input.accountId } : {}),
        ...(input.contentId ? { contentId: input.contentId } : {}),
        ...(input.resultUrls ? { resultUrls: input.resultUrls } : {}),
        ...(input.status === "running" ? { startedAt: new Date() } : {}),
        ...(input.status === "completed" || input.status === "failed" ? { finishedAt: new Date() } : {})
      },
      $setOnInsert: { enqueuedAt: new Date() }
    },
    { upsert: true }
  );
}

export async function markJobContent(queueName: QueueName, jobId: string, contentId: string) {
  await JobStatus.updateOne({ queueName, jobId }, { $set: { contentId } });
}

async function runProcessor(queueName: QueueName, payload: QueuePayload, jobId: string) {
  const { pipelineService } = await import("./pipelineService");

  if (queueName === queueNames.contentGeneration) {
    const data = payload as ContentGenerationPayload;
    return pipelineService.runContentGenerationJob(data.accountId, { feedback: data.feedback, jobId, queueName });
  }

  if (queueName === queueNames.videoProcessing) {
    const data = payload as VideoProcessingPayload;
    return pipelineService.runVideoProcessingJob(data.contentId, { jobId, queueName });
  }

  if (queueName === queueNames.publishing) {
    const data = payload as PublishingPayload;
    return pipelineService.runPublishingJob(data.contentId, { jobId, queueName });
  }

  const data = payload as AnalyticsPayload;
  return pipelineService.runAnalyticsJob(data.accountId, { jobId, queueName });
}

async function enqueue(queueName: QueueName, name: string, payload: QueuePayload) {
  if (useBullMq()) {
    const queue = getQueues()[queueName];
    const job = await queue.add(name, payload, queueConfig);
    await updateJobStatus({
      queueName,
      jobId: String(job.id),
      name,
      status: "pending",
      payload,
      maxAttempts: env.queueMaxAttempts,
      accountId: "accountId" in payload ? payload.accountId : undefined,
      contentId: "contentId" in payload ? payload.contentId : undefined
    });
    await logEvent({ scope: "queue", queueName, jobId: String(job.id), message: "Job enqueued" });
    return { queueName, jobId: String(job.id), name, status: "pending" };
  }

  const jobId = `inline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await updateJobStatus({
    queueName,
    jobId,
    name,
    status: "pending",
    payload,
    maxAttempts: env.queueMaxAttempts,
    accountId: "accountId" in payload ? payload.accountId : undefined,
    contentId: "contentId" in payload ? payload.contentId : undefined
  });
  void runInlineJob(queueName, name, payload, jobId);
  return { queueName, jobId, name, status: "pending" };
}

async function runInlineJob(queueName: QueueName, name: string, payload: QueuePayload, jobId: string) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= env.queueMaxAttempts; attempt += 1) {
    try {
      await updateJobStatus({
        queueName,
        jobId,
        name,
        status: "running",
        attemptsMade: attempt - 1,
        payload
      });
      await logEvent({ scope: "queue", queueName, jobId, message: "Inline job started" });
      const result = await runProcessor(queueName, payload, jobId);
      const resultUrls = collectResultUrls(result);
      await updateJobStatus({
        queueName,
        jobId,
        name,
        status: "completed",
        attemptsMade: attempt,
        payload,
        result: result as Record<string, unknown>,
        resultUrls
      });
      await logEvent({ scope: "queue", queueName, jobId, message: "Inline job completed" });
      return;
    } catch (error) {
      lastError = error;
      await updateJobStatus({
        queueName,
        jobId,
        name,
        status: attempt === env.queueMaxAttempts ? "failed" : "delayed",
        attemptsMade: attempt,
        payload,
        error: error instanceof Error ? error.message : String(error)
      });
      await logEvent({
        level: attempt === env.queueMaxAttempts ? "error" : "warn",
        scope: "queue",
        queueName,
        jobId,
        message: "Inline job attempt failed",
        metadata: { attempt, error: error instanceof Error ? error.message : String(error) }
      });
      if (attempt < env.queueMaxAttempts) await delay(env.queueBackoffMs * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

function collectResultUrls(result: unknown): string[] {
  const serialized = JSON.stringify(result);
  const matches = serialized.match(/https?:\/\/[^"',\s]+/g);
  return matches ? Array.from(new Set(matches)) : [];
}

function processorFor(queueName: QueueName) {
  return async (job: Job<QueuePayload>) => {
    const jobId = String(job.id);
    await updateJobStatus({
      queueName,
      jobId,
      name: job.name,
      status: "running",
      payload: job.data,
      attemptsMade: job.attemptsMade,
      maxAttempts: env.queueMaxAttempts,
      accountId: "accountId" in job.data ? job.data.accountId : undefined,
      contentId: "contentId" in job.data ? job.data.contentId : undefined
    });
    await logEvent({ scope: "queue", queueName, jobId, message: "Job started" });

    const result = await runProcessor(queueName, job.data, jobId);
    await updateJobStatus({
      queueName,
      jobId,
      name: job.name,
      status: "completed",
      payload: job.data,
      attemptsMade: job.attemptsMade + 1,
      result: result as Record<string, unknown>,
      resultUrls: collectResultUrls(result)
    });
    await logEvent({ scope: "queue", queueName, jobId, message: "Job completed" });
    return result;
  };
}

export function startQueueWorkers() {
  if (workersStarted) return;
  workersStarted = true;

  if (!useBullMq()) {
    void logEvent({
      scope: "queue",
      message: "Queue service running in inline mode because Redis/BullMQ is not configured"
    });
    return;
  }

  const connection = getConnection();
  for (const queueName of Object.values(queueNames)) {
    const worker = new Worker(queueName, processorFor(queueName), {
      connection,
      concurrency: env.queueConcurrency
    });
    const events = new QueueEvents(queueName, { connection });

    worker.on("failed", async (job, error) => {
      if (!job) return;
      await updateJobStatus({
        queueName,
        jobId: String(job.id),
        name: job.name,
        status: job.attemptsMade >= env.queueMaxAttempts ? "failed" : "delayed",
        payload: job.data,
        attemptsMade: job.attemptsMade,
        maxAttempts: env.queueMaxAttempts,
        error: error.message
      });
      await logEvent({
        level: "error",
        scope: "queue",
        queueName,
        jobId: String(job.id),
        message: "Job failed",
        metadata: { error: error.message, attemptsMade: job.attemptsMade }
      });
    });

    queueEvents.push(events);
    workers.push(worker);
  }

  void logEvent({ scope: "queue", message: "BullMQ workers started", metadata: { queues: Object.values(queueNames) } });
}

export const queueService = {
  enqueueContentGeneration: (accountId: string, feedback?: string) =>
    enqueue(queueNames.contentGeneration, "generate-content", { accountId, feedback }),
  enqueueVideoProcessing: (contentId: string) =>
    enqueue(queueNames.videoProcessing, "process-video", { contentId }),
  enqueuePublishing: (contentId: string) => enqueue(queueNames.publishing, "publish-content", { contentId }),
  enqueueAnalytics: (accountId?: string) => enqueue(queueNames.analytics, "collect-analytics", { accountId }),
  async listJobs(limit = 100) {
    return JobStatus.find().sort({ createdAt: -1 }).limit(limit).populate("accountId").populate("contentId");
  },
  async summary() {
    const rows = await JobStatus.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    return rows.reduce<Record<string, number>>((acc, row: { _id: string; count: number }) => {
      acc[row._id] = row.count;
      return acc;
    }, {});
  }
};
