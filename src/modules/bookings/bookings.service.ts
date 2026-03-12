import { query } from "../../config/database";

/**
 * Booking interface for database queries
 */
export interface Booking {
  id: string;
  student_id: string;
  lesson_id: string;
  created_at: Date;
}

/**
 * Create a new booking
 * Validates: Requirements 5.1, 5.4, 5.5, 5.8
 *
 * Business rules enforced:
 * - Parent must own the student being booked (checked by caller)
 * - Student cannot be booked twice for same lesson (UNIQUE constraint)
 * - Booking count cannot exceed lesson capacity (checked before insert)
 *
 * @param studentId - Student's unique identifier
 * @param lessonId - Lesson's unique identifier
 * @returns Created booking object
 * @throws Error with code '23505' for duplicate bookings
 * @throws Error with code '23503' for invalid foreign keys
 */
export async function createBooking(
  studentId: string,
  lessonId: string,
): Promise<Booking> {
  const result = await query<Booking>(
    `INSERT INTO bookings (student_id, lesson_id, created_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     RETURNING id, student_id, lesson_id, created_at`,
    [studentId, lessonId],
  );

  return result.rows[0];
}

/**
 * Get all bookings for a specific student
 * Validates: Requirements 5.6
 *
 * @param studentId - Student's unique identifier
 * @returns Array of booking objects for the student
 */
export async function getBookingsByStudentId(
  studentId: string,
): Promise<Booking[]> {
  const result = await query<Booking>(
    `SELECT id, student_id, lesson_id, created_at
     FROM bookings
     WHERE student_id = $1
     ORDER BY created_at DESC`,
    [studentId],
  );

  return result.rows;
}

/**
 * Get all bookings for a specific lesson
 * Validates: Requirements 5.7
 *
 * @param lessonId - Lesson's unique identifier
 * @returns Array of booking objects for the lesson
 */
export async function getBookingsByLessonId(
  lessonId: string,
): Promise<Booking[]> {
  const result = await query<Booking>(
    `SELECT id, student_id, lesson_id, created_at
     FROM bookings
     WHERE lesson_id = $1
     ORDER BY created_at DESC`,
    [lessonId],
  );

  return result.rows;
}

/**
 * Get a single booking by ID
 *
 * @param bookingId - Booking's unique identifier
 * @returns Booking object if found, null otherwise
 */
export async function getBookingById(
  bookingId: string,
): Promise<Booking | null> {
  const result = await query<Booking>(
    `SELECT id, student_id, lesson_id, created_at
     FROM bookings
     WHERE id = $1`,
    [bookingId],
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Delete a booking
 *
 * @param bookingId - Booking's unique identifier
 * @returns True if booking was deleted, false if not found
 */
export async function deleteBooking(bookingId: string): Promise<boolean> {
  const result = await query(`DELETE FROM bookings WHERE id = $1`, [bookingId]);

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Get the current booking count for a lesson
 * Used to enforce capacity limits
 * Validates: Requirements 5.8
 *
 * @param lessonId - Lesson's unique identifier
 * @returns Number of current bookings for the lesson
 */
export async function getBookingCountForLesson(
  lessonId: string,
): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM bookings
     WHERE lesson_id = $1`,
    [lessonId],
  );

  return parseInt(result.rows[0].count, 10);
}
