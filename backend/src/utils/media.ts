import fs from "fs/promises";
import path from "path";
import { env } from "../config/env";

export async function ensureMediaDirs() {
  await Promise.all(
    ["voices", "visuals", "final", "subtitles", "telemetry"].map((dir) =>
      fs.mkdir(path.join(env.mediaRoot, dir), { recursive: true })
    )
  );
}

export function mediaPath(folder: string, fileName: string) {
  return path.join(env.mediaRoot, folder, fileName);
}

export function publicMediaUrl(folder: string, fileName: string) {
  return `${env.publicApiUrl}/media/${folder}/${fileName}`;
}

export function safeFilePart(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}
