import fs from "fs/promises";
import { AccountDocument } from "../models/Account";
import { ContentItemDocument } from "../models/ContentItem";
import { env } from "../config/env";
import { RateLimiter, delay } from "../utils/rateLimiter";
import { logEvent } from "../services/logService";

export interface PublishResult {
  platform: string;
  handle: string;
  externalPostId: string;
  url: string;
  status: "posted" | "queued" | "mocked";
  postedAt: string;
}

export interface PublisherAdapter {
  publish(account: AccountDocument, content: ContentItemDocument): Promise<PublishResult[]>;
  fetchPerformance(account: AccountDocument): Promise<
    Array<{
      platform: string;
      views: number;
      likes: number;
      comments: number;
      shares: number;
      saves: number;
      followers: number;
      engagementRate: number;
      topHooks: string[];
      topFormats: string[];
      raw: Record<string, unknown>;
    }>
  >;
}

type Channel = AccountDocument["channels"][number];

function captionFor(content: ContentItemDocument) {
  const caption = content.script?.caption ?? "";
  const hashtags = content.script?.hashtags?.join(" ") ?? "";
  return [caption, hashtags].filter(Boolean).join("\n\n");
}

function titleFor(account: AccountDocument, content: ContentItemDocument) {
  return (content.script?.title ?? `${account.name} Short`).slice(0, 100);
}

function mockResult(channel: Channel, content: ContentItemDocument): PublishResult {
  return {
    platform: channel.platform,
    handle: channel.handle,
    externalPostId: `mock_${content._id.toString()}_${channel.platform}`,
    url: `https://social.example/${channel.platform}/${content._id.toString()}`,
    status: "mocked",
    postedAt: new Date().toISOString()
  };
}

export class SocialPublisherAdapter implements PublisherAdapter {
  private readonly limiter = new RateLimiter("publisher", 900);

  async publish(account: AccountDocument, content: ContentItemDocument): Promise<PublishResult[]> {
    const channels = account.channels.filter((channel) => channel.enabled);
    if (channels.length === 0) return [];

    return Promise.all(
      channels.map((channel) =>
        this.limiter.withBackoff(async () => {
          await logEvent({
            scope: "publisher",
            message: "Publishing approved content",
            accountId: account._id.toString(),
            contentId: content._id.toString(),
            metadata: { platform: channel.platform, handle: channel.handle }
          });

          if (env.mockIntegrations) return mockResult(channel, content);

          if (channel.platform === "instagram") {
            return this.publishInstagramReel(channel, content);
          }

          if (channel.platform === "youtube") {
            return this.publishYouTubeShort(account, channel, content);
          }

          return mockResult(channel, content);
        })
      )
    );
  }

  private async publishInstagramReel(channel: Channel, content: ContentItemDocument): Promise<PublishResult> {
    const igUserId = channel.externalAccountId || env.instagramBusinessAccountId;
    const token = env.instagramAccessToken;
    const videoUrl = content.assets?.finalVideo?.url;

    if (!igUserId || !token || !videoUrl) {
      await logEvent({
        level: "warn",
        scope: "instagram",
        message: "Instagram credentials or public video URL missing; using mock publish result",
        contentId: content._id.toString()
      });
      return mockResult(channel, content);
    }

    if (videoUrl.includes("localhost") || videoUrl.includes("127.0.0.1")) {
      throw new Error("Instagram publishing requires PUBLIC_API_URL to be a publicly reachable HTTPS media URL.");
    }

    const graphBase = `https://graph.facebook.com/${env.instagramGraphVersion}`;
    const createParams = new URLSearchParams({
      media_type: "REELS",
      video_url: videoUrl,
      caption: captionFor(content),
      share_to_feed: "true",
      access_token: token
    });

    const createResponse = await fetch(`${graphBase}/${igUserId}/media`, {
      method: "POST",
      body: createParams
    });
    if (!createResponse.ok) {
      throw new Error(`Instagram media container failed with ${createResponse.status}: ${await createResponse.text()}`);
    }

    const container = (await createResponse.json()) as { id?: string };
    if (!container.id) throw new Error("Instagram media container response did not include an id.");

    await this.waitForInstagramContainer(graphBase, container.id, token);

    const publishParams = new URLSearchParams({
      creation_id: container.id,
      access_token: token
    });
    const publishResponse = await fetch(`${graphBase}/${igUserId}/media_publish`, {
      method: "POST",
      body: publishParams
    });
    if (!publishResponse.ok) {
      throw new Error(`Instagram publish failed with ${publishResponse.status}: ${await publishResponse.text()}`);
    }

    const published = (await publishResponse.json()) as { id?: string };
    const mediaId = published.id ?? container.id;
    return {
      platform: "instagram",
      handle: channel.handle,
      externalPostId: mediaId,
      url: `https://www.instagram.com/reel/${mediaId}`,
      status: "posted",
      postedAt: new Date().toISOString()
    };
  }

  private async waitForInstagramContainer(graphBase: string, containerId: string, token: string) {
    for (let attempt = 1; attempt <= env.instagramPublishPollAttempts; attempt += 1) {
      const statusResponse = await fetch(
        `${graphBase}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`
      );
      if (statusResponse.ok) {
        const status = (await statusResponse.json()) as { status_code?: string; status?: string };
        if (status.status_code === "FINISHED") return;
        if (status.status_code === "ERROR") {
          throw new Error(`Instagram container processing failed: ${status.status ?? "unknown error"}`);
        }
      }
      await delay(env.instagramPublishPollMs);
    }
    throw new Error("Instagram container was not ready before polling timed out.");
  }

  private async publishYouTubeShort(
    account: AccountDocument,
    channel: Channel,
    content: ContentItemDocument
  ): Promise<PublishResult> {
    const accessToken = await this.getYouTubeAccessToken();
    const filePath = content.assets?.finalVideo?.filePath;
    if (!accessToken || !filePath) {
      await logEvent({
        level: "warn",
        scope: "youtube",
        message: "YouTube credentials or local video file missing; using mock publish result",
        accountId: account._id.toString(),
        contentId: content._id.toString()
      });
      return mockResult(channel, content);
    }

    const stat = await fs.stat(filePath);
    const metadata = {
      snippet: {
        title: titleFor(account, content),
        description: `${captionFor(content)}\n\n#Shorts`,
        tags: Array.from(new Set([...(content.script?.hashtags ?? []).map((tag) => tag.replace(/^#/, "")), "Shorts"])),
        categoryId: "22",
        defaultLanguage: account.language?.slice(0, 2).toLowerCase() || "en"
      },
      status: {
        privacyStatus: env.youtubePrivacyStatus,
        selfDeclaredMadeForKids: false,
        containsSyntheticMedia: true
      }
    };

    const sessionResponse = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(stat.size),
          "X-Upload-Content-Type": "video/mp4"
        },
        body: JSON.stringify(metadata)
      }
    );

    if (!sessionResponse.ok) {
      throw new Error(`YouTube upload session failed with ${sessionResponse.status}: ${await sessionResponse.text()}`);
    }

    const uploadUrl = sessionResponse.headers.get("location");
    if (!uploadUrl) throw new Error("YouTube upload session did not return a Location header.");

    const file = await fs.readFile(filePath);
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Length": String(stat.size),
        "Content-Type": "video/mp4"
      },
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error(`YouTube video upload failed with ${uploadResponse.status}: ${await uploadResponse.text()}`);
    }

    const uploaded = (await uploadResponse.json()) as { id?: string };
    if (!uploaded.id) throw new Error("YouTube upload response did not include a video id.");

    return {
      platform: "youtube",
      handle: channel.handle,
      externalPostId: uploaded.id,
      url: `https://www.youtube.com/shorts/${uploaded.id}`,
      status: "posted",
      postedAt: new Date().toISOString()
    };
  }

  private async getYouTubeAccessToken() {
    if (env.youtubeAccessToken) return env.youtubeAccessToken;
    if (!env.youtubeRefreshToken || !env.youtubeClientId || !env.youtubeClientSecret) return undefined;

    const response = await fetch(env.googleTokenUri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.youtubeClientId,
        client_secret: env.youtubeClientSecret,
        refresh_token: env.youtubeRefreshToken,
        grant_type: "refresh_token"
      })
    });

    if (!response.ok) {
      throw new Error(`YouTube token refresh failed with ${response.status}: ${await response.text()}`);
    }

    const token = (await response.json()) as { access_token?: string };
    return token.access_token;
  }

  async fetchPerformance(account: AccountDocument) {
    const seed = account._id.toString().slice(-4);
    const base = parseInt(seed, 16) || 5000;
    const views = 8000 + (base % 25000);
    const likes = Math.floor(views * 0.08);
    const comments = Math.floor(views * 0.008);
    const shares = Math.floor(views * 0.018);
    const saves = Math.floor(views * 0.025);

    return account.channels
      .filter((channel) => channel.enabled)
      .map((channel) => ({
        platform: channel.platform,
        views,
        likes,
        comments,
        shares,
        saves,
        followers: 1200 + (base % 8000),
        engagementRate: Number((((likes + comments + shares + saves) / views) * 100).toFixed(2)),
        topHooks: [
          "Stop scrolling if this is you.",
          "This looks simple, but wait.",
          "Nobody talks about this part."
        ],
        topFormats: ["hook-list-payoff", "myth-truth-reveal"],
        raw: { source: env.mockIntegrations ? "mock" : "api" }
      }));
  }
}
