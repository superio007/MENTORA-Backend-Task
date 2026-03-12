import { Router } from "express";
import { authenticateJWT, requireRole } from "../auth/auth.middleware";
import {
  validateRequest,
  createLessonSchema,
  paginationSchema,
} from "../../middleware/validation";
import {
  createLessonController,
  getLessonsController,
  getLessonByIdController,
  updateLessonController,
  deleteLessonController,
  getLessonSessionsController,
} from "./lessons.controller";

const router = Router();

/**
 * Lessons Routes
 * Validates: Requirements 4.1, 4.2, 4.4, 4.6, 4.7, 4.8, 2.1, 2.2, 9.1
 */

/**
 * POST /lessons
 * Create a new lesson
 * - Requires authentication (JWT)
 * - Requires mentor role
 * - Validates request body against createLessonSchema
 */
router.post(
  "/",
  authenticateJWT,
  requireRole("mentor"),
  validateRequest(createLessonSchema, "body"),
  createLessonController,
);

/**
 * GET /lessons
 * Get paginated list of all lessons
 * - Public endpoint (no authentication required)
 * - Validates pagination query parameters
 */
router.get(
  "/",
  validateRequest(paginationSchema, "query"),
  getLessonsController,
);

/**
 * GET /lessons/:id
 * Get a single lesson by ID
 * - Public endpoint (no authentication required)
 */
router.get("/:id", getLessonByIdController);

/**
 * GET /lessons/:id/sessions
 * Get all sessions for a specific lesson
 * - Public endpoint (no authentication required)
 */
router.get("/:id/sessions", getLessonSessionsController);

/**
 * PUT /lessons/:id
 * Update a lesson's information
 * - Requires authentication (JWT)
 * - Requires mentor role
 * - Validates request body against createLessonSchema
 * - Verifies mentor ownership before allowing update
 */
router.put(
  "/:id",
  authenticateJWT,
  requireRole("mentor"),
  validateRequest(createLessonSchema, "body"),
  updateLessonController,
);

/**
 * DELETE /lessons/:id
 * Delete a lesson
 * - Requires authentication (JWT)
 * - Requires mentor role
 * - Verifies mentor ownership before allowing deletion
 */
router.delete(
  "/:id",
  authenticateJWT,
  requireRole("mentor"),
  deleteLessonController,
);

export default router;
