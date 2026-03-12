import request from "supertest";
import express from "express";

// Mock environment variables before any imports
process.env.DB_HOST = "localhost";
process.env.DB_PORT = "5432";
process.env.DB_NAME = "test_db";
process.env.DB_USER = "test_user";
process.env.DB_PASSWORD = "test_password";
process.env.JWT_SECRET = "test-secret-key-at-least-32-characters-long";
process.env.JWT_EXPIRATION = "24h";
process.env.NODE_ENV = "test";
process.env.PORT = "3000";
process.env.LLM_API_KEY = "test-llm-key";
process.env.LLM_API_URL = "https://api.test.com";
process.env.LLM_MODEL = "test-model";
process.env.CORS_ORIGIN = "https://test.com";

// Mock the database module
jest.mock("../../config/database");

// Mock the logger to avoid console output during tests
jest.mock("../../utils/logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
  },
}));

import bookingsRoutes from "./bookings.routes";
import { query } from "../../config/database";
import { authenticateJWT } from "../auth/auth.middleware";

const mockQuery = query as jest.MockedFunction<typeof query>;

// Mock the auth middleware
jest.mock("../auth/auth.middleware", () => ({
  authenticateJWT: jest.fn((req, _res, next) => {
    // Set a default test user
    req.user = {
      userId: "550e8400-e29b-41d4-a716-446655440000",
      email: "parent@example.com",
      role: "parent",
    };
    next();
  }),
  requireRole: jest.fn(
    (...roles: string[]) =>
      (req: any, res: any, next: any) => {
        if (roles.includes(req.user.role)) {
          next();
        } else {
          res.status(403).json({
            error: {
              message: "Insufficient permissions",
              code: "FORBIDDEN",
            },
          });
        }
      },
  ),
}));

// Create a test app
const app = express();
app.use(express.json());
app.use("/bookings", bookingsRoutes);

describe("POST /bookings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the default mock implementation
    (authenticateJWT as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        email: "parent@example.com",
        role: "parent",
      };
      next();
    });
  });

  it("should create a booking when parent owns student and capacity is available", async () => {
    const mockStudent = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Test Student",
      email: "student@example.com",
      parent_id: "550e8400-e29b-41d4-a716-446655440000",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockLesson = {
      id: "550e8400-e29b-41d4-a716-446655440002",
      title: "Test Lesson",
      description: "Test Description",
      capacity: 10,
      mentor_id: "550e8400-e29b-41d4-a716-446655440003",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockBooking = {
      id: "550e8400-e29b-41d4-a716-446655440004",
      student_id: "550e8400-e29b-41d4-a716-446655440001",
      lesson_id: "550e8400-e29b-41d4-a716-446655440002",
      created_at: new Date(),
    };

    // Mock getStudentById
    mockQuery.mockResolvedValueOnce({
      rows: [mockStudent],
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    // Mock getLessonById
    mockQuery.mockResolvedValueOnce({
      rows: [mockLesson],
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    // Mock getBookingCountForLesson
    mockQuery.mockResolvedValueOnce({
      rows: [{ count: "5" }],
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    // Mock createBooking
    mockQuery.mockResolvedValueOnce({
      rows: [mockBooking],
      command: "INSERT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    const response = await request(app)
      .post("/bookings")
      .send({
        studentId: "550e8400-e29b-41d4-a716-446655440001",
        lessonId: "550e8400-e29b-41d4-a716-446655440002",
      })
      .expect(201);

    expect(response.body).toEqual({
      id: mockBooking.id,
      studentId: mockBooking.student_id,
      lessonId: mockBooking.lesson_id,
      createdAt: mockBooking.created_at.toISOString(),
    });
  });

  it("should return 403 when parent does not own student (Requirement 5.1)", async () => {
    const mockStudent = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Test Student",
      email: "student@example.com",
      parent_id: "550e8400-e29b-41d4-a716-446655440099", // Different parent
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Mock getStudentById
    mockQuery.mockResolvedValueOnce({
      rows: [mockStudent],
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    const response = await request(app)
      .post("/bookings")
      .send({
        studentId: "550e8400-e29b-41d4-a716-446655440001",
        lessonId: "550e8400-e29b-41d4-a716-446655440002",
      })
      .expect(403);

    expect(response.body).toEqual({
      error: {
        message: "Insufficient permissions",
        code: "FORBIDDEN",
      },
    });
  });

  it("should return 409 for duplicate booking (Requirement 5.5)", async () => {
    const mockStudent = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Test Student",
      email: "student@example.com",
      parent_id: "550e8400-e29b-41d4-a716-446655440000",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockLesson = {
      id: "550e8400-e29b-41d4-a716-446655440002",
      title: "Test Lesson",
      description: "Test Description",
      capacity: 10,
      mentor_id: "550e8400-e29b-41d4-a716-446655440003",
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Mock getStudentById
    mockQuery.mockResolvedValueOnce({
      rows: [mockStudent],
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    // Mock getLessonById
    mockQuery.mockResolvedValueOnce({
      rows: [mockLesson],
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    // Mock getBookingCountForLesson
    mockQuery.mockResolvedValueOnce({
      rows: [{ count: "5" }],
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    // Mock createBooking - simulate unique constraint violation
    const duplicateError: any = new Error("Duplicate booking");
    duplicateError.code = "23505";
    mockQuery.mockRejectedValueOnce(duplicateError);

    const response = await request(app)
      .post("/bookings")
      .send({
        studentId: "550e8400-e29b-41d4-a716-446655440001",
        lessonId: "550e8400-e29b-41d4-a716-446655440002",
      })
      .expect(409);

    expect(response.body).toEqual({
      error: {
        message: "Student is already booked for this lesson",
        code: "DUPLICATE_BOOKING",
      },
    });
  });

  it("should return 400 when capacity exceeded (Requirement 5.8)", async () => {
    const mockStudent = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Test Student",
      email: "student@example.com",
      parent_id: "550e8400-e29b-41d4-a716-446655440000",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockLesson = {
      id: "550e8400-e29b-41d4-a716-446655440002",
      title: "Test Lesson",
      description: "Test Description",
      capacity: 10,
      mentor_id: "550e8400-e29b-41d4-a716-446655440003",
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Mock getStudentById
    mockQuery.mockResolvedValueOnce({
      rows: [mockStudent],
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    // Mock getLessonById
    mockQuery.mockResolvedValueOnce({
      rows: [mockLesson],
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    // Mock getBookingCountForLesson - return count equal to capacity
    mockQuery.mockResolvedValueOnce({
      rows: [{ count: "10" }], // Capacity is 10, so this is full
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    const response = await request(app)
      .post("/bookings")
      .send({
        studentId: "550e8400-e29b-41d4-a716-446655440001",
        lessonId: "550e8400-e29b-41d4-a716-446655440002",
      })
      .expect(400);

    expect(response.body).toEqual({
      error: {
        message: "Lesson capacity exceeded",
        code: "CAPACITY_EXCEEDED",
      },
    });
  });

  it("should return 404 when student not found", async () => {
    // Mock getStudentById - return no student
    mockQuery.mockResolvedValueOnce({
      rows: [],
      command: "SELECT",
      rowCount: 0,
      oid: 0,
      fields: [],
    });

    const response = await request(app)
      .post("/bookings")
      .send({
        studentId: "550e8400-e29b-41d4-a716-446655440099",
        lessonId: "550e8400-e29b-41d4-a716-446655440002",
      })
      .expect(404);

    expect(response.body).toEqual({
      error: {
        message: "Student not found",
        code: "NOT_FOUND",
      },
    });
  });

  it("should return 404 when lesson not found", async () => {
    const mockStudent = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Test Student",
      email: "student@example.com",
      parent_id: "550e8400-e29b-41d4-a716-446655440000",
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Mock getStudentById
    mockQuery.mockResolvedValueOnce({
      rows: [mockStudent],
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    // Mock getLessonById - return no lesson
    mockQuery.mockResolvedValueOnce({
      rows: [],
      command: "SELECT",
      rowCount: 0,
      oid: 0,
      fields: [],
    });

    const response = await request(app)
      .post("/bookings")
      .send({
        studentId: "550e8400-e29b-41d4-a716-446655440001",
        lessonId: "550e8400-e29b-41d4-a716-446655440099",
      })
      .expect(404);

    expect(response.body).toEqual({
      error: {
        message: "Lesson not found",
        code: "NOT_FOUND",
      },
    });
  });
});

describe("GET /bookings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authenticateJWT as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        email: "parent@example.com",
        role: "parent",
      };
      next();
    });
  });

  it("should return bookings for parent's students", async () => {
    const mockStudents = [
      {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "Test Student 1",
        email: "student1@example.com",
        parent_id: "550e8400-e29b-41d4-a716-446655440000",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    const mockBookings = [
      {
        id: "550e8400-e29b-41d4-a716-446655440004",
        student_id: "550e8400-e29b-41d4-a716-446655440001",
        lesson_id: "550e8400-e29b-41d4-a716-446655440002",
        created_at: new Date(),
      },
    ];

    // Mock getStudentsByParentId
    mockQuery.mockResolvedValueOnce({
      rows: mockStudents,
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    // Mock getBookingsByStudentId
    mockQuery.mockResolvedValueOnce({
      rows: mockBookings,
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    const response = await request(app).get("/bookings").expect(200);

    expect(response.body.bookings).toHaveLength(1);
    expect(response.body.bookings[0]).toEqual({
      id: mockBookings[0].id,
      studentId: mockBookings[0].student_id,
      lessonId: mockBookings[0].lesson_id,
      createdAt: mockBookings[0].created_at.toISOString(),
    });
  });
});

describe("DELETE /bookings/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authenticateJWT as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        email: "parent@example.com",
        role: "parent",
      };
      next();
    });
  });

  it("should delete booking when parent owns student", async () => {
    const mockBooking = {
      id: "550e8400-e29b-41d4-a716-446655440004",
      student_id: "550e8400-e29b-41d4-a716-446655440001",
      lesson_id: "550e8400-e29b-41d4-a716-446655440002",
      created_at: new Date(),
    };

    const mockStudent = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Test Student",
      email: "student@example.com",
      parent_id: "550e8400-e29b-41d4-a716-446655440000",
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Mock getBookingById
    mockQuery.mockResolvedValueOnce({
      rows: [mockBooking],
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    // Mock getStudentById
    mockQuery.mockResolvedValueOnce({
      rows: [mockStudent],
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    // Mock deleteBooking
    mockQuery.mockResolvedValueOnce({
      rows: [],
      command: "DELETE",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    await request(app)
      .delete("/bookings/550e8400-e29b-41d4-a716-446655440004")
      .expect(204);
  });

  it("should return 404 when booking not found", async () => {
    // Mock getBookingById - return no booking
    mockQuery.mockResolvedValueOnce({
      rows: [],
      command: "SELECT",
      rowCount: 0,
      oid: 0,
      fields: [],
    });

    const response = await request(app)
      .delete("/bookings/550e8400-e29b-41d4-a716-446655440099")
      .expect(404);

    expect(response.body).toEqual({
      error: {
        message: "Booking not found",
        code: "NOT_FOUND",
      },
    });
  });

  it("should return 403 when parent does not own student", async () => {
    const mockBooking = {
      id: "550e8400-e29b-41d4-a716-446655440004",
      student_id: "550e8400-e29b-41d4-a716-446655440001",
      lesson_id: "550e8400-e29b-41d4-a716-446655440002",
      created_at: new Date(),
    };

    const mockStudent = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Test Student",
      email: "student@example.com",
      parent_id: "550e8400-e29b-41d4-a716-446655440099", // Different parent
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Mock getBookingById
    mockQuery.mockResolvedValueOnce({
      rows: [mockBooking],
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    // Mock getStudentById
    mockQuery.mockResolvedValueOnce({
      rows: [mockStudent],
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    const response = await request(app)
      .delete("/bookings/550e8400-e29b-41d4-a716-446655440004")
      .expect(403);

    expect(response.body).toEqual({
      error: {
        message: "Insufficient permissions",
        code: "FORBIDDEN",
      },
    });
  });
});
