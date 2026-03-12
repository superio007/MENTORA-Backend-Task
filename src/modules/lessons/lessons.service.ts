import { query } from "../../config/database";

/**
 * Lesson interface for database queries
 */
export interface Lesson {
  id: string;
  title: string;
  description: string | null;
  capacity: number;
  mentor_id: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Paginated response interface
 */
export interface PaginatedLessons {
  data: Lesson[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Create a new lesson
 * Validates: Requirements 4.1, 4.2
 *
 * @param title - Lesson title
 * @param description - Lesson description (optional)
 * @param capacity - Maximum number of students (must be > 0)
 * @param mentorId - Mentor's user ID (foreign key to users table)
 * @returns Created lesson object
 */
export async function createLesson(
  title: string,
  description: string | undefined,
  capacity: number,
  mentorId: string,
): Promise<Lesson> {
  const result = await query<Lesson>(
    `INSERT INTO lessons (title, description, capacity, mentor_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING id, title, description, capacity, mentor_id, created_at, updated_at`,
    [title, description || null, capacity, mentorId],
  );

  return result.rows[0];
}

/**
 * Get paginated list of all lessons
 * Validates: Requirements 4.6, 13.1, 13.2, 13.3
 *
 * @param page - Page number (1-indexed)
 * @param limit - Number of results per page
 * @returns Paginated lessons with metadata
 */
export async function getLessonsPaginated(
  page: number,
  limit: number,
): Promise<PaginatedLessons> {
  // Calculate offset
  const offset = (page - 1) * limit;

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM lessons`,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get paginated results
  const result = await query<Lesson>(
    `SELECT id, title, description, capacity, mentor_id, created_at, updated_at
     FROM lessons
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single lesson by ID
 * Validates: Requirements 4.7, 4.8
 *
 * @param lessonId - Lesson's unique identifier
 * @returns Lesson object if found, null otherwise
 */
export async function getLessonById(lessonId: string): Promise<Lesson | null> {
  const result = await query<Lesson>(
    `SELECT id, title, description, capacity, mentor_id, created_at, updated_at
     FROM lessons
     WHERE id = $1`,
    [lessonId],
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get all lessons for a specific mentor
 * Validates: Requirements 4.4
 *
 * @param mentorId - Mentor's user ID
 * @returns Array of lesson objects belonging to the mentor
 */
export async function getLessonsByMentorId(
  mentorId: string,
): Promise<Lesson[]> {
  const result = await query<Lesson>(
    `SELECT id, title, description, capacity, mentor_id, created_at, updated_at
     FROM lessons
     WHERE mentor_id = $1
     ORDER BY created_at DESC`,
    [mentorId],
  );

  return result.rows;
}

/**
 * Update a lesson's information
 * Validates: Requirements 4.4
 *
 * @param lessonId - Lesson's unique identifier
 * @param title - Updated title (optional)
 * @param description - Updated description (optional)
 * @param capacity - Updated capacity (optional)
 * @returns Updated lesson object if found, null otherwise
 */
export async function updateLesson(
  lessonId: string,
  title?: string,
  description?: string,
  capacity?: number,
): Promise<Lesson | null> {
  // Build dynamic update query based on provided fields
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(title);
  }

  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(description);
  }

  if (capacity !== undefined) {
    updates.push(`capacity = $${paramIndex++}`);
    values.push(capacity);
  }

  // Always update the updated_at timestamp
  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  // Add lessonId as the last parameter
  values.push(lessonId);

  const result = await query<Lesson>(
    `UPDATE lessons
     SET ${updates.join(", ")}
     WHERE id = $${paramIndex}
     RETURNING id, title, description, capacity, mentor_id, created_at, updated_at`,
    values,
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Delete a lesson
 *
 * @param lessonId - Lesson's unique identifier
 * @returns True if lesson was deleted, false if not found
 */
export async function deleteLesson(lessonId: string): Promise<boolean> {
  const result = await query(`DELETE FROM lessons WHERE id = $1`, [lessonId]);

  return result.rowCount !== null && result.rowCount > 0;
}
