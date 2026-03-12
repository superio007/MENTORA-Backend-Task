import { Request, Response, NextFunction } from "express";
import { log } from "../utils/logger";

/**
 * Custom error classes for different error types
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

/**
 * Database error interface
 */
interface DatabaseError extends Error {
  code?: string;
}

/**
 * Error handling middleware
 * Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5
 *
 * Creates centralized error handler
 * Maps error types to HTTP status codes
 * Returns consistent JSON error format
 * Includes field-specific details for validation errors
 * Logs errors with stack traces
 * Never exposes internal details in error messages
 * Handles database constraint violations (23505, 23503)
 *
 * @returns Express error middleware function
 *
 * @example
 * // Apply as last middleware
 * app.use(errorHandler());
 */
export function errorHandler() {
  return (
    err: Error | DatabaseError,
    req: Request,
    res: Response,
    _next: NextFunction,
  ): void => {
    // Log error with full details including stack trace
    log.error("Request error occurred", err, {
      path: req.path,
      method: req.method,
      userId: req.user?.userId,
      statusCode: res.statusCode,
    });

    // Handle ValidationError
    if (err instanceof ValidationError) {
      res.status(400).json({
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          details: err.details,
        },
      });
      return;
    }

    // Handle AuthenticationError
    if (err instanceof AuthenticationError) {
      res.status(401).json({
        error: {
          message: "Authentication failed",
          code: "AUTH_ERROR",
        },
      });
      return;
    }

    // Handle AuthorizationError
    if (err instanceof AuthorizationError) {
      res.status(403).json({
        error: {
          message: "Insufficient permissions",
          code: "FORBIDDEN",
        },
      });
      return;
    }

    // Handle NotFoundError
    if (err instanceof NotFoundError) {
      res.status(404).json({
        error: {
          message: err.message,
          code: "NOT_FOUND",
        },
      });
      return;
    }

    // Handle ConflictError
    if (err instanceof ConflictError) {
      res.status(409).json({
        error: {
          message: err.message,
          code: "CONFLICT",
        },
      });
      return;
    }

    // Handle database constraint violations
    const dbErr = err as DatabaseError;

    // 23505: Unique constraint violation
    if (dbErr.code === "23505") {
      res.status(409).json({
        error: {
          message: "Resource already exists",
          code: "DUPLICATE",
        },
      });
      return;
    }

    // 23503: Foreign key constraint violation
    if (dbErr.code === "23503") {
      res.status(400).json({
        error: {
          message: "Referenced resource does not exist",
          code: "INVALID_REFERENCE",
        },
      });
      return;
    }

    // Default to 500 for unexpected errors
    res.status(500).json({
      error: {
        message: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
    });
  };
}
