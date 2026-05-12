import { Account } from "../models/Account";
import { ContentItem } from "../models/ContentItem";
import { ContentStatus, PipelineStage } from "../types";
import { env } from "../config/env";
import { withRetry } from "../utils/retry";
import { logger } from "../utils/logger";
import { agents } from "./agentRegistry";
import { logEvent } from "./logService";
import { markJobContent, queueNames, queueService, QueueName } from "./queueService";
import { GeneratedAsset, TrendInsight, ViralScript } from "../types";
import { contentSafetyService } from "./contentSafetyService";

function notFound(label: string): never {
  throw Object.assign(new Error(`${label} not found`), { statusCode: 404 });
}

async function setStage(contentId: string, stage: PipelineStage, status?: ContentStatus) {
  await ContentItem.updateOne(
    { _id: contentId },
    {
      $set: {
        pipelineStage: stage,
        ...(status ? { status } : {})
      }
    }
  );
}

export class PipelineService {
  async generateForAccount(accountId: string, options: { feedback?: string } = {}) {
    return queueService.enqueueContentGeneration(accountId, options.feedback);
  }

  async runContentGenerationJob(
    accountId: string,
    options: { feedback?: string; jobId?: string; queueName?: QueueName } = {}
  ) {
    const account = await Account.findById(accountId);
    if (!account) notFound("Account");

    const content = await ContentItem.create({
      accountId: account._id,
      status: "generating",
      pipelineStage: "analytics",
      approval: options.feedback ? { feedback: options.feedback } : undefined
    });

    if (options.jobId && options.queueName) {
      await markJobContent(options.queueName, options.jobId, content._id.toString());
    }

    try {
      await logEvent({
        scope: "pipeline",
        queueName: options.queueName,
        jobId: options.jobId,
        accountId,
        contentId: content._id.toString(),
        message: "Content generation job started"
      });

      const trendInsight = await withRetry(() => agents.analytics.analyze(account), {
        retries: env.maxRetries,
        label: "analytics-agent"
      });
      content.trendInsight = trendInsight;
      content.pipelineStage = "content";
      await content.save();

      const script = await withRetry(() => agents.content.createScript(account, trendInsight, options.feedback), {
        retries: env.maxRetries,
        label: "content-agent"
      });
      content.set("script", script);
      content.pipelineStage = "voice";
      await content.save();

      await contentSafetyService.assertContentAllowed(account, content);

      const voice = await withRetry(() => agents.voice.createVoice(script, content._id.toString()), {
        retries: env.maxRetries,
        label: "voice-agent"
      });
      content.set("assets.voice", voice);
      content.pipelineStage = "video";
      await content.save();

      const videoJob = await queueService.enqueueVideoProcessing(content._id.toString());
      await logEvent({
        scope: "pipeline",
        queueName: options.queueName,
        jobId: options.jobId,
        accountId,
        contentId: content._id.toString(),
        message: "Content generation job completed; video processing queued",
        metadata: { videoJob }
      });

      return {
        contentId: content._id.toString(),
        status: content.status,
        nextJob: videoJob
      };
    } catch (error) {
      logger.error({ error, contentId: content._id.toString() }, "Content generation failed");
      content.status = "failed";
      content.failureReason = error instanceof Error ? error.message : "Unknown content generation failure";
      content.retryCount += 1;
      await content.save();
      await logEvent({
        level: "error",
        scope: "pipeline",
        queueName: options.queueName,
        jobId: options.jobId,
        accountId,
        contentId: content._id.toString(),
        message: "Content generation job failed",
        metadata: { error: content.failureReason }
      });
      throw error;
    }
  }

  async runVideoProcessingJob(contentId: string, options: { jobId?: string; queueName?: QueueName } = {}) {
    const content = await ContentItem.findById(contentId);
    if (!content) notFound("Content");
    const account = await Account.findById(content.accountId);
    if (!account) notFound("Account");

    if (!content.script) {
      throw new Error("Content script missing; cannot process video");
    }

    try {
      content.status = "generating";
      content.pipelineStage = "video";
      await content.save();
      await logEvent({
        scope: "pipeline",
        queueName: options.queueName ?? queueNames.videoProcessing,
        jobId: options.jobId,
        accountId: account._id.toString(),
        contentId,
        message: "Video processing job started"
      });

      const script = content.script as ViralScript;
      const voice = content.assets?.voice as GeneratedAsset | undefined;
      if (!voice) throw new Error("Voice asset missing; cannot process video");

      const visuals = await withRetry(() => agents.video.createVisuals(account, script, content._id.toString()), {
        retries: env.maxRetries,
        label: "video-agent"
      });
      content.set("assets.visuals", visuals);
      content.pipelineStage = "editing";
      await content.save();

      const edited = await withRetry(() => agents.editor.assemble(script, voice, visuals, content._id.toString()), {
        retries: env.maxRetries,
        label: "editor-agent"
      });
      content.set("assets.finalVideo", edited.finalVideo);
      content.set("assets.subtitles", edited.subtitles);
      content.pipelineStage = "ceo_review";
      await content.save();

      const trendInsight = content.trendInsight as TrendInsight;
      await contentSafetyService.assertContentAllowed(account, content);

      const decision = await withRetry(() => agents.ceo.review(account, script, trendInsight), {
        retries: env.maxRetries,
        label: "ceo-agent"
      });
      content.ceoDecision = decision;

      // The CEO Agent can stop risky drafts before they reach the human approval queue.
      if (!decision.approvedForUserReview) {
        content.status = "failed";
        content.failureReason = `CEO Agent blocked approval request: ${decision.notes}`;
        await content.save();
        return { contentId, status: content.status, failureReason: content.failureReason };
      }

      content.status = "pending_approval";
      content.pipelineStage = "approval";
      content.set("approval.requestedAt", new Date());
      await content.save();

      // No publishing happens here. The pipeline pauses until Telegram or dashboard approval.
      await withRetry(() => agents.ceo.requestHumanApproval(account, content), {
        retries: env.maxRetries,
        label: "telegram-approval"
      });

      return {
        contentId,
        status: content.status,
        finalVideoUrl: content.assets?.finalVideo?.url,
        subtitleUrl: content.assets?.subtitles?.url
      };
    } catch (error) {
      logger.error({ error, contentId: content._id.toString() }, "Video processing failed");
      content.status = "generating";
      content.failureReason = error instanceof Error ? error.message : "Unknown video processing failure";
      content.retryCount += 1;
      await content.save();
      await logEvent({
        level: "error",
        scope: "pipeline",
        queueName: options.queueName ?? queueNames.videoProcessing,
        jobId: options.jobId,
        accountId: account._id.toString(),
        contentId,
        message: "Video processing job failed",
        metadata: { error: content.failureReason }
      });
      throw error;
    }
  }

  async generateForAllEnabled() {
    const accounts = await Account.find({ enabled: true });
    const generated = [];

    for (const account of accounts) {
      for (let index = 0; index < account.dailyQuota; index += 1) {
        generated.push(await this.generateForAccount(account._id.toString()));
      }
    }

    return generated;
  }

  async approve(contentId: string, actor = "user") {
    const content = await ContentItem.findById(contentId);
    if (!content) notFound("Content");
    content.status = "approved";
    content.set("approval.decidedAt", new Date());
    content.set("approval.decidedBy", actor);
    await content.save();
    const job = await queueService.enqueuePublishing(contentId);
    await logEvent({ scope: "approval", contentId, message: "Content approved; publishing queued", metadata: { actor, job } });
    return { content, job };
  }

  async reject(contentId: string, actor = "user", regenerate = true) {
    const content = await ContentItem.findById(contentId);
    if (!content) notFound("Content");
    content.status = "rejected";
    content.set("approval.decidedAt", new Date());
    content.set("approval.decidedBy", actor);
    await content.save();

    if (!regenerate) return { rejected: content, regenerated: undefined };

    const regenerated = await this.generateForAccount(content.accountId.toString(), {
      feedback: "Previous draft was rejected. Change the angle, hook, and payoff."
    });

    return { rejected: content, regenerated };
  }

  async revise(contentId: string, feedback: string, actor = "user") {
    const content = await ContentItem.findById(contentId);
    if (!content) notFound("Content");
    content.status = "needs_revision";
    content.set("approval.decidedAt", new Date());
    content.set("approval.decidedBy", actor);
    content.set("approval.feedback", feedback);
    await content.save();

    return this.generateForAccount(content.accountId.toString(), { feedback });
  }

  async publish(contentId: string) {
    return queueService.enqueuePublishing(contentId);
  }

  async runPublishingJob(contentId: string, options: { jobId?: string; queueName?: QueueName } = {}) {
    const content = await ContentItem.findById(contentId);
    if (!content) notFound("Content");
    const account = await Account.findById(content.accountId);
    if (!account) notFound("Account");

    if (!["approved", "publishing", "failed"].includes(content.status)) {
      throw Object.assign(new Error("Content must be approved before publishing"), { statusCode: 409 });
    }

    try {
      await contentSafetyService.assertContentAllowed(account, content);
      await setStage(contentId, "publishing", "publishing");
      await logEvent({
        scope: "pipeline",
        queueName: options.queueName ?? queueNames.publishing,
        jobId: options.jobId,
        accountId: account._id.toString(),
        contentId,
        message: "Publishing job started"
      });
      const results = await withRetry(() => agents.publisher.publish(account, content), {
        retries: env.maxRetries,
        label: "publisher-agent"
      });

      content.status = "posted";
      content.pipelineStage = "complete";
      content.publishResults = results;
      await content.save();
      return { contentId, status: content.status, publishResults: results };
    } catch (error) {
      content.status = "approved";
      content.failureReason = error instanceof Error ? error.message : "Unknown publishing failure";
      await content.save();
      await logEvent({
        level: "error",
        scope: "pipeline",
        queueName: options.queueName ?? queueNames.publishing,
        jobId: options.jobId,
        accountId: account._id.toString(),
        contentId,
        message: "Publishing job failed; content left approved for retry",
        metadata: { error: content.failureReason }
      });
      throw error;
    }
  }

  async collectFeedback() {
    return queueService.enqueueAnalytics();
  }

  async runAnalyticsJob(accountId?: string, options: { jobId?: string; queueName?: QueueName } = {}) {
    await logEvent({
      scope: "pipeline",
      queueName: options.queueName ?? queueNames.analytics,
      jobId: options.jobId,
      accountId,
      message: "Analytics job started"
    });

    if (accountId) {
      const account = await Account.findById(accountId);
      if (!account) notFound("Account");
      const snapshots = await agents.feedback.collectForAccount(account);
      return { accountId, snapshots: snapshots.length };
    }

    const snapshots = await agents.feedback.collectForAllEnabled();
    return { snapshots: snapshots.length };
  }
}

export const pipelineService = new PipelineService();
