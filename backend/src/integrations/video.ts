import fs from "fs/promises";
import { env } from "../config/env";
import { AccountDocument } from "../models/Account";
import { GeneratedAsset, ViralScript } from "../types";
import { mediaPath, publicMediaUrl, safeFilePart } from "../utils/media";
import { RateLimiter, fetchWithRateLimit } from "../utils/rateLimiter";
import { runFfmpeg } from "./media/ffmpeg";
import { logEvent } from "../services/logService";

export class VideoApiAdapter {
  private readonly limiter = new RateLimiter("video-api", 1200);

  async generateVisuals(account: AccountDocument, script: ViralScript, contentId: string): Promise<GeneratedAsset> {
    if (env.videoApiKey && env.videoApiUrl && env.videoApiProvider !== "mock" && !env.mockIntegrations) {
      await logEvent({
        scope: "video-api",
        message: "Calling external video generation API",
        accountId: account._id.toString(),
        contentId
      });
      const response = await fetchWithRateLimit(
        this.limiter,
        env.videoApiUrl,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.videoApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            provider: env.videoApiProvider,
            prompt: script.visualPrompt,
            aspectRatio: "9:16",
            durationSeconds: 20,
            account: {
              name: account.name,
              niche: account.niche,
              audience: account.audience
            }
          })
        },
        "External video API"
      );

      const data = (await response.json()) as { url?: string; id?: string; filePath?: string };
      return {
        provider: env.videoApiProvider,
        url: data.url,
        filePath: data.filePath,
        metadata: { providerJobId: data.id, prompt: script.visualPrompt }
      };
    }

    await logEvent({ scope: "video-api", message: "Using generated vertical video fallback", contentId });
    const fileName = `${safeFilePart(contentId)}-visuals.mp4`;
    const filePath = mediaPath("visuals", fileName);
    const palette: Record<string, string> = {
      motivation: "0x101820",
      culture: "0x7a1f3d",
      facts: "0x184e77",
      custom: "0x2b2d42"
    };

    await runFfmpeg(
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `color=c=${palette[account.niche] ?? palette.custom}:s=1080x1920:d=20:r=30`,
        "-vf",
        "format=yuv420p",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        filePath
      ],
      "mock-video"
    );

    await fs.writeFile(mediaPath("telemetry", `${safeFilePart(contentId)}-visual-prompt.txt`), script.visualPrompt);

    return {
      provider: "safe-video-fallback",
      filePath,
      url: publicMediaUrl("visuals", fileName),
      metadata: { prompt: script.visualPrompt }
    };
  }
}
