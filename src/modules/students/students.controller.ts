import { Request, Response } from "express";
import {
  createStudent,
  getStudentsByParentId,
  getStudentById,
  updateStudent,
  deleteStudent,
} from "./students.service";
import { log } from "../../utils/logger";

/**
 * Create a new student account
 * POST /students
 * Validates: Requirements 3.1
 *
 * Only accessible by parents (enforced by requireRole middleware)
 * Automatically associates student with authenticated parent
 */
export async function createStudentController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { name, email } = req.body;
    const parentId = req.user!.userId; // Set by authenticateJWT middleware

    log.info("Creating student", {
      parentId,
      email,
      path: req.path,
    });

    // Create student with parent's user ID
    const student = await createStudent(name, email, parentId);

    log.info("Student created successfully", {
      studentId: student.id,
      parentId,
    });

    res.status(201).json({
      id: student.id,
      name: student.name,
      email: student.email,
      parentId: student.parent_id,
      createdAt: student.created_at,
      updatedAt: student.updated_at,
    });
  } catch (error: any) {
    // Handle database constraint violations
    if (error.code === "23505") {
      // Unique constraint violation (duplicate email)
      log.warn("Student creation failed: Email already exists", {
        email: req.body.email,
        parentId: req.user!.userId,
      });
      res.status(409).json({
        error: {
          message: "Student with this email already exists",
          code: "DUPLICATE_EMAIL",
        },
      });
      return;
    }

    if (error.code === "23503") {
      // Foreign key constraint violation (invalid parentId)
      log.error("Student creation failed: Invalid parent ID", {
        parentId: req.user!.userId,
      });
      res.status(400).json({
        error: {
          message: "Invalid parent reference",
          code: "INVALID_REFERENCE",
        },
      });
      return;
    }

    // Unexpected error
    log.error("Student creation error", error, {
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
 * Get all students for the authenticated parent
 * GET /students
 * Validates: Requirements 3.2
 *
 * Returns only students belonging to the authenticated parent
 */
export async function getStudentsController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const parentId = req.user!.userId; // Set by authenticateJWT middleware

    log.debug("Fetching students for parent", {
      parentId,
      path: req.path,
    });

    // Get students filtered by parent ID
    const students = await getStudentsByParentId(parentId);

    log.debug("Students fetched successfully", {
      parentId,
      count: students.length,
    });

    res.status(200).json({
      students: students.map((student) => ({
        id: student.id,
        name: student.name,
        email: student.email,
        parentId: student.parent_id,
        createdAt: student.created_at,
        updatedAt: student.updated_at,
      })),
    });
  } catch (error) {
    log.error("Get students error", error, {
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
 * Get a single student by ID
 * GET /students/:id
 *
 * Returns student details if found
 */
export async function getStudentByIdController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;

    log.debug("Fetching student by ID", {
      studentId: id,
      userId: req.user!.userId,
      path: req.path,
    });

    const student = await getStudentById(id);

    if (!student) {
      log.warn("Student not found", {
        studentId: id,
        userId: req.user!.userId,
      });
      res.status(404).json({
        error: {
          message: "Student not found",
          code: "NOT_FOUND",
        },
      });
      return;
    }

    log.debug("Student fetched successfully", {
      studentId: id,
    });

    res.status(200).json({
      id: student.id,
      name: student.name,
      email: student.email,
      parentId: student.parent_id,
      createdAt: student.created_at,
      updatedAt: student.updated_at,
    });
  } catch (error) {
    log.error("Get student by ID error", error, {
      path: req.path,
      studentId: req.params.id,
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
 * Update a student's information
 * PUT /students/:id
 * Validates: Requirements 3.4
 *
 * Only accessible by the parent who owns the student
 * Ownership verification is performed before update
 */
export async function updateStudentController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    const parentId = req.user!.userId;

    log.info("Updating student", {
      studentId: id,
      parentId,
      path: req.path,
    });

    // First, verify the student exists and belongs to the parent
    const existingStudent = await getStudentById(id);

    if (!existingStudent) {
      log.warn("Update failed: Student not found", {
        studentId: id,
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

    // Verify parent ownership
    if (existingStudent.parent_id !== parentId) {
      log.warn("Update failed: Parent does not own student", {
        studentId: id,
        parentId,
        actualParentId: existingStudent.parent_id,
      });
      res.status(403).json({
        error: {
          message: "Insufficient permissions",
          code: "FORBIDDEN",
        },
      });
      return;
    }

    // Update the student
    const updatedStudent = await updateStudent(id, name, email);

    log.info("Student updated successfully", {
      studentId: id,
      parentId,
    });

    res.status(200).json({
      id: updatedStudent!.id,
      name: updatedStudent!.name,
      email: updatedStudent!.email,
      parentId: updatedStudent!.parent_id,
      createdAt: updatedStudent!.created_at,
      updatedAt: updatedStudent!.updated_at,
    });
  } catch (error: any) {
    // Handle database constraint violations
    if (error.code === "23505") {
      // Unique constraint violation (duplicate email)
      log.warn("Student update failed: Email already exists", {
        studentId: req.params.id,
        email: req.body.email,
      });
      res.status(409).json({
        error: {
          message: "Student with this email already exists",
          code: "DUPLICATE_EMAIL",
        },
      });
      return;
    }

    // Unexpected error
    log.error("Student update error", error, {
      path: req.path,
      studentId: req.params.id,
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
 * Delete a student account
 * DELETE /students/:id
 *
 * Only accessible by the parent who owns the student
 * Ownership verification is performed before deletion
 */
export async function deleteStudentController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const parentId = req.user!.userId;

    log.info("Deleting student", {
      studentId: id,
      parentId,
      path: req.path,
    });

    // First, verify the student exists and belongs to the parent
    const existingStudent = await getStudentById(id);

    if (!existingStudent) {
      log.warn("Delete failed: Student not found", {
        studentId: id,
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

    // Verify parent ownership
    if (existingStudent.parent_id !== parentId) {
      log.warn("Delete failed: Parent does not own student", {
        studentId: id,
        parentId,
        actualParentId: existingStudent.parent_id,
      });
      res.status(403).json({
        error: {
          message: "Insufficient permissions",
          code: "FORBIDDEN",
        },
      });
      return;
    }

    // Delete the student
    await deleteStudent(id);

    log.info("Student deleted successfully", {
      studentId: id,
      parentId,
    });

    res.status(204).send();
  } catch (error) {
    log.error("Student deletion error", error, {
      path: req.path,
      studentId: req.params.id,
    });
    res.status(500).json({
      error: {
        message: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
    });
  }
}
