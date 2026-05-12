# AI-Powered Multi-Agent Social Media Automation

Deployable Express + MongoDB + Redis + React system for generating hook-first short-form videos, asking for Telegram/dashboard approval, and publishing only after approval.

## What is included

- Multi-agent backend: CEO, Analytics, Content, Video, Voice, Editor, Publisher, Feedback.
- Viral content engine: extracts hooks, captions, formats, and stores reusable hook templates.
- Required script structure: `0-3 sec` hook, `3-10 sec` content, `10-20 sec` payoff.
- Telegram approval flow: approve, reject/regenerate, or edit in dashboard.
- Multi-account support: Motivation, Culture/Saree, Facts seeded by default.
- React dashboard: accounts, metrics, approvals, generated queue, job queue status, logs, hook templates.
- Real WebGL landing page using `@react-three/fiber`, `@react-three/drei`, and Framer Motion.
- MongoDB persistence for accounts, hooks, content, analytics, approvals, jobs, logs, and publish results.
- BullMQ + Redis queues for content generation, video processing, publishing, and analytics.
- Cron automation: daily generation and hourly analytics collection.
- Production provider adapters for Groq, OpenAI, Kimi/Moonshot, ElevenLabs, external video APIs, Instagram Reels, and YouTube Shorts.

## Folder Structure

```text
backend/
  src/agents/              Agent classes
  src/integrations/        AI, video, voice, Telegram, social adapters
  src/models/              MongoDB models
  src/routes/              REST API routes
  src/services/            Pipeline, queue orchestration, logging
  src/utils/rateLimiter.ts Provider request queueing and 429 backoff
  src/jobs/                Cron scheduler
  storage/                 Generated media
frontend/
  src/App.tsx              Routes for 3D landing + dashboard
  src/components/Scene3D.tsx Real WebGL scene
  src/components/LandingPage.tsx Landing UI overlay
  src/api.ts               REST client
  src/styles/app.css       Dashboard styling
```

## Quick Start

```bash
cp .env.example .env
npm install
npm run seed
npm run dev
```

Backend: `http://localhost:4000/api/health`

Dashboard: `http://localhost:5173`

MongoDB must be running locally unless you set `MONGODB_URI` to a hosted database.

Redis must be running locally when `QUEUE_DRIVER=bullmq`. Use `QUEUE_DRIVER=inline` only for local demos without Redis.

For a no-install local demo, run the backend with in-memory MongoDB:

```bash
USE_MEMORY_DB=true SEED_ON_START=true QUEUE_DRIVER=inline npm run dev --workspace backend
npm run dev --workspace frontend
```

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:4000`. The Docker image serves the built React app from the Express server.

## Core APIs

- `GET /api/dashboard` - dashboard payload
- `GET /api/accounts` - list accounts
- `GET /api/jobs` - job status records
- `GET /api/jobs/summary` - queue status counts
- `GET /api/logs` - persisted operational logs
- `POST /api/content/generate` - generate for all accounts or one `{ "accountId": "..." }`
- `POST /api/approvals/:id/approve` - approve and enqueue publishing
- `POST /api/approvals/:id/reject` - reject and optionally regenerate
- `POST /api/approvals/:id/edit` - regenerate with feedback
- `POST /api/analytics/collect` - enqueue performance collection
- `POST /api/webhooks/telegram` - Telegram callback webhook

## Queue System

Queues are defined in `backend/src/services/queueService.ts`:

- `content-generation-queue`
- `video-processing-queue`
- `publishing-queue`
- `analytics-queue`

Each job is retryable with exponential backoff. Job status is stored in MongoDB through `JobStatus`, and failures are persisted through `LogEntry`.

## Approval Flow

1. Cron or API enqueues content generation.
2. Analytics Agent analyzes trends through Groq.
3. Content Agent creates hook-first script through OpenAI GPT.
4. Voice Agent creates narration through ElevenLabs.
5. Video processing queue calls the video API and combines assets with FFmpeg.
6. CEO Agent reviews safety and quality.
7. Telegram/dashboard approval is requested.
8. Approval enqueues publishing.
9. Publisher Agent posts only after approval.

## Connecting Real Providers

Set `MOCK_INTEGRATIONS=false`, then provide:

```env
GROQ_API_KEY=...
OPENAI_API_KEY=...
AI_CONTENT_PROVIDER=auto
KIMI_API_KEY=...
KIMI_MODEL=kimi-k2-0905-preview
ELEVENLABS_API_KEY=...
VIDEO_API_PROVIDER=runway
VIDEO_API_KEY=...
VIDEO_API_URL=https://your-video-adapter.example/generate
REDIS_URL=redis://localhost:6379
QUEUE_DRIVER=bullmq
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

`AI_CONTENT_PROVIDER=auto` uses Kimi when `KIMI_API_KEY` is present, otherwise OpenAI. Set `AI_CONTENT_PROVIDER=openai` or `AI_CONTENT_PROVIDER=kimi` to force one provider.

## Instagram and YouTube Automation

Publishing still happens only after dashboard or Telegram approval.

Instagram Reels requires:

```env
MOCK_INTEGRATIONS=false
PUBLIC_API_URL=https://your-public-api-domain.com
INSTAGRAM_ACCESS_TOKEN=...
INSTAGRAM_BUSINESS_ACCOUNT_ID=...
```

The generated video URL must be publicly reachable over HTTPS. Localhost media URLs cannot be uploaded to Instagram.

YouTube Shorts requires either a short-lived access token:

```env
YOUTUBE_ACCESS_TOKEN=...
YOUTUBE_PRIVACY_STATUS=private
```

or refresh-token credentials:

```env
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REFRESH_TOKEN=...
YOUTUBE_PRIVACY_STATUS=private
```

YouTube uploads use `videos.insert` with resumable upload. Newly created or unaudited Google API projects may force uploads to private visibility.

For Telegram, point your bot webhook to:

```text
https://your-domain.com/api/webhooks/telegram
```

The social publisher is intentionally mocked until platform-specific account review and upload permissions are configured.
