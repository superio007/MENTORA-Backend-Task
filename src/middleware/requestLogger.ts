import { Request, Response, NextFunction } from "express";
import { log } from "../utils/logger";

/**
 * Request logging middleware
 * Validates: Requirements 11.1, 11.3, 11.4, 11.5
 *
 * Logs timestamp, method, path for each request
 * Measures and logs response time in milliseconds
 * Logs response status code on completion
 * Redacts sensitive data from logs
 * Uses structured JSON format
 *
 * @returns Express middleware function
 *
 * @example
 * app.use(requestLogger());
 */
export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Record request start time
    const startTime = Date.now();

    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);

    // Override res.json to log response
    res.json = function (body: any) {
      // Calculate response time
      const responseTime = Date.now() - startTime;

      // Log request completion with all required fields
      log.info("HTTP request completed", {
        timestamp: new Date(startTime).toISOString(),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        userId: req.user?.userId,
      });

      // Call original json method
      return originalJson(body);
    };

    // Log request start
    log.info("HTTP request received", {
      timestamp: new Date(startTime).toISOString(),
      method: req.method,
      path: req.path,
      userId: req.user?.userId,
    });

    next();
  };
}
