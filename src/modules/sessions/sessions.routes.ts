import { Router } from "express";
import { authenticateJWT, requireRole } from "../auth/auth.middleware";
import {
  validateRequest,
  createSessionSchema,
} from "../../middleware/validation";
import {
  createSessionController,
  getSessionsController,
  getSessionByIdController,
  updateSessionController,
  deleteSessionController,
} from "./sessions.controller";

const router = Router();

/**
 * Sessions Routes
 * Validates: Requirements 6.1, 6.4, 6.5, 2.1, 2.2, 9.1
 */

/**
 * POST /sessions
 * Create a new session
 * - Requires authentication (JWT)
 * - Requires mentor role
 * - Validates request body against createSessionSchema
 * - Verifies mentor owns the associated lesson
 */
router.post(
  "/",
  authenticateJWT,
  requireRole("mentor"),
  validateRequest(createSessionSchema, "body"),
  createSessionController,
);

/**
 * GET /sessions
 * Get all sessions for the authenticated mentor's lessons
 * - Requires authentication (JWT)
 * - Requires mentor role
 * - Returns only sessions for lessons owned by the mentor
 */
router.get("/", authenticateJWT, requireRole("mentor"), getSessionsController);

/**
 * GET /sessions/:id
 * Get a single session by ID
 * - Requires authentication (JWT)
 * - Requires mentor role
 */
router.get(
  "/:id",
  authenticateJWT,
  requireRole("mentor"),
  getSessionByIdController,
);

/**
 * PUT /sessions/:id
 * Update a session's information
 * - Requires authentication (JWT)
 * - Requires mentor role
 * - Validates request body against createSessionSchema
 * - Verifies mentor owns the associated lesson
 */
router.put(
  "/:id",
  authenticateJWT,
  requireRole("mentor"),
  validateRequest(createSessionSchema, "body"),
  updateSessionController,
);

/**
 * DELETE /sessions/:id
 * Delete a session
 * - Requires authentication (JWT)
 * - Requires mentor role
 * - Verifies mentor owns the associated lesson
 */
router.delete(
  "/:id",
  authenticateJWT,
  requireRole("mentor"),
  deleteSessionController,
);

export default router;
