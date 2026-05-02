import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config();

const bool = (value: string | undefined, fallback = false) => {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: num(process.env.PORT, 4000),
  publicApiUrl: process.env.PUBLIC_API_URL ?? "http://localhost:4000",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/social_automation",
  useMemoryDb: bool(process.env.USE_MEMORY_DB, false),
  seedOnStart: bool(process.env.SEED_ON_START, false),
  mediaRoot: process.env.MEDIA_ROOT ?? path.resolve(process.cwd(), "storage"),
  redisUrl: process.env.REDIS_URL,
  queueDriver:
    process.env.QUEUE_DRIVER ??
    (process.env.REDIS_URL ? "bullmq" : "inline"),
  queueConcurrency: num(process.env.QUEUE_CONCURRENCY, 2),
  queueMaxAttempts: num(process.env.QUEUE_MAX_ATTEMPTS, 5),
  queueBackoffMs: num(process.env.QUEUE_BACKOFF_MS, 2000),
  apiMinIntervalMs: num(process.env.API_MIN_INTERVAL_MS, 450),
  apiRateLimitBaseDelayMs: num(process.env.API_RATE_LIMIT_BASE_DELAY_MS, 1500),
  logRetentionDays: num(process.env.LOG_RETENTION_DAYS, 14),

  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  openAiApiKey: process.env.OPENAI_API_KEY,
  gptModel: process.env.GPT_MODEL ?? "gpt-4.1",

  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM",

  videoApiProvider: process.env.VIDEO_API_PROVIDER ?? "mock",
  videoApiKey: process.env.VIDEO_API_KEY,
  videoApiUrl: process.env.VIDEO_API_URL,

  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,

  instagramAccessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
  youtubeClientId: process.env.YOUTUBE_CLIENT_ID,
  youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET,

  contentCron: process.env.CONTENT_CRON ?? "0 10 * * *",
  analyticsCron: process.env.ANALYTICS_CRON ?? "0 * * * *",
  enableCron: bool(process.env.ENABLE_CRON, true),
  mockIntegrations: bool(process.env.MOCK_INTEGRATIONS, true),
  maxRetries: num(process.env.PIPELINE_MAX_RETRIES, 3)
};

export type AppEnv = typeof env;
