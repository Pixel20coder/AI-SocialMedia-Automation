import { Router } from "express";
import { Account } from "../models/Account";
import { AnalyticsSnapshot } from "../models/AnalyticsSnapshot";
import { ContentItem } from "../models/ContentItem";
import { HookTemplate } from "../models/HookTemplate";
import { JobStatus } from "../models/JobStatus";
import { LogEntry } from "../models/LogEntry";
import { asyncHandler } from "./asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [accounts, content, hooks, jobs, logs] = await Promise.all([
      Account.find().sort({ createdAt: 1 }).lean(),
      ContentItem.find().populate("accountId").sort({ createdAt: -1 }).limit(60).lean(),
      HookTemplate.find().sort({ score: -1, usageCount: -1 }).limit(20).lean(),
      JobStatus.find().sort({ createdAt: -1 }).limit(30).lean(),
      LogEntry.find().sort({ createdAt: -1 }).limit(50).lean()
    ]);

    const analytics = await Promise.all(
      accounts.map(async (account) => {
        const latest = await AnalyticsSnapshot.findOne({ accountId: account._id }).sort({ createdAt: -1 }).lean();
        return [account._id.toString(), latest] as const;
      })
    );

    res.json({
      accounts,
      content,
      hooks,
      jobs,
      logs,
      analytics: Object.fromEntries(analytics),
      pendingApprovals: content.filter((item) => item.status === "pending_approval"),
      queue: content.filter((item) => item.status !== "posted")
    });
  })
);

export default router;
