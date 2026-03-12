import { Request, Response, NextFunction } from "express";
import { verifyToken, JWTPayload } from "./auth.service";
import { log } from "../../utils/logger";

/**
 * Extend Express Request type to include user information
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware that extracts and verifies JWT token
 * Validates: Requirements 1.4, 2.1
 *
 * Extracts JWT token from Authorization header (Bearer token format)
 * Verifies token validity and expiration
 * Attaches decoded user information to request object
 * Returns 401 for missing, invalid, or expired tokens
 */
export function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      log.warn("Authentication failed: No authorization header", {
        path: req.path,
        method: req.method,
      });
      res.status(401).json({
        error: {
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        },
      });
      return;
    }

    // Check for Bearer token format
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      log.warn("Authentication failed: Invalid authorization header format", {
        path: req.path,
        method: req.method,
      });
      res.status(401).json({
        error: {
          message: "Invalid authorization header format",
          code: "INVALID_AUTH_FORMAT",
        },
      });
      return;
    }

    const token = parts[1];

    // Verify and decode token
    const decoded = verifyToken(token);

    // Attach user information to request
    req.user = decoded;

    log.debug("Authentication successful", {
      userId: decoded.userId,
      role: decoded.role,
      path: req.path,
    });

    next();
  } catch (error) {
    // Handle token verification errors
    if (error instanceof Error) {
      if (error.message === "Token expired") {
        log.warn("Authentication failed: Token expired", {
          path: req.path,
          method: req.method,
        });
        res.status(401).json({
          error: {
            message: "Token expired",
            code: "TOKEN_EXPIRED",
          },
        });
        return;
      }

      if (error.message === "Invalid token") {
        log.warn("Authentication failed: Invalid token", {
          path: req.path,
          method: req.method,
        });
        res.status(401).json({
          error: {
            message: "Invalid token",
            code: "INVALID_TOKEN",
          },
        });
        return;
      }
    }

    // Unexpected error
    log.error("Authentication error", error, {
      path: req.path,
      method: req.method,
    });
    res.status(401).json({
      error: {
        message: "Authentication failed",
        code: "AUTH_ERROR",
      },
    });
  }
}

/**
 * Authorization middleware factory that checks user role
 * Validates: Requirements 2.2, 2.3, 2.4, 2.5
 *
 * Creates middleware that verifies the authenticated user has one of the allowed roles
 * Must be used after authenticateJWT middleware
 * Returns 403 for insufficient permissions
 *
 * @param allowedRoles - Array of roles that are allowed to access the endpoint
 * @returns Express middleware function
 *
 * @example
 * // Only parents can access
 * router.post('/students', authenticateJWT, requireRole('parent'), createStudent);
 *
 * @example
 * // Both parents and mentors can access
 * router.get('/lessons', authenticateJWT, requireRole('parent', 'mentor'), getLessons);
 */
export function requireRole(
  ...allowedRoles: Array<"parent" | "student" | "mentor">
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Ensure user is authenticated (should be set by authenticateJWT middleware)
    if (!req.user) {
      log.error("Authorization check failed: No user in request", {
        path: req.path,
        method: req.method,
      });
      res.status(401).json({
        error: {
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        },
      });
      return;
    }

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      log.warn("Authorization failed: Insufficient permissions", {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
      });
      res.status(403).json({
        error: {
          message: "Insufficient permissions",
          code: "FORBIDDEN",
        },
      });
      return;
    }

    log.debug("Authorization successful", {
      userId: req.user.userId,
      role: req.user.role,
      path: req.path,
    });

    next();
  };
}
