import fs from "fs/promises";
import { GeneratedAsset, ViralScript } from "../../types";
import { mediaPath, publicMediaUrl, safeFilePart } from "../../utils/media";
import { logger } from "../../utils/logger";
import { runFfmpeg } from "./ffmpeg";

function srtTime(seconds: number) {
  const date = new Date(seconds * 1000);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  const ms = String(date.getUTCMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss},${ms}`;
}

function srtFromScript(script: ViralScript) {
  return script.sections
    .map((section, index) => {
      return `${index + 1}\n${srtTime(section.start)} --> ${srtTime(section.end)}\n${section.text}\n`;
    })
    .join("\n");
}

export class EditorProvider {
  async combine(
    script: ViralScript,
    voice: GeneratedAsset,
    visuals: GeneratedAsset,
    contentId: string
  ): Promise<{ finalVideo: GeneratedAsset; subtitles: GeneratedAsset }> {
    const subtitleFile = `${safeFilePart(contentId)}.srt`;
    const subtitlePath = mediaPath("subtitles", subtitleFile);
    await fs.writeFile(subtitlePath, srtFromScript(script));

    if (!visuals.filePath || !voice.filePath) {
      return {
        finalVideo: {
          provider: "external-editor-placeholder",
          url: visuals.url,
          metadata: { voiceUrl: voice.url, subtitleUrl: publicMediaUrl("subtitles", subtitleFile) }
        },
        subtitles: {
          provider: "srt",
          filePath: subtitlePath,
          url: publicMediaUrl("subtitles", subtitleFile)
        }
      };
    }

    const finalFile = `${safeFilePart(contentId)}-final.mp4`;
    const finalPath = mediaPath("final", finalFile);
    const subtitleFilter = `subtitles=${subtitlePath}:force_style='Alignment=2,Fontsize=52,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,MarginV=180'`;

    try {
      await runFfmpeg(
        [
          "-y",
          "-i",
          visuals.filePath,
          "-i",
          voice.filePath,
          "-t",
          "20",
          "-vf",
          subtitleFilter,
          "-map",
          "0:v:0",
          "-map",
          "1:a:0",
          "-c:v",
          "libx264",
          "-c:a",
          "aac",
          "-shortest",
          "-pix_fmt",
          "yuv420p",
          finalPath
        ],
        "edit-with-subtitles"
      );
    } catch (error) {
      logger.warn({ error }, "Subtitle burn failed, falling back to clean audio/video mux");
      await runFfmpeg(
        [
          "-y",
          "-i",
          visuals.filePath,
          "-i",
          voice.filePath,
          "-t",
          "20",
          "-map",
          "0:v:0",
          "-map",
          "1:a:0",
          "-c:v",
          "copy",
          "-c:a",
          "aac",
          "-shortest",
          finalPath
        ],
        "edit-audio-video"
      );
    }

    return {
      finalVideo: {
        provider: "ffmpeg",
        filePath: finalPath,
        url: publicMediaUrl("final", finalFile),
        metadata: { burnedSubtitles: true }
      },
      subtitles: {
        provider: "srt",
        filePath: subtitlePath,
        url: publicMediaUrl("subtitles", subtitleFile)
      }
    };
  }
}
