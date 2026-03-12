import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { createRateLimiter, cleanupRateLimitStore } from "./rateLimiter";
import { requestLogger } from "./requestLogger";
import {
  errorHandler,
  ValidationError,
  ConflictError,
  NotFoundError,
} from "./errorHandler";
import { getBodySizeLimitMiddleware } from "./security";
import { log } from "../utils/logger";

// Mock logger to avoid cluttering test output
jest.mock("../utils/logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("Cross-Cutting Concerns Middleware", () => {
  describe("Rate Limiting Middleware", () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());

      // Add mock user to request for testing
      app.use((_req: Request, _res: Response, next: NextFunction) => {
        _req.user = {
          userId: "test-user-123",
          email: "test@example.com",
          role: "parent",
          iat: 0,
          exp: 0,
        };
        next();
      });

      // Apply rate limiter
      const limiter = createRateLimiter({
        windowMs: 1000, // 1 second window for testing
        max: 3, // 3 requests per window
      });

      app.use(limiter);

      app.get("/test", (_req: Request, res: Response) => {
        res.json({ success: true });
      });

      // Clean up store before each test
      cleanupRateLimitStore();
    });

    it("should allow requests within the rate limit", async () => {
      // Property 27: Rate Limit Enforcement
      // For any user within the configured rate limit, requests should be allowed
      const response1 = await request(app).get("/test");
      expect(response1.status).toBe(200);

      const response2 = await request(app).get("/test");
      expect(response2.status).toBe(200);

      const response3 = await request(app).get("/test");
      expect(response3.status).toBe(200);
    });

    it("should return 429 when rate limit is exceeded", async () => {
      // Property 27: Rate Limit Enforcement
      // For any user exceeding the configured rate limit, the API should return 429
      await request(app).get("/test");
      await request(app).get("/test");
      await request(app).get("/test");

      const response = await request(app).get("/test");
      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
    });

    it("should include Retry-After header in 429 response", async () => {
      // Property 28: Rate Limit Retry-After Header
      // For any rate-limited response (429 status), the response should include a Retry-After header
      await request(app).get("/test");
      await request(app).get("/test");
      await request(app).get("/test");

      const response = await request(app).get("/test");
      expect(response.status).toBe(429);
      expect(response.headers["retry-after"]).toBeDefined();
      expect(parseInt(response.headers["retry-after"])).toBeGreaterThan(0);
    });

    it("should reset counter after time window expires", async () => {
      // Property 29: Rate Limit Window Reset
      // For any user who has exceeded the rate limit, after the time window expires, subsequent requests should be allowed
      await request(app).get("/test");
      await request(app).get("/test");
      await request(app).get("/test");

      let response = await request(app).get("/test");
      expect(response.status).toBe(429);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      response = await request(app).get("/test");
      expect(response.status).toBe(200);
    });

    it("should track requests per user ID for authenticated requests", () => {
      // Property 8.2: Rate Limiter SHALL track requests per user ID for authenticated requests
      // This test verifies that the rate limiter uses user ID as the key for authenticated requests
      const req1 = {
        user: {
          userId: "user-1",
          email: "test@example.com",
          role: "parent",
          iat: 0,
          exp: 0,
        },
        headers: {},
        socket: { remoteAddress: "127.0.0.1" },
      } as any;

      const req2 = {
        user: {
          userId: "user-2",
          email: "test@example.com",
          role: "parent",
          iat: 0,
          exp: 0,
        },
        headers: {},
        socket: { remoteAddress: "127.0.0.1" },
      } as any;

      // Create a rate limiter with max 1 request
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 1,
      });

      const res = {
        status: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const next = jest.fn();

      // First request from user-1 should pass
      limiter(req1, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Second request from user-1 should be rate limited
      limiter(req1, res, next);
      expect(res.status).toHaveBeenCalledWith(429);

      // Reset mocks
      res.status.mockClear();
      res.json.mockClear();
      next.mockClear();

      // First request from user-2 should pass (different user, separate counter)
      limiter(req2, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      cleanupRateLimitStore();
    });
  });

  describe("Request Logging Middleware", () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use(requestLogger());

      app.get("/test", (_req: Request, res: Response) => {
        res.json({ success: true });
      });

      // Clear mock calls
      jest.clearAllMocks();
    });

    it("should log request with timestamp, method, and path", async () => {
      // Property 38: Request Logging Completeness
      // For any processed request, the log should contain timestamp, HTTP method, endpoint path, and response status code
      await request(app).get("/test");

      expect(log.info).toHaveBeenCalled();
      const calls = (log.info as jest.Mock).mock.calls;
      const logCall = calls.find((call) => call[0] === "HTTP request received");

      expect(logCall).toBeDefined();
      expect(logCall[1]).toHaveProperty("method", "GET");
      expect(logCall[1]).toHaveProperty("path", "/test");
      expect(logCall[1]).toHaveProperty("timestamp");
    });

    it("should log response time in milliseconds", async () => {
      // Property 41: Response Time Logging
      // For any completed request, the log should include the response time in milliseconds
      await request(app).get("/test");

      const calls = (log.info as jest.Mock).mock.calls;
      const logCall = calls.find(
        (call) => call[0] === "HTTP request completed",
      );

      expect(logCall).toBeDefined();
      expect(logCall[1]).toHaveProperty("responseTime");
      expect(typeof logCall[1].responseTime).toBe("number");
      expect(logCall[1].responseTime).toBeGreaterThanOrEqual(0);
    });

    it("should log response status code", async () => {
      // Property 38: Request Logging Completeness
      // For any processed request, the log should contain timestamp, HTTP method, endpoint path, and response status code
      await request(app).get("/test");

      const calls = (log.info as jest.Mock).mock.calls;
      const logCall = calls.find(
        (call) => call[0] === "HTTP request completed",
      );

      expect(logCall).toBeDefined();
      expect(logCall[1]).toHaveProperty("statusCode", 200);
    });

    it("should use structured JSON format", async () => {
      // Property 40: Structured JSON Logging
      // For any log entry generated by the system, the log should be valid JSON that can be parsed
      await request(app).get("/test");

      const calls = (log.info as jest.Mock).mock.calls;
      const logCall = calls.find(
        (call) => call[0] === "HTTP request completed",
      );

      expect(logCall).toBeDefined();
      // Verify the context is a valid object (would be JSON serializable)
      expect(typeof logCall[1]).toBe("object");
      expect(logCall[1]).not.toBeNull();
    });
  });

  describe("Error Handling Middleware", () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());

      // Clear mock calls
      jest.clearAllMocks();
    });

    it("should handle ValidationError with 400 status", async () => {
      // Property 15.2: Validation Error Response Format
      // For any validation error response, the error details should include information about which specific fields failed validation and why
      app.get("/test", (_req: Request, _res: Response, next: NextFunction) => {
        next(
          new ValidationError("Validation failed", {
            email: "Invalid email format",
            name: "Required field missing",
          }),
        );
      });

      app.use(errorHandler());

      const response = await request(app).get("/test");
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(response.body.error.details).toEqual({
        email: "Invalid email format",
        name: "Required field missing",
      });
    });

    it("should handle ConflictError with 409 status", async () => {
      // Property 47: Database Constraint Error Codes
      // For any database constraint violation (unique, foreign key, check), the API should return either a 409 Conflict or 400 Bad Request status code
      app.get("/test", (_req: Request, _res: Response, next: NextFunction) => {
        next(new ConflictError("Resource already exists"));
      });

      app.use(errorHandler());

      const response = await request(app).get("/test");
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
    });

    it("should handle NotFoundError with 404 status", async () => {
      app.get("/test", (_req: Request, _res: Response, next: NextFunction) => {
        next(new NotFoundError("Resource not found"));
      });

      app.use(errorHandler());

      const response = await request(app).get("/test");
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it("should handle database unique constraint violation (23505)", async () => {
      // Property 47: Database Constraint Error Codes
      // For any database constraint violation (unique, foreign key, check), the API should return either a 409 Conflict or 400 Bad Request status code
      app.get("/test", (_req: Request, _res: Response, next: NextFunction) => {
        const err = new Error("Unique constraint violation") as any;
        err.code = "23505";
        next(err);
      });

      app.use(errorHandler());

      const response = await request(app).get("/test");
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("DUPLICATE");
    });

    it("should handle database foreign key constraint violation (23503)", async () => {
      // Property 47: Database Constraint Error Codes
      // For any database constraint violation (unique, foreign key, check), the API should return either a 409 Conflict or 400 Bad Request status code
      app.get("/test", (_req: Request, _res: Response, next: NextFunction) => {
        const err = new Error("Foreign key constraint violation") as any;
        err.code = "23503";
        next(err);
      });

      app.use(errorHandler());

      const response = await request(app).get("/test");
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_REFERENCE");
    });

    it("should return 500 for unexpected errors", async () => {
      // Property 48: Unexpected Error Status Code
      // For any unexpected error not explicitly handled by the application, the API should return a 500 Internal Server Error status code
      app.get("/test", (_req: Request, _res: Response, next: NextFunction) => {
        next(new Error("Unexpected error"));
      });

      app.use(errorHandler());

      const response = await request(app).get("/test");
      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe("INTERNAL_ERROR");
    });

    it("should never expose internal details in error messages", async () => {
      // Property 49: Error Message Security
      // For any error response, the error message should not expose internal implementation details such as database queries, stack traces, or file paths
      app.get("/test", (_req: Request, _res: Response, next: NextFunction) => {
        next(new Error("SELECT * FROM users WHERE id = 123"));
      });

      app.use(errorHandler());

      const response = await request(app).get("/test");
      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe("An unexpected error occurred");
      expect(response.body.error.message).not.toContain("SELECT");
    });

    it("should log errors with stack traces", async () => {
      // Property 39: Error Logging Completeness
      // For any error that occurs during request processing, the log should contain the error message and stack trace
      app.get("/test", (_req: Request, _res: Response, next: NextFunction) => {
        next(new Error("Test error"));
      });

      app.use(errorHandler());

      await request(app).get("/test");

      expect(log.error).toHaveBeenCalled();
      const errorCall = (log.error as jest.Mock).mock.calls[0];
      expect(errorCall[0]).toBe("Request error occurred");
      expect(errorCall[1]).toBeInstanceOf(Error);
    });
  });

  describe("Request Body Size Limit Middleware", () => {
    it("should check content length and reject oversized requests", () => {
      // Property 36: Request Body Size Limit
      // For any request with a body exceeding the configured size limit, the API should return a 413 Payload Too Large status code
      const middleware = getBodySizeLimitMiddleware();
      const req = {
        headers: { "content-length": String(2 * 1024 * 1024) }, // 2MB
        path: "/test",
        method: "POST",
        user: { userId: "test" },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn(),
      } as any;

      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: "Payload too large",
          code: "PAYLOAD_TOO_LARGE",
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should allow requests within size limit", () => {
      // Property 36: Request Body Size Limit
      // For any request with a body within the configured size limit, the request should be processed normally
      const middleware = getBodySizeLimitMiddleware();
      const req = {
        headers: { "content-length": "1000" },
        path: "/test",
        method: "POST",
        user: { userId: "test" },
      } as any;

      const res = {} as any;
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
