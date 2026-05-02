import { logger } from "./logger";

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { retries: number; label: string; minDelayMs?: number }
): Promise<T> {
  const minDelayMs = options.minDelayMs ?? 500;
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const delay = minDelayMs * 2 ** (attempt - 1);
      logger.warn({ label: options.label, attempt, delay, error }, "Retryable operation failed");
      if (attempt < options.retries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
