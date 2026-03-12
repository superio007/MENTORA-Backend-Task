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

import authRoutes from "./auth.routes";
import { query } from "../../config/database";
import { hashPassword } from "./auth.service";

const mockQuery = query as jest.MockedFunction<typeof query>;

// Create a test app
const app = express();
app.use(express.json());
app.use("/auth", authRoutes);

describe("POST /auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return JWT token and user info for valid credentials", async () => {
    // Create a test user with hashed password
    const testPassword = "testPassword123";
    const hashedPassword = await hashPassword(testPassword);

    const mockUser = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "test@example.com",
      password_hash: hashedPassword,
      role: "parent" as const,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Mock database query to return the test user
    mockQuery.mockResolvedValueOnce({
      rows: [mockUser],
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    const response = await request(app)
      .post("/auth/login")
      .send({
        email: "test@example.com",
        password: testPassword,
      })
      .expect(200);

    expect(response.body).toHaveProperty("token");
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
    });
    expect(typeof response.body.token).toBe("string");
  });

  it("should return 401 with uniform error for invalid email", async () => {
    // Mock database query to return no user
    mockQuery.mockResolvedValueOnce({
      rows: [],
      command: "SELECT",
      rowCount: 0,
      oid: 0,
      fields: [],
    });

    const response = await request(app)
      .post("/auth/login")
      .send({
        email: "nonexistent@example.com",
        password: "anyPassword",
      })
      .expect(401);

    expect(response.body).toEqual({
      error: {
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      },
    });
  });

  it("should return 401 with uniform error for invalid password", async () => {
    const testPassword = "correctPassword123";
    const hashedPassword = await hashPassword(testPassword);

    const mockUser = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "test@example.com",
      password_hash: hashedPassword,
      role: "parent" as const,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Mock database query to return the test user
    mockQuery.mockResolvedValueOnce({
      rows: [mockUser],
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    const response = await request(app)
      .post("/auth/login")
      .send({
        email: "test@example.com",
        password: "wrongPassword",
      })
      .expect(401);

    expect(response.body).toEqual({
      error: {
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      },
    });
  });

  it("should return 500 for database errors", async () => {
    // Mock database query to throw an error
    mockQuery.mockRejectedValueOnce(new Error("Database connection failed"));

    const response = await request(app)
      .post("/auth/login")
      .send({
        email: "test@example.com",
        password: "testPassword",
      })
      .expect(500);

    expect(response.body).toEqual({
      error: {
        message: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
    });
  });

  it("should not reveal whether email or password was incorrect", async () => {
    // Test with invalid email
    mockQuery.mockResolvedValueOnce({
      rows: [],
      command: "SELECT",
      rowCount: 0,
      oid: 0,
      fields: [],
    });

    const response1 = await request(app).post("/auth/login").send({
      email: "nonexistent@example.com",
      password: "anyPassword",
    });

    // Test with invalid password
    const hashedPassword = await hashPassword("correctPassword");
    const mockUser = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "test@example.com",
      password_hash: hashedPassword,
      role: "parent" as const,
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockQuery.mockResolvedValueOnce({
      rows: [mockUser],
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    const response2 = await request(app).post("/auth/login").send({
      email: "test@example.com",
      password: "wrongPassword",
    });

    // Both should return the same error message
    expect(response1.body).toEqual(response2.body);
    expect(response1.status).toBe(response2.status);
    expect(response1.body.error.message).not.toContain("email");
    expect(response1.body.error.message).not.toContain("password");
  });
});
