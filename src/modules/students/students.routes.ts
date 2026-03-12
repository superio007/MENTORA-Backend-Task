import { Router } from "express";
import { authenticateJWT, requireRole } from "../auth/auth.middleware";
import {
  validateRequest,
  createStudentSchema,
} from "../../middleware/validation";
import {
  createStudentController,
  getStudentsController,
  getStudentByIdController,
  updateStudentController,
  deleteStudentController,
} from "./students.controller";

const router = Router();

/**
 * Students Routes
 * Validates: Requirements 3.1, 3.2, 3.4, 2.1, 2.2, 9.1
 */

/**
 * POST /students
 * Create a new student account
 * - Requires authentication (JWT)
 * - Requires parent role
 * - Validates request body against createStudentSchema
 */
router.post(
  "/",
  authenticateJWT,
  requireRole("parent"),
  validateRequest(createStudentSchema, "body"),
  createStudentController,
);

/**
 * GET /students
 * Get all students for the authenticated parent
 * - Requires authentication (JWT)
 * - Requires parent role
 * - Returns only students belonging to the authenticated parent
 */
router.get("/", authenticateJWT, requireRole("parent"), getStudentsController);

/**
 * GET /students/:id
 * Get a single student by ID
 * - Requires authentication (JWT)
 * - Requires parent role
 */
router.get(
  "/:id",
  authenticateJWT,
  requireRole("parent"),
  getStudentByIdController,
);

/**
 * PUT /students/:id
 * Update a student's information
 * - Requires authentication (JWT)
 * - Requires parent role
 * - Validates request body against createStudentSchema
 * - Verifies parent ownership before allowing update
 */
router.put(
  "/:id",
  authenticateJWT,
  requireRole("parent"),
  validateRequest(createStudentSchema, "body"),
  updateStudentController,
);

/**
 * DELETE /students/:id
 * Delete a student account
 * - Requires authentication (JWT)
 * - Requires parent role
 * - Verifies parent ownership before allowing deletion
 */
router.delete(
  "/:id",
  authenticateJWT,
  requireRole("parent"),
  deleteStudentController,
);

export default router;
