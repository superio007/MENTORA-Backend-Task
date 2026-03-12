import { Request, Response } from "express";
import {
  createBooking,
  getBookingsByStudentId,
  getBookingsByLessonId,
  getBookingById,
  deleteBooking,
  getBookingCountForLesson,
} from "./bookings.service";
import { getStudentById } from "../students/students.service";
import { getLessonById } from "../lessons/lessons.service";
import { log } from "../../utils/logger";

/**
 * Create a new booking
 * POST /bookings
 * Validates: Requirements 5.1, 5.4, 5.5, 5.8
 *
 * Only accessible by parents (enforced by requireRole middleware)
 * Verifies parent owns the student being booked
 * Checks lesson capacity before creating booking
 */
export async function createBookingController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { studentId, lessonId } = req.body;
    const parentId = req.user!.userId; // Set by authenticateJWT middleware

    log.info("Creating booking", {
      parentId,
      studentId,
      lessonId,
      path: req.path,
    });

    // Verify student exists and belongs to the parent
    const student = await getStudentById(studentId);

    if (!student) {
      log.warn("Booking creation failed: Student not found", {
        studentId,
        parentId,
      });
      res.status(404).json({
        error: {
          message: "Student not found",
          code: "NOT_FOUND",
        },
      });
      return;
    }

    // Verify parent ownership (Requirement 5.1)
    if (student.parent_id !== parentId) {
      log.warn("Booking creation failed: Parent does not own student", {
        studentId,
        parentId,
        actualParentId: student.parent_id,
      });
      res.status(403).json({
        error: {
          message: "Insufficient permissions",
          code: "FORBIDDEN",
        },
      });
      return;
    }

    // Verify lesson exists
    const lesson = await getLessonById(lessonId);

    if (!lesson) {
      log.warn("Booking creation failed: Lesson not found", {
        lessonId,
        parentId,
      });
      res.status(404).json({
        error: {
          message: "Lesson not found",
          code: "NOT_FOUND",
        },
      });
      return;
    }

    // Check current booking count against lesson capacity (Requirement 5.8)
    const currentBookings = await getBookingCountForLesson(lessonId);

    if (currentBookings >= lesson.capacity) {
      log.warn("Booking creation failed: Lesson capacity exceeded", {
        lessonId,
        currentBookings,
        capacity: lesson.capacity,
        parentId,
      });
      res.status(400).json({
        error: {
          message: "Lesson capacity exceeded",
          code: "CAPACITY_EXCEEDED",
        },
      });
      return;
    }

    // Create the booking
    const booking = await createBooking(studentId, lessonId);

    log.info("Booking created successfully", {
      bookingId: booking.id,
      studentId,
      lessonId,
      parentId,
    });

    res.status(201).json({
      id: booking.id,
      studentId: booking.student_id,
      lessonId: booking.lesson_id,
      createdAt: booking.created_at,
    });
  } catch (error: any) {
    // Handle database constraint violations
    if (error.code === "23505") {
      // Unique constraint violation (duplicate booking) - Requirement 5.5
      log.warn("Booking creation failed: Duplicate booking", {
        studentId: req.body.studentId,
        lessonId: req.body.lessonId,
        parentId: req.user!.userId,
      });
      res.status(409).json({
        error: {
          message: "Student is already booked for this lesson",
          code: "DUPLICATE_BOOKING",
        },
      });
      return;
    }

    if (error.code === "23503") {
      // Foreign key constraint violation
      log.error("Booking creation failed: Invalid reference", {
        studentId: req.body.studentId,
        lessonId: req.body.lessonId,
        parentId: req.user!.userId,
      });
      res.status(400).json({
        error: {
          message: "Invalid student or lesson reference",
          code: "INVALID_REFERENCE",
        },
      });
      return;
    }

    // Unexpected error
    log.error("Booking creation error", error, {
      path: req.path,
      parentId: req.user!.userId,
    });
    res.status(500).json({
      error: {
        message: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
    });
  }
}

/**
 * Get all bookings (filtered by role)
 * GET /bookings
 *
 * Returns bookings based on user role:
 * - Parents: bookings for their students
 * - Mentors: bookings for their lessons
 * - Students: their own bookings
 */
export async function getBookingsController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    log.debug("Fetching bookings", {
      userId,
      userRole,
      path: req.path,
    });

    let bookings: any[] = [];

    if (userRole === "parent") {
      // Get all students for this parent, then get bookings for each
      const { getStudentsByParentId } =
        await import("../students/students.service");
      const students = await getStudentsByParentId(userId);

      // Get bookings for all students
      const bookingPromises = students.map((student) =>
        getBookingsByStudentId(student.id),
      );
      const bookingArrays = await Promise.all(bookingPromises);
      bookings = bookingArrays.flat();
    } else if (userRole === "mentor") {
      // Get all lessons for this mentor, then get bookings for each
      const { getLessonsByMentorId } =
        await import("../lessons/lessons.service");
      const lessons = await getLessonsByMentorId(userId);

      // Get bookings for all lessons
      const bookingPromises = lessons.map((lesson) =>
        getBookingsByLessonId(lesson.id),
      );
      const bookingArrays = await Promise.all(bookingPromises);
      bookings = bookingArrays.flat();
    } else if (userRole === "student") {
      // Students can view their own bookings
      // Note: In this system, students are separate from users
      // This would need to be adjusted based on actual student-user relationship
      bookings = [];
    }

    log.debug("Bookings fetched successfully", {
      userId,
      userRole,
      count: bookings.length,
    });

    res.status(200).json({
      bookings: bookings.map((booking) => ({
        id: booking.id,
        studentId: booking.student_id,
        lessonId: booking.lesson_id,
        createdAt: booking.created_at,
      })),
    });
  } catch (error) {
    log.error("Get bookings error", error, {
      path: req.path,
      userId: req.user!.userId,
    });
    res.status(500).json({
      error: {
        message: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
    });
  }
}

/**
 * Delete a booking
 * DELETE /bookings/:id
 *
 * Cancels a booking
 */
export async function deleteBookingController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    log.info("Deleting booking", {
      bookingId: id,
      userId,
      userRole,
      path: req.path,
    });

    // Verify booking exists
    const booking = await getBookingById(id);

    if (!booking) {
      log.warn("Delete failed: Booking not found", {
        bookingId: id,
        userId,
      });
      res.status(404).json({
        error: {
          message: "Booking not found",
          code: "NOT_FOUND",
        },
      });
      return;
    }

    // Verify authorization based on role
    if (userRole === "parent") {
      // Parent must own the student
      const student = await getStudentById(booking.student_id);
      if (!student || student.parent_id !== userId) {
        log.warn("Delete failed: Parent does not own student", {
          bookingId: id,
          userId,
          studentId: booking.student_id,
        });
        res.status(403).json({
          error: {
            message: "Insufficient permissions",
            code: "FORBIDDEN",
          },
        });
        return;
      }
    } else if (userRole === "mentor") {
      // Mentor must own the lesson
      const lesson = await getLessonById(booking.lesson_id);
      if (!lesson || lesson.mentor_id !== userId) {
        log.warn("Delete failed: Mentor does not own lesson", {
          bookingId: id,
          userId,
          lessonId: booking.lesson_id,
        });
        res.status(403).json({
          error: {
            message: "Insufficient permissions",
            code: "FORBIDDEN",
          },
        });
        return;
      }
    }

    // Delete the booking
    await deleteBooking(id);

    log.info("Booking deleted successfully", {
      bookingId: id,
      userId,
    });

    res.status(204).send();
  } catch (error) {
    log.error("Booking deletion error", error, {
      path: req.path,
      bookingId: req.params.id,
    });
    res.status(500).json({
      error: {
        message: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
    });
  }
}
