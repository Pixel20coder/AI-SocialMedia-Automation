import { env } from "../config/env";
import { logEvent } from "../services/logService";

export class RateLimitError extends Error {
  constructor(
    message: string,
    readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

type RateLimitedTask<T> = () => Promise<T>;

export class RateLimiter {
  private chain = Promise.resolve();
  private lastRunAt = 0;

  constructor(
    private readonly scope: string,
    private readonly minIntervalMs = env.apiMinIntervalMs
  ) {}

  schedule<T>(task: RateLimitedTask<T>): Promise<T> {
    const next = this.chain.then(async () => {
      const waitMs = Math.max(0, this.lastRunAt + this.minIntervalMs - Date.now());
      if (waitMs > 0) {
        await delay(waitMs);
      }
      this.lastRunAt = Date.now();
      return task();
    });

    this.chain = next.then(
      () => undefined,
      () => undefined
    );

    return next;
  }

  async withBackoff<T>(task: RateLimitedTask<T>, maxAttempts = env.maxRetries): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.schedule(task);
      } catch (error) {
        lastError = error;
        const rateLimitDelay =
          error instanceof RateLimitError && error.retryAfterMs
            ? error.retryAfterMs
            : env.apiRateLimitBaseDelayMs * 2 ** (attempt - 1);

        await logEvent({
          level: attempt === maxAttempts ? "error" : "warn",
          scope: this.scope,
          message: error instanceof RateLimitError ? "Provider rate limited request" : "Provider request failed",
          metadata: {
            attempt,
            maxAttempts,
            delayMs: rateLimitDelay,
            error: error instanceof Error ? error.message : String(error)
          }
        });

        if (attempt < maxAttempts) {
          await delay(rateLimitDelay);
        }
      }
    }

    throw lastError;
  }
}

export async function fetchWithRateLimit(
  limiter: RateLimiter,
  url: string,
  options: RequestInit,
  label: string
) {
  return limiter.withBackoff(async () => {
    const response = await fetch(url, options);
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : undefined;
      throw new RateLimitError(`${label} rate limited`, retryAfterMs);
    }
    if (!response.ok) {
      throw new Error(`${label} failed with ${response.status}: ${await response.text()}`);
    }
    return response;
  });
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
