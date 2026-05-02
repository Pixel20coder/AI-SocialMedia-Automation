import { spawn } from "child_process";
import ffmpegStatic from "ffmpeg-static";
import { logger } from "../../utils/logger";

const ffmpegPath = ffmpegStatic || "ffmpeg";

export async function runFfmpeg(args: string[], label: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, args);
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        logger.warn({ label, code, stderr: stderr.slice(-1200) }, "FFmpeg command failed");
        reject(new Error(`${label} failed with code ${code}`));
      }
    });
  });
}
