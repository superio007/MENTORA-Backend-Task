import { query } from "../../config/database";

/**
 * Session interface for database queries
 */
export interface Session {
  id: string;
  lesson_id: string;
  scheduled_at: Date;
  duration_minutes: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Create a new session
 * Validates: Requirements 6.1
 *
 * @param lessonId - Lesson's unique identifier (foreign key to lessons table)
 * @param scheduledAt - Scheduled date and time for the session
 * @param durationMinutes - Duration of the session in minutes (must be > 0)
 * @param notes - Optional notes for the session
 * @returns Created session object
 * @throws Error with code '23503' for invalid foreign keys (non-existent lessonId)
 * @throws Error with code '23514' for check constraint violations (duration <= 0)
 */
export async function createSession(
  lessonId: string,
  scheduledAt: Date,
  durationMinutes: number,
  notes?: string,
): Promise<Session> {
  const result = await query<Session>(
    `INSERT INTO sessions (lesson_id, scheduled_at, duration_minutes, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING id, lesson_id, scheduled_at, duration_minutes, notes, created_at, updated_at`,
    [lessonId, scheduledAt, durationMinutes, notes || null],
  );

  return result.rows[0];
}

/**
 * Get all sessions for lessons owned by a specific mentor
 * Validates: Requirements 6.4
 *
 * This function returns sessions by joining with the lessons table
 * to ensure only sessions for lessons owned by the mentor are returned
 *
 * @param mentorId - Mentor's user ID
 * @returns Array of session objects for lessons owned by the mentor
 */
export async function getSessionsByMentorId(
  mentorId: string,
): Promise<Session[]> {
  const result = await query<Session>(
    `SELECT s.id, s.lesson_id, s.scheduled_at, s.duration_minutes, s.notes, s.created_at, s.updated_at
     FROM sessions s
     INNER JOIN lessons l ON s.lesson_id = l.id
     WHERE l.mentor_id = $1
     ORDER BY s.scheduled_at DESC`,
    [mentorId],
  );

  return result.rows;
}

/**
 * Get a single session by ID
 *
 * @param sessionId - Session's unique identifier
 * @returns Session object if found, null otherwise
 */
export async function getSessionById(
  sessionId: string,
): Promise<Session | null> {
  const result = await query<Session>(
    `SELECT id, lesson_id, scheduled_at, duration_minutes, notes, created_at, updated_at
     FROM sessions
     WHERE id = $1`,
    [sessionId],
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Update a session's information
 * Validates: Requirements 6.5
 *
 * @param sessionId - Session's unique identifier
 * @param scheduledAt - Updated scheduled date and time (optional)
 * @param durationMinutes - Updated duration in minutes (optional)
 * @param notes - Updated notes (optional)
 * @returns Updated session object if found, null otherwise
 */
export async function updateSession(
  sessionId: string,
  scheduledAt?: Date,
  durationMinutes?: number,
  notes?: string,
): Promise<Session | null> {
  // Build dynamic update query based on provided fields
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (scheduledAt !== undefined) {
    updates.push(`scheduled_at = $${paramIndex++}`);
    values.push(scheduledAt);
  }

  if (durationMinutes !== undefined) {
    updates.push(`duration_minutes = $${paramIndex++}`);
    values.push(durationMinutes);
  }

  if (notes !== undefined) {
    updates.push(`notes = $${paramIndex++}`);
    values.push(notes);
  }

  // Always update the updated_at timestamp
  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  // Add sessionId as the last parameter
  values.push(sessionId);

  const result = await query<Session>(
    `UPDATE sessions
     SET ${updates.join(", ")}
     WHERE id = $${paramIndex}
     RETURNING id, lesson_id, scheduled_at, duration_minutes, notes, created_at, updated_at`,
    values,
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Delete a session
 *
 * @param sessionId - Session's unique identifier
 * @returns True if session was deleted, false if not found
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  const result = await query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Get the mentor ID for a session by checking the associated lesson
 * Used for ownership verification
 * Validates: Requirements 6.1, 6.5
 *
 * @param sessionId - Session's unique identifier
 * @returns Mentor's user ID if session exists, null otherwise
 */
export async function getMentorIdForSession(
  sessionId: string,
): Promise<string | null> {
  const result = await query<{ mentor_id: string }>(
    `SELECT l.mentor_id
     FROM sessions s
     INNER JOIN lessons l ON s.lesson_id = l.id
     WHERE s.id = $1`,
    [sessionId],
  );

  return result.rows.length > 0 ? result.rows[0].mentor_id : null;
}

/**
 * Get the mentor ID for a lesson
 * Used for ownership verification when creating sessions
 * Validates: Requirements 6.1
 *
 * @param lessonId - Lesson's unique identifier
 * @returns Mentor's user ID if lesson exists, null otherwise
 */
export async function getMentorIdForLesson(
  lessonId: string,
): Promise<string | null> {
  const result = await query<{ mentor_id: string }>(
    `SELECT mentor_id
     FROM lessons
     WHERE id = $1`,
    [lessonId],
  );

  return result.rows.length > 0 ? result.rows[0].mentor_id : null;
}
