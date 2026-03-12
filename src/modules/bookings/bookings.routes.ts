import { Router } from "express";
import { authenticateJWT, requireRole } from "../auth/auth.middleware";
import {
  validateRequest,
  createBookingSchema,
} from "../../middleware/validation";
import {
  createBookingController,
  getBookingsController,
  deleteBookingController,
} from "./bookings.controller";

const router = Router();

/**
 * Bookings Routes
 * Validates: Requirements 5.1, 5.4, 5.5, 5.8, 2.1, 2.2, 9.1
 */

/**
 * POST /bookings
 * Create a new booking
 * - Requires authentication (JWT)
 * - Requires parent role
 * - Validates request body against createBookingSchema
 * - Verifies parent owns student
 * - Checks lesson capacity
 * - Returns 409 for duplicate bookings
 * - Returns 400 when capacity exceeded
 * - Returns 403 when parent doesn't own student
 */
router.post(
  "/",
  authenticateJWT,
  requireRole("parent"),
  validateRequest(createBookingSchema, "body"),
  createBookingController,
);

/**
 * GET /bookings
 * Get all bookings (filtered by role)
 * - Requires authentication (JWT)
 * - Parents: see bookings for their students
 * - Mentors: see bookings for their lessons
 * - Students: see their own bookings
 */
router.get("/", authenticateJWT, getBookingsController);

/**
 * DELETE /bookings/:id
 * Cancel a booking
 * - Requires authentication (JWT)
 * - Parents can delete bookings for their students
 * - Mentors can delete bookings for their lessons
 */
router.delete("/:id", authenticateJWT, deleteBookingController);

export default router;
