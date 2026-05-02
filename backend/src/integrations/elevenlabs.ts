import fs from "fs/promises";
import path from "path";
import { env } from "../config/env";
import { GeneratedAsset, ViralScript } from "../types";
import { mediaPath, publicMediaUrl, safeFilePart } from "../utils/media";
import { RateLimiter, fetchWithRateLimit } from "../utils/rateLimiter";
import { runFfmpeg } from "./media/ffmpeg";
import { logEvent } from "../services/logService";

export class ElevenLabsAdapter {
  private readonly limiter = new RateLimiter("elevenlabs", 800);

  async synthesize(script: ViralScript, contentId: string): Promise<GeneratedAsset> {
    const narration = script.sections.map((section) => section.text).join(" ");

    if (env.elevenLabsApiKey && !env.mockIntegrations) {
      await logEvent({ scope: "elevenlabs", message: "Calling ElevenLabs TTS", contentId });
      const response = await fetchWithRateLimit(
        this.limiter,
        `https://api.elevenlabs.io/v1/text-to-speech/${env.elevenLabsVoiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": env.elevenLabsApiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg"
          },
          body: JSON.stringify({
            text: narration,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.42,
              similarity_boost: 0.78,
              style: 0.35,
              use_speaker_boost: true
            }
          })
        },
        "ElevenLabs TTS"
      );

      const fileName = `${safeFilePart(contentId)}.mp3`;
      const filePath = mediaPath("voices", fileName);
      await fs.writeFile(filePath, Buffer.from(await response.arrayBuffer()));
      return { provider: "elevenlabs", filePath, url: publicMediaUrl("voices", fileName) };
    }

    await logEvent({ scope: "elevenlabs", message: "Using silent audio fallback", contentId });
    const fileName = `${safeFilePart(contentId)}.m4a`;
    const filePath = mediaPath("voices", fileName);
    await runFfmpeg(
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-t",
        "20",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        filePath
      ],
      "mock-voice"
    );

    await fs.writeFile(
      path.join(env.mediaRoot, "telemetry", `${safeFilePart(contentId)}-voice.txt`),
      narration
    );

    return {
      provider: "safe-audio-fallback",
      filePath,
      url: publicMediaUrl("voices", fileName),
      metadata: { narration, direction: script.voiceDirection }
    };
  }
}
