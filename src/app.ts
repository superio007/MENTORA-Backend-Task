import express from "express";
import authRoutes from "./modules/auth/auth.routes";
import studentsRoutes from "./modules/students/students.routes";
import lessonsRoutes from "./modules/lessons/lessons.routes";
import bookingsRoutes from "./modules/bookings/bookings.routes";
import sessionsRoutes from "./modules/sessions/sessions.routes";
import llmRoutes from "./modules/llm/llm.routes";
import { applySecurity } from "./middleware/security";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import {
  createRateLimiter,
  startRateLimitCleanup,
} from "./middleware/rateLimiter";
import { config } from "./config/env";

const app = express();

// Apply security middleware (helmet, CORS, body size limit)
applySecurity(app);

// Body parser middleware
app.use(express.json());

// Apply request logging middleware
app.use(requestLogger());

// Create rate limiter for /llm/summarize endpoint (disabled in test mode)
const llmRateLimiter =
  config.NODE_ENV === "test"
    ? (_req: any, _res: any, next: any) => next() // No-op middleware for tests
    : createRateLimiter({
        windowMs: config.RATE_LIMIT_WINDOW_MS,
        max: config.RATE_LIMIT_MAX_REQUESTS,
      });

// Register auth routes
app.use("/auth", authRoutes);

// Register students routes
app.use("/students", studentsRoutes);

// Register lessons routes
app.use("/lessons", lessonsRoutes);

// Register bookings routes
app.use("/bookings", bookingsRoutes);

// Register sessions routes
app.use("/sessions", sessionsRoutes);

// Register LLM routes with rate limiter
app.use("/llm", llmRateLimiter, llmRoutes);

// Apply error handling middleware last
app.use(errorHandler());

// Start rate limit cleanup (only in non-test mode)
if (config.NODE_ENV !== "test") {
  startRateLimitCleanup();
}

export default app;
