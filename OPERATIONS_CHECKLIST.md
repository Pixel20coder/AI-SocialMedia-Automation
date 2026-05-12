# Operations Checklist

Use this checklist to provide the details needed to run the automation system for 3 YouTube channels and 3 Instagram accounts.

## 1. Platform Accounts

### YouTube Channels

Provide these for each channel:

- Channel name
- Channel ID
- Niche
- Posting timezone
- Posting time
- Daily video count
- Brand rules
- Whether videos are made for kids
- Default privacy status: `private`, `unlisted`, or `public`

Recommended channels:

1. Kids safe animated stories/facts
2. Current hype and trending explainers
3. AI tools, money skills, productivity, or evergreen facts

### Instagram Accounts

Provide these for each account:

- Instagram handle
- Instagram Business Account ID
- Niche
- Posting timezone
- Posting time
- Daily post/reel count
- Brand rules
- Whether the account is adult-glam

Recommended accounts:

1. Adult-safe glam lifestyle
2. Adult fashion/beauty/cute aesthetic
3. Viral facts, motivation, beauty/fitness, or AI lifestyle

## 2. API Credentials

Add these to the deployment environment, not to GitHub.

### AI

- `GROQ_API_KEY`
- `OPENAI_API_KEY`
- `KIMI_API_KEY`
- `ELEVENLABS_API_KEY`

Optional:

- `AI_CONTENT_PROVIDER=auto`
- `KIMI_MODEL=kimi-k2-0905-preview`
- `GPT_MODEL=gpt-4.1`

### Video Generation

- `VIDEO_API_PROVIDER`
- `VIDEO_API_URL`
- `VIDEO_API_KEY`

### Instagram

- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`
- `INSTAGRAM_GRAPH_VERSION`

Important: Instagram publishing requires `PUBLIC_API_URL` to be a public HTTPS URL. Localhost media URLs will not work.

### YouTube

Use either:

- `YOUTUBE_ACCESS_TOKEN`

Or refresh-token credentials:

- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`

Also set:

- `YOUTUBE_PRIVACY_STATUS=private`

## 3. Infrastructure

Provide or create:

- MongoDB connection string
- Redis connection string
- Public backend URL
- Deployment target: Render, Railway, VPS, or other
- Storage strategy for generated videos
- Telegram bot token
- Telegram approval chat ID

Required environment variables:

- `MONGODB_URI`
- `REDIS_URL`
- `QUEUE_DRIVER=bullmq`
- `PUBLIC_API_URL`
- `FRONTEND_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

## 4. Safety Rules

### YouTube Kids

- Mark videos correctly as made for kids when applicable.
- Avoid unsafe challenges, scary content, adult themes, personal data prompts, or manipulative content.
- Keep visuals and language age-appropriate.

### Instagram Adult-Glam

Allowed:

- Adult 18+ models only
- Premium fashion, beauty, fitness, bikini, swimwear, lingerie, lifestyle
- Attractive, polished, tasteful visuals
- Platform-safe glamour captions

Blocked:

- Full nudity
- Visible genitals or visible nipples
- Explicit sexual acts
- See-through nudity
- Sexual body-part close-ups
- Minor-coded themes such as teen, schoolgirl, barely legal, young girl
- Sexual solicitation such as DM for private, nudes, uncensored, explicit link-in-bio promises
- Real-person deepfakes or non-consensual likenesses

## 5. Reporting Preferences

Tell me what you want in the daily report:

- Delivery time
- Telegram, email, dashboard-only, or all
- Per-account summary
- Posted content links
- Pending approvals
- Failed jobs
- Safety blocks and reasons
- Views, likes, comments, shares, saves
- Best performing hooks
- Recommendations for tomorrow

Default report format:

```text
Daily Automation Report

YouTube
- Channel:
- Posted:
- Pending:
- Failed:
- Top video:
- Notes:

Instagram
- Account:
- Posted:
- Pending:
- Failed:
- Top post/reel:
- Notes:

Safety
- Blocked items:
- Reasons:

Tomorrow
- Suggested topics:
- Hook templates:
```

## 6. Approval Mode

Choose one:

- `manual`: Telegram approval required before every post
- `semi-auto`: auto-post only if safety score is high, otherwise request approval
- `auto`: auto-post after safety checks pass

Recommended starting mode: `manual`.

## 7. Next Implementation Tasks

- Add account onboarding API and dashboard form
- Add daily report job
- Add account-level posting schedules
- Add topic planner for six accounts
- Add stronger safety scoring in dashboard
- Add provider health checks
- Add YouTube made-for-kids metadata controls
- Add Instagram account risk status tracking
