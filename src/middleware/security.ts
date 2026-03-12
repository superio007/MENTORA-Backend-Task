import helmet from "helmet";
import cors from "cors";
import { Request, Response, NextFunction } from "express";
import { config } from "../config/env";
import { log } from "../utils/logger";

/**
 * Security middleware configuration
 * Validates: Requirements 10.1, 10.2, 10.3
 *
 * Applies helmet middleware for security headers
 * Configures CORS with allowed origins
 * Sets request body size limit
 * Returns 413 for oversized requests
 */

/**
 * Get helmet middleware with security headers
 * Validates: Requirement 10.1
 *
 * @returns Helmet middleware
 */
export function getHelmetMiddleware() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: "deny",
    },
    noSniff: true,
    xssFilter: true,
  });
}

/**
 * Get CORS middleware with allowed origins
 * Validates: Requirement 10.2
 *
 * @returns CORS middleware
 */
export function getCorsMiddleware() {
  // Use configured CORS origin
  const allowedOrigins = config.CORS_ORIGIN || "http://localhost:3000";

  return cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400, // 24 hours
  });
}

/**
 * Request body size limit middleware
 * Validates: Requirements 10.3
 *
 * Sets request body size limit to 1MB
 * Returns 413 for oversized requests
 *
 * @returns Express middleware function
 */
export function getBodySizeLimitMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Get content length from headers
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);

    // 1MB limit
    const maxSize = 1024 * 1024;

    if (contentLength > maxSize) {
      log.warn("Request body exceeds size limit", {
        contentLength,
        maxSize,
        path: req.path,
        method: req.method,
        userId: req.user?.userId,
      });

      res.status(413).json({
        error: {
          message: "Payload too large",
          code: "PAYLOAD_TOO_LARGE",
        },
      });
      return;
    }

    next();
  };
}

/**
 * Apply all security middleware to Express app
 * Validates: Requirements 10.1, 10.2, 10.3
 *
 * @param app - Express application
 *
 * @example
 * import express from 'express';
 * import { applySecurity } from './middleware/security';
 *
 * const app = express();
 * applySecurity(app);
 */
export function applySecurity(app: any): void {
  // Apply helmet for security headers
  app.use(getHelmetMiddleware());

  // Apply CORS
  app.use(getCorsMiddleware());

  // Apply body size limit check
  app.use(getBodySizeLimitMiddleware());

  log.info("Security middleware applied");
}
