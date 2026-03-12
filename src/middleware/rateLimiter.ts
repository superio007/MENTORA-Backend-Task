import { Request, Response, NextFunction } from "express";
import { log } from "../utils/logger";

/**
 * Rate limiter store interface for tracking request counts
 */
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Rate limiter configuration options
 */
interface RateLimiterOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Function to generate rate limit key
  message?: string; // Custom error message
}

/**
 * In-memory rate limiter store
 * Tracks request counts per key with automatic cleanup
 */
const store: RateLimitStore = {};

/**
 * Default key generator: uses user ID for authenticated requests, IP for unauthenticated
 * Validates: Requirements 8.2, 8.3
 */
function defaultKeyGenerator(req: Request): string {
  // For authenticated requests, use user ID
  if (req.user?.userId) {
    return `user:${req.user.userId}`;
  }

  // For unauthenticated requests, use IP address
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown";
  return `ip:${ip}`;
}

/**
 * Creates a rate limiting middleware
 * Validates: Requirements 7.5, 8.1, 8.2, 8.3, 8.4, 8.5
 *
 * Tracks requests per user ID for authenticated requests
 * Tracks requests per IP for unauthenticated requests
 * Returns 429 when limit exceeded
 * Includes Retry-After header in 429 responses
 * Resets counters after time window expires
 *
 * @param options - Rate limiter configuration
 * @returns Express middleware function
 *
 * @example
 * // Apply rate limiter to /llm/summarize endpoint
 * const limiter = createRateLimiter({
 *   windowMs: 60 * 1000, // 1 minute
 *   max: 10, // 10 requests per minute
 * });
 * router.post('/summarize', limiter, summarizeController);
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    max,
    keyGenerator = defaultKeyGenerator,
    message = "Too many requests, please try again later",
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Initialize or get existing entry
    if (!store[key]) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    const entry = store[key];

    // Check if window has expired
    if (now >= entry.resetTime) {
      // Reset counter for new window
      entry.count = 0;
      entry.resetTime = now + windowMs;
    }

    // Increment request count
    entry.count++;

    // Calculate time until reset
    const timeUntilReset = Math.ceil((entry.resetTime - now) / 1000);

    // Check if limit exceeded
    if (entry.count > max) {
      log.warn("Rate limit exceeded", {
        key,
        count: entry.count,
        limit: max,
        path: req.path,
        method: req.method,
        userId: req.user?.userId,
      });

      res.status(429);
      res.set("Retry-After", String(timeUntilReset));
      res.json({
        error: {
          message,
          code: "RATE_LIMIT_EXCEEDED",
        },
      });
      return;
    }

    log.debug("Rate limit check passed", {
      key,
      count: entry.count,
      limit: max,
      path: req.path,
    });

    next();
  };
}

/**
 * Cleanup function to remove expired entries from store
 * Should be called periodically to prevent memory leaks
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
      cleaned++;
    }
  }

  if (cleaned > 0) {
    log.debug("Rate limit store cleanup", { entriesRemoved: cleaned });
  }
}

/**
 * Reset rate limit store - for testing purposes
 */
export function resetRateLimitStore(): void {
  for (const key in store) {
    delete store[key];
  }
}

/**
 * Start periodic cleanup of rate limit store
 * Runs every 5 minutes to prevent memory leaks
 */
export function startRateLimitCleanup(): void {
  setInterval(
    () => {
      cleanupRateLimitStore();
    },
    5 * 60 * 1000,
  ); // 5 minutes

  log.info("Rate limit store cleanup started");
}
