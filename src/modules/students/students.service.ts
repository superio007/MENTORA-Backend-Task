import { query } from "../../config/database";

/**
 * Student interface for database queries
 */
export interface Student {
  id: string;
  name: string;
  email: string;
  parent_id: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Create a new student account
 * Validates: Requirements 3.1
 *
 * @param name - Student's name
 * @param email - Student's email address
 * @param parentId - Parent's user ID (foreign key to users table)
 * @returns Created student object
 */
export async function createStudent(
  name: string,
  email: string,
  parentId: string,
): Promise<Student> {
  const result = await query<Student>(
    `INSERT INTO students (name, email, parent_id, created_at, updated_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING id, name, email, parent_id, created_at, updated_at`,
    [name, email, parentId],
  );

  return result.rows[0];
}

/**
 * Get all students for a specific parent
 * Validates: Requirements 3.2
 *
 * @param parentId - Parent's user ID
 * @returns Array of student objects belonging to the parent
 */
export async function getStudentsByParentId(
  parentId: string,
): Promise<Student[]> {
  const result = await query<Student>(
    `SELECT id, name, email, parent_id, created_at, updated_at
     FROM students
     WHERE parent_id = $1
     ORDER BY created_at DESC`,
    [parentId],
  );

  return result.rows;
}

/**
 * Get a single student by ID
 *
 * @param studentId - Student's unique identifier
 * @returns Student object if found, null otherwise
 */
export async function getStudentById(
  studentId: string,
): Promise<Student | null> {
  const result = await query<Student>(
    `SELECT id, name, email, parent_id, created_at, updated_at
     FROM students
     WHERE id = $1`,
    [studentId],
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Update a student's information
 * Validates: Requirements 3.4
 *
 * @param studentId - Student's unique identifier
 * @param name - Updated name (optional)
 * @param email - Updated email (optional)
 * @returns Updated student object if found, null otherwise
 */
export async function updateStudent(
  studentId: string,
  name?: string,
  email?: string,
): Promise<Student | null> {
  // Build dynamic update query based on provided fields
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }

  if (email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    values.push(email);
  }

  // Always update the updated_at timestamp
  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  // Add studentId as the last parameter
  values.push(studentId);

  const result = await query<Student>(
    `UPDATE students
     SET ${updates.join(", ")}
     WHERE id = $${paramIndex}
     RETURNING id, name, email, parent_id, created_at, updated_at`,
    values,
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Delete a student account
 *
 * @param studentId - Student's unique identifier
 * @returns True if student was deleted, false if not found
 */
export async function deleteStudent(studentId: string): Promise<boolean> {
  const result = await query(`DELETE FROM students WHERE id = $1`, [studentId]);

  return result.rowCount !== null && result.rowCount > 0;
}
