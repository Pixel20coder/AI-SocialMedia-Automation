import pino from "pino";
import { env } from "../config/env";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    env.nodeEnv === "production"
      ? undefined
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
            singleLine: true
          }
        }
});
