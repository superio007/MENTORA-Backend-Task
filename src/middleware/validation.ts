import { Request, Response, NextFunction } from "express";
import { z, ZodError, ZodSchema } from "zod";

/**
 * Validation schemas for API requests
 */

// Login request schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

// Register request schema
export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["parent", "student", "mentor"], {
    errorMap: () => ({ message: "Role must be parent, student, or mentor" }),
  }),
});

// Student creation schema
export const createStudentSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  email: z.string().email("Invalid email format"),
});

// Lesson creation schema
export const createLessonSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().max(1000, "Description too long").optional(),
  capacity: z.number().int().positive("Capacity must be greater than 0"),
});

// Booking creation schema
export const createBookingSchema = z.object({
  studentId: z.string().uuid("Invalid student ID format"),
  lessonId: z.string().uuid("Invalid lesson ID format"),
});

// Session creation schema
export const createSessionSchema = z.object({
  lessonId: z.string().uuid("Invalid lesson ID format"),
  scheduledAt: z.string().datetime("Invalid datetime format"),
  durationMinutes: z.number().int().positive("Duration must be greater than 0"),
  notes: z.string().max(1000, "Notes too long").optional(),
});

// LLM summarization schema (max 50KB)
export const llmSummarizeSchema = z.object({
  text: z
    .string()
    .min(1, "Text is required")
    .max(50 * 1024, "Text exceeds maximum size of 50KB"),
});

// Pagination parameters schema
export const paginationSchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, "Page must be a positive integer")
    .transform(Number)
    .refine((val) => val > 0, "Page must be greater than 0")
    .optional()
    .default("1"),
  limit: z
    .string()
    .regex(/^\d+$/, "Limit must be a positive integer")
    .transform(Number)
    .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100")
    .optional()
    .default("10"),
});

/**
 * Validation error response format
 */
interface ValidationErrorDetails {
  [field: string]: string;
}

/**
 * Formats Zod validation errors into field-specific error messages
 */
function formatZodErrors(error: ZodError): ValidationErrorDetails {
  const details: ValidationErrorDetails = {};

  error.errors.forEach((err) => {
    const field = err.path.join(".");
    details[field] = err.message;
  });

  return details;
}

/**
 * Validation target type
 */
type ValidationTarget = "body" | "query" | "params";

/**
 * Validation middleware factory
 * Creates middleware that validates request data against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param target - Which part of the request to validate (body, query, or params)
 * @returns Express middleware function
 */
export function validateRequest(
  schema: ZodSchema,
  target: ValidationTarget = "body",
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Get the data to validate based on target
      const dataToValidate = req[target];

      // Validate and parse the data
      const validatedData = schema.parse(dataToValidate);

      // Replace the original data with validated/transformed data
      req[target] = validatedData;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format validation errors
        const details = formatZodErrors(error);

        res.status(400).json({
          error: {
            message: "Validation failed",
            code: "VALIDATION_ERROR",
            details,
          },
        });
      } else {
        // Unexpected error during validation
        next(error);
      }
    }
  };
}
