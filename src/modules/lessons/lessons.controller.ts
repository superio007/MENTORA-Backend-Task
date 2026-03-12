import { Request, Response } from "express";
import {
  createLesson,
  getLessonsPaginated,
  getLessonById,
  updateLesson,
  deleteLesson,
} from "./lessons.service";
import { log } from "../../utils/logger";

/**
 * Create a new lesson
 * POST /lessons
 * Validates: Requirements 4.1, 4.2
 *
 * Only accessible by mentors (enforced by requireRole middleware)
 * Automatically associates lesson with authenticated mentor
 */
export async function createLessonController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { title, description, capacity } = req.body;
    const mentorId = req.user!.userId; // Set by authenticateJWT middleware

    log.info("Creating lesson", {
      mentorId,
      title,
      capacity,
      path: req.path,
    });

    // Create lesson with mentor's user ID
    const lesson = await createLesson(title, description, capacity, mentorId);

    log.info("Lesson created successfully", {
      lessonId: lesson.id,
      mentorId,
    });

    res.status(201).json({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      capacity: lesson.capacity,
      mentorId: lesson.mentor_id,
      createdAt: lesson.created_at,
      updatedAt: lesson.updated_at,
    });
  } catch (error: any) {
    // Handle database constraint violations
    if (error.code === "23503") {
      // Foreign key constraint violation (invalid mentorId)
      log.error("Lesson creation failed: Invalid mentor ID", {
        mentorId: req.user!.userId,
      });
      res.status(400).json({
        error: {
          message: "Invalid mentor reference",
          code: "INVALID_REFERENCE",
        },
      });
      return;
    }

    if (error.code === "23514") {
      // Check constraint violation (capacity <= 0)
      log.warn("Lesson creation failed: Invalid capacity", {
        capacity: req.body.capacity,
        mentorId: req.user!.userId,
      });
      res.status(400).json({
        error: {
          message: "Capacity must be greater than 0",
          code: "INVALID_CAPACITY",
        },
      });
      return;
    }

    // Unexpected error
    log.error("Lesson creation error", error, {
      path: req.path,
      mentorId: req.user!.userId,
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
 * Get paginated list of all lessons
 * GET /lessons
 * Validates: Requirements 4.6, 13.1, 13.2, 13.3
 *
 * Public endpoint - returns all lessons with pagination
 */
export async function getLessonsController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    // Pagination parameters are validated and transformed by middleware
    const page = req.query.page as unknown as number;
    const limit = req.query.limit as unknown as number;

    log.debug("Fetching paginated lessons", {
      page,
      limit,
      path: req.path,
    });

    // Get paginated lessons
    const result = await getLessonsPaginated(page, limit);

    log.debug("Lessons fetched successfully", {
      page,
      limit,
      total: result.pagination.total,
      count: result.data.length,
    });

    res.status(200).json({
      lessons: result.data.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        capacity: lesson.capacity,
        mentorId: lesson.mentor_id,
        createdAt: lesson.created_at,
        updatedAt: lesson.updated_at,
      })),
      pagination: result.pagination,
    });
  } catch (error) {
    log.error("Get lessons error", error, {
      path: req.path,
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
 * Get a single lesson by ID
 * GET /lessons/:id
 * Validates: Requirements 4.7, 4.8
 *
 * Public endpoint - returns lesson details if found
 */
export async function getLessonByIdController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;

    log.debug("Fetching lesson by ID", {
      lessonId: id,
      path: req.path,
    });

    const lesson = await getLessonById(id);

    if (!lesson) {
      log.warn("Lesson not found", {
        lessonId: id,
      });
      res.status(404).json({
        error: {
          message: "Lesson not found",
          code: "NOT_FOUND",
        },
      });
      return;
    }

    log.debug("Lesson fetched successfully", {
      lessonId: id,
    });

    res.status(200).json({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      capacity: lesson.capacity,
      mentorId: lesson.mentor_id,
      createdAt: lesson.created_at,
      updatedAt: lesson.updated_at,
    });
  } catch (error) {
    log.error("Get lesson by ID error", error, {
      path: req.path,
      lessonId: req.params.id,
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
 * Update a lesson's information
 * PUT /lessons/:id
 * Validates: Requirements 4.4
 *
 * Only accessible by the mentor who owns the lesson
 * Ownership verification is performed before update
 */
export async function updateLessonController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const { title, description, capacity } = req.body;
    const mentorId = req.user!.userId;

    log.info("Updating lesson", {
      lessonId: id,
      mentorId,
      path: req.path,
    });

    // First, verify the lesson exists and belongs to the mentor
    const existingLesson = await getLessonById(id);

    if (!existingLesson) {
      log.warn("Update failed: Lesson not found", {
        lessonId: id,
        mentorId,
      });
      res.status(404).json({
        error: {
          message: "Lesson not found",
          code: "NOT_FOUND",
        },
      });
      return;
    }

    // Verify mentor ownership
    if (existingLesson.mentor_id !== mentorId) {
      log.warn("Update failed: Mentor does not own lesson", {
        lessonId: id,
        mentorId,
        actualMentorId: existingLesson.mentor_id,
      });
      res.status(403).json({
        error: {
          message: "Insufficient permissions",
          code: "FORBIDDEN",
        },
      });
      return;
    }

    // Update the lesson
    const updatedLesson = await updateLesson(id, title, description, capacity);

    log.info("Lesson updated successfully", {
      lessonId: id,
      mentorId,
    });

    res.status(200).json({
      id: updatedLesson!.id,
      title: updatedLesson!.title,
      description: updatedLesson!.description,
      capacity: updatedLesson!.capacity,
      mentorId: updatedLesson!.mentor_id,
      createdAt: updatedLesson!.created_at,
      updatedAt: updatedLesson!.updated_at,
    });
  } catch (error: any) {
    // Handle database constraint violations
    if (error.code === "23514") {
      // Check constraint violation (capacity <= 0)
      log.warn("Lesson update failed: Invalid capacity", {
        lessonId: req.params.id,
        capacity: req.body.capacity,
      });
      res.status(400).json({
        error: {
          message: "Capacity must be greater than 0",
          code: "INVALID_CAPACITY",
        },
      });
      return;
    }

    // Unexpected error
    log.error("Lesson update error", error, {
      path: req.path,
      lessonId: req.params.id,
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
 * Get all sessions for a specific lesson
 * GET /lessons/:id/sessions
 * Validates: Requirements 6.1
 *
 * Public endpoint - returns all sessions for a lesson
 */
export async function getLessonSessionsController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;

    log.debug("Fetching sessions for lesson", {
      lessonId: id,
      path: req.path,
    });

    // First verify the lesson exists
    const lesson = await getLessonById(id);

    if (!lesson) {
      log.warn("Lesson not found", {
        lessonId: id,
      });
      res.status(404).json({
        error: {
          message: "Lesson not found",
          code: "NOT_FOUND",
        },
      });
      return;
    }

    // Get sessions for this lesson
    const { query } = await import("../../config/database");
    const result = await query(
      `SELECT id, lesson_id, scheduled_at, duration_minutes, notes, created_at, updated_at
       FROM sessions
       WHERE lesson_id = $1
       ORDER BY scheduled_at ASC`,
      [id],
    );

    log.debug("Sessions fetched successfully", {
      lessonId: id,
      count: result.rows.length,
    });

    res.status(200).json({
      lessonId: id,
      sessions: result.rows.map((session: any) => ({
        id: session.id,
        lessonId: session.lesson_id,
        scheduledAt: session.scheduled_at,
        durationMinutes: session.duration_minutes,
        notes: session.notes,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      })),
    });
  } catch (error) {
    log.error("Get lesson sessions error", error, {
      path: req.path,
      lessonId: req.params.id,
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
 * Delete a lesson
 * DELETE /lessons/:id
 *
 * Only accessible by the mentor who owns the lesson
 * Ownership verification is performed before deletion
 */
export async function deleteLessonController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const mentorId = req.user!.userId;

    log.info("Deleting lesson", {
      lessonId: id,
      mentorId,
      path: req.path,
    });

    // First, verify the lesson exists and belongs to the mentor
    const existingLesson = await getLessonById(id);

    if (!existingLesson) {
      log.warn("Delete failed: Lesson not found", {
        lessonId: id,
        mentorId,
      });
      res.status(404).json({
        error: {
          message: "Lesson not found",
          code: "NOT_FOUND",
        },
      });
      return;
    }

    // Verify mentor ownership
    if (existingLesson.mentor_id !== mentorId) {
      log.warn("Delete failed: Mentor does not own lesson", {
        lessonId: id,
        mentorId,
        actualMentorId: existingLesson.mentor_id,
      });
      res.status(403).json({
        error: {
          message: "Insufficient permissions",
          code: "FORBIDDEN",
        },
      });
      return;
    }

    // Delete the lesson
    await deleteLesson(id);

    log.info("Lesson deleted successfully", {
      lessonId: id,
      mentorId,
    });

    res.status(204).send();
  } catch (error) {
    log.error("Lesson deletion error", error, {
      path: req.path,
      lessonId: req.params.id,
    });
    res.status(500).json({
      error: {
        message: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
    });
  }
}
