import { Request, Response } from "express";
import {
  createSession,
  getSessionsByMentorId,
  getSessionById,
  updateSession,
  deleteSession,
  getMentorIdForSession,
  getMentorIdForLesson,
} from "./sessions.service";
import { log } from "../../utils/logger";

/**
 * Create a new session
 * POST /sessions
 * Validates: Requirements 6.1
 *
 * Only accessible by mentors (enforced by requireRole middleware)
 * Verifies mentor owns the associated lesson before creating session
 */
export async function createSessionController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { lessonId, scheduledAt, durationMinutes, notes } = req.body;
    const mentorId = req.user!.userId; // Set by authenticateJWT middleware

    log.info("Creating session", {
      mentorId,
      lessonId,
      scheduledAt,
      path: req.path,
    });

    // Verify mentor owns the lesson
    const lessonMentorId = await getMentorIdForLesson(lessonId);

    if (!lessonMentorId) {
      log.warn("Session creation failed: Lesson not found", {
        lessonId,
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

    if (lessonMentorId !== mentorId) {
      log.warn("Session creation failed: Mentor does not own lesson", {
        lessonId,
        mentorId,
        actualMentorId: lessonMentorId,
      });
      res.status(403).json({
        error: {
          message: "Insufficient permissions",
          code: "FORBIDDEN",
        },
      });
      return;
    }

    // Create session
    const session = await createSession(
      lessonId,
      new Date(scheduledAt),
      durationMinutes,
      notes,
    );

    log.info("Session created successfully", {
      sessionId: session.id,
      lessonId,
      mentorId,
    });

    res.status(201).json({
      id: session.id,
      lessonId: session.lesson_id,
      scheduledAt: session.scheduled_at,
      durationMinutes: session.duration_minutes,
      notes: session.notes,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    });
  } catch (error: any) {
    // Handle database constraint violations
    if (error.code === "23503") {
      // Foreign key constraint violation (invalid lessonId)
      log.error("Session creation failed: Invalid lesson ID", {
        lessonId: req.body.lessonId,
        mentorId: req.user!.userId,
      });
      res.status(400).json({
        error: {
          message: "Invalid lesson reference",
          code: "INVALID_REFERENCE",
        },
      });
      return;
    }

    if (error.code === "23514") {
      // Check constraint violation (duration <= 0)
      log.warn("Session creation failed: Invalid duration", {
        durationMinutes: req.body.durationMinutes,
        mentorId: req.user!.userId,
      });
      res.status(400).json({
        error: {
          message: "Duration must be greater than 0",
          code: "INVALID_DURATION",
        },
      });
      return;
    }

    // Unexpected error
    log.error("Session creation error", error, {
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
 * Get all sessions for the authenticated mentor's lessons
 * GET /sessions
 * Validates: Requirements 6.4
 *
 * Only accessible by mentors (enforced by requireRole middleware)
 * Returns only sessions for lessons owned by the authenticated mentor
 */
export async function getSessionsController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const mentorId = req.user!.userId;

    log.debug("Fetching sessions for mentor", {
      mentorId,
      path: req.path,
    });

    // Get sessions for mentor's lessons
    const sessions = await getSessionsByMentorId(mentorId);

    log.debug("Sessions fetched successfully", {
      mentorId,
      count: sessions.length,
    });

    res.status(200).json({
      sessions: sessions.map((session) => ({
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
    log.error("Get sessions error", error, {
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
 * Get a single session by ID
 * GET /sessions/:id
 *
 * Returns session details if found
 */
export async function getSessionByIdController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;

    log.debug("Fetching session by ID", {
      sessionId: id,
      path: req.path,
    });

    const session = await getSessionById(id);

    if (!session) {
      log.warn("Session not found", {
        sessionId: id,
      });
      res.status(404).json({
        error: {
          message: "Session not found",
          code: "NOT_FOUND",
        },
      });
      return;
    }

    log.debug("Session fetched successfully", {
      sessionId: id,
    });

    res.status(200).json({
      id: session.id,
      lessonId: session.lesson_id,
      scheduledAt: session.scheduled_at,
      durationMinutes: session.duration_minutes,
      notes: session.notes,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    });
  } catch (error) {
    log.error("Get session by ID error", error, {
      path: req.path,
      sessionId: req.params.id,
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
 * Update a session's information
 * PUT /sessions/:id
 * Validates: Requirements 6.5
 *
 * Only accessible by mentors (enforced by requireRole middleware)
 * Verifies mentor owns the associated lesson before allowing update
 */
export async function updateSessionController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const { scheduledAt, durationMinutes, notes } = req.body;
    const mentorId = req.user!.userId;

    log.info("Updating session", {
      sessionId: id,
      mentorId,
      path: req.path,
    });

    // First, verify the session exists
    const existingSession = await getSessionById(id);

    if (!existingSession) {
      log.warn("Update failed: Session not found", {
        sessionId: id,
        mentorId,
      });
      res.status(404).json({
        error: {
          message: "Session not found",
          code: "NOT_FOUND",
        },
      });
      return;
    }

    // Verify mentor owns the lesson associated with the session
    const sessionMentorId = await getMentorIdForSession(id);

    if (!sessionMentorId) {
      log.error("Update failed: Could not determine session ownership", {
        sessionId: id,
        mentorId,
      });
      res.status(500).json({
        error: {
          message: "An unexpected error occurred",
          code: "INTERNAL_ERROR",
        },
      });
      return;
    }

    if (sessionMentorId !== mentorId) {
      log.warn("Update failed: Mentor does not own session's lesson", {
        sessionId: id,
        mentorId,
        actualMentorId: sessionMentorId,
      });
      res.status(403).json({
        error: {
          message: "Insufficient permissions",
          code: "FORBIDDEN",
        },
      });
      return;
    }

    // Update the session
    const updatedSession = await updateSession(
      id,
      scheduledAt ? new Date(scheduledAt) : undefined,
      durationMinutes,
      notes,
    );

    log.info("Session updated successfully", {
      sessionId: id,
      mentorId,
    });

    res.status(200).json({
      id: updatedSession!.id,
      lessonId: updatedSession!.lesson_id,
      scheduledAt: updatedSession!.scheduled_at,
      durationMinutes: updatedSession!.duration_minutes,
      notes: updatedSession!.notes,
      createdAt: updatedSession!.created_at,
      updatedAt: updatedSession!.updated_at,
    });
  } catch (error: any) {
    // Handle database constraint violations
    if (error.code === "23514") {
      // Check constraint violation (duration <= 0)
      log.warn("Session update failed: Invalid duration", {
        sessionId: req.params.id,
        durationMinutes: req.body.durationMinutes,
      });
      res.status(400).json({
        error: {
          message: "Duration must be greater than 0",
          code: "INVALID_DURATION",
        },
      });
      return;
    }

    // Unexpected error
    log.error("Session update error", error, {
      path: req.path,
      sessionId: req.params.id,
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
 * Delete a session
 * DELETE /sessions/:id
 *
 * Only accessible by mentors (enforced by requireRole middleware)
 * Verifies mentor owns the associated lesson before allowing deletion
 */
export async function deleteSessionController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const mentorId = req.user!.userId;

    log.info("Deleting session", {
      sessionId: id,
      mentorId,
      path: req.path,
    });

    // First, verify the session exists
    const existingSession = await getSessionById(id);

    if (!existingSession) {
      log.warn("Delete failed: Session not found", {
        sessionId: id,
        mentorId,
      });
      res.status(404).json({
        error: {
          message: "Session not found",
          code: "NOT_FOUND",
        },
      });
      return;
    }

    // Verify mentor owns the lesson associated with the session
    const sessionMentorId = await getMentorIdForSession(id);

    if (!sessionMentorId) {
      log.error("Delete failed: Could not determine session ownership", {
        sessionId: id,
        mentorId,
      });
      res.status(500).json({
        error: {
          message: "An unexpected error occurred",
          code: "INTERNAL_ERROR",
        },
      });
      return;
    }

    if (sessionMentorId !== mentorId) {
      log.warn("Delete failed: Mentor does not own session's lesson", {
        sessionId: id,
        mentorId,
        actualMentorId: sessionMentorId,
      });
      res.status(403).json({
        error: {
          message: "Insufficient permissions",
          code: "FORBIDDEN",
        },
      });
      return;
    }

    // Delete the session
    await deleteSession(id);

    log.info("Session deleted successfully", {
      sessionId: id,
      mentorId,
    });

    res.status(204).send();
  } catch (error) {
    log.error("Session deletion error", error, {
      path: req.path,
      sessionId: req.params.id,
    });
    res.status(500).json({
      error: {
        message: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
    });
  }
}
