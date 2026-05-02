import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import fs from "fs";
import path from "path";
import { env } from "./config/env";
import accountsRouter from "./routes/accounts";
import analyticsRouter from "./routes/analytics";
import approvalsRouter from "./routes/approvals";
import contentRouter from "./routes/content";
import dashboardRouter from "./routes/dashboard";
import hooksRouter from "./routes/hooks";
import jobsRouter from "./routes/jobs";
import logsRouter from "./routes/logs";
import publishRouter from "./routes/publish";
import webhooksRouter from "./routes/webhooks";

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: env.frontendUrl, credentials: true }));
  app.use(express.json({ limit: "5mb" }));
  app.use("/media", express.static(path.resolve(env.mediaRoot)));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "ai-social-automation-backend", time: new Date().toISOString() });
  });

  app.use("/api/accounts", accountsRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/approvals", approvalsRouter);
  app.use("/api/content", contentRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/hooks", hooksRouter);
  app.use("/api/jobs", jobsRouter);
  app.use("/api/logs", logsRouter);
  app.use("/api/publish", publishRouter);
  app.use("/api/webhooks", webhooksRouter);

  const frontendDist = path.resolve(process.cwd(), "../frontend/dist");
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/media")) {
        next();
        return;
      }
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  }

  app.use((error: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = error.statusCode ?? 500;
    res.status(status).json({
      error: error.message ?? "Internal server error",
      status
    });
  });

  return app;
}
