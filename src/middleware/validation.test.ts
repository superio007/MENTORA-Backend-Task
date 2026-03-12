import { Request, Response, NextFunction } from "express";
import {
  validateRequest,
  loginSchema,
  createStudentSchema,
  createLessonSchema,
  createBookingSchema,
  createSessionSchema,
  llmSummarizeSchema,
  paginationSchema,
} from "./validation";

describe("Validation Schemas", () => {
  describe("loginSchema", () => {
    it("should validate valid login credentials", () => {
      const validData = {
        email: "test@example.com",
        password: "password123",
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid email format", () => {
      const invalidData = {
        email: "not-an-email",
        password: "password123",
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject missing password", () => {
      const invalidData = {
        email: "test@example.com",
        password: "",
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("createStudentSchema", () => {
    it("should validate valid student data", () => {
      const validData = {
        name: "John Doe",
        email: "john@example.com",
      };

      const result = createStudentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject empty name", () => {
      const invalidData = {
        name: "",
        email: "john@example.com",
      };

      const result = createStudentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject name exceeding 255 characters", () => {
      const invalidData = {
        name: "a".repeat(256),
        email: "john@example.com",
      };

      const result = createStudentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid email", () => {
      const invalidData = {
        name: "John Doe",
        email: "invalid-email",
      };

      const result = createStudentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("createLessonSchema", () => {
    it("should validate valid lesson data", () => {
      const validData = {
        title: "Math 101",
        description: "Introduction to mathematics",
        capacity: 20,
      };

      const result = createLessonSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate lesson without description", () => {
      const validData = {
        title: "Math 101",
        capacity: 20,
      };

      const result = createLessonSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject capacity of 0", () => {
      const invalidData = {
        title: "Math 101",
        capacity: 0,
      };

      const result = createLessonSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject negative capacity", () => {
      const invalidData = {
        title: "Math 101",
        capacity: -5,
      };

      const result = createLessonSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject empty title", () => {
      const invalidData = {
        title: "",
        capacity: 20,
      };

      const result = createLessonSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("createBookingSchema", () => {
    it("should validate valid booking data", () => {
      const validData = {
        studentId: "123e4567-e89b-12d3-a456-426614174000",
        lessonId: "123e4567-e89b-12d3-a456-426614174001",
      };

      const result = createBookingSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid studentId UUID", () => {
      const invalidData = {
        studentId: "not-a-uuid",
        lessonId: "123e4567-e89b-12d3-a456-426614174001",
      };

      const result = createBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid lessonId UUID", () => {
      const invalidData = {
        studentId: "123e4567-e89b-12d3-a456-426614174000",
        lessonId: "not-a-uuid",
      };

      const result = createBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("createSessionSchema", () => {
    it("should validate valid session data", () => {
      const validData = {
        lessonId: "123e4567-e89b-12d3-a456-426614174000",
        scheduledAt: "2024-01-15T10:00:00Z",
        durationMinutes: 60,
        notes: "First session",
      };

      const result = createSessionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate session without notes", () => {
      const validData = {
        lessonId: "123e4567-e89b-12d3-a456-426614174000",
        scheduledAt: "2024-01-15T10:00:00Z",
        durationMinutes: 60,
      };

      const result = createSessionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid datetime format", () => {
      const invalidData = {
        lessonId: "123e4567-e89b-12d3-a456-426614174000",
        scheduledAt: "not-a-datetime",
        durationMinutes: 60,
      };

      const result = createSessionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject zero duration", () => {
      const invalidData = {
        lessonId: "123e4567-e89b-12d3-a456-426614174000",
        scheduledAt: "2024-01-15T10:00:00Z",
        durationMinutes: 0,
      };

      const result = createSessionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject negative duration", () => {
      const invalidData = {
        lessonId: "123e4567-e89b-12d3-a456-426614174000",
        scheduledAt: "2024-01-15T10:00:00Z",
        durationMinutes: -30,
      };

      const result = createSessionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("llmSummarizeSchema", () => {
    it("should validate text within size limit", () => {
      const validData = {
        text: "This is a sample text to summarize.",
      };

      const result = llmSummarizeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject empty text", () => {
      const invalidData = {
        text: "",
      };

      const result = llmSummarizeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject text exceeding 50KB", () => {
      const invalidData = {
        text: "a".repeat(51 * 1024), // 51KB
      };

      const result = llmSummarizeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should accept text at exactly 50KB", () => {
      const validData = {
        text: "a".repeat(50 * 1024), // Exactly 50KB
      };

      const result = llmSummarizeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("paginationSchema", () => {
    it("should validate valid pagination parameters", () => {
      const validData = {
        page: "2",
        limit: "20",
      };

      const result = paginationSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(20);
      }
    });

    it("should apply default values when parameters are missing", () => {
      const validData = {};

      const result = paginationSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it("should reject page value of 0", () => {
      const invalidData = {
        page: "0",
        limit: "10",
      };

      const result = paginationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject negative page value", () => {
      const invalidData = {
        page: "-1",
        limit: "10",
      };

      const result = paginationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject limit exceeding 100", () => {
      const invalidData = {
        page: "1",
        limit: "101",
      };

      const result = paginationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject non-numeric page", () => {
      const invalidData = {
        page: "abc",
        limit: "10",
      };

      const result = paginationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

describe("validateRequest Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe("body validation", () => {
    it("should pass validation with valid data", () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "password123",
      };

      const middleware = validateRequest(loginSchema, "body");
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should return 400 with validation errors for invalid data", () => {
      mockRequest.body = {
        email: "invalid-email",
        password: "",
      };

      const middleware = validateRequest(loginSchema, "body");
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          details: expect.objectContaining({
            email: expect.any(String),
            password: expect.any(String),
          }),
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should include field-specific error messages", () => {
      mockRequest.body = {
        email: "not-an-email",
        password: "validpassword",
      };

      const middleware = validateRequest(loginSchema, "body");
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction,
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          details: {
            email: "Invalid email format",
          },
        },
      });
    });
  });

  describe("query validation", () => {
    it("should validate query parameters", () => {
      mockRequest.query = {
        page: "2",
        limit: "20",
      };

      const middleware = validateRequest(paginationSchema, "query");
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.query).toEqual({
        page: 2,
        limit: 20,
      });
    });

    it("should return 400 for invalid query parameters", () => {
      mockRequest.query = {
        page: "0",
        limit: "10",
      };

      const middleware = validateRequest(paginationSchema, "query");
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("params validation", () => {
    const uuidSchema = createBookingSchema.pick({ studentId: true });

    it("should validate params", () => {
      mockRequest.params = {
        studentId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const middleware = validateRequest(uuidSchema, "params");
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it("should return 400 for invalid params", () => {
      mockRequest.params = {
        studentId: "not-a-uuid",
      };

      const middleware = validateRequest(uuidSchema, "params");
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("data transformation", () => {
    it("should transform validated data", () => {
      mockRequest.query = {
        page: "5",
        limit: "25",
      };

      const middleware = validateRequest(paginationSchema, "query");
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction,
      );

      // Strings should be transformed to numbers
      expect(mockRequest.query).toEqual({
        page: 5,
        limit: 25,
      });
    });
  });
});
