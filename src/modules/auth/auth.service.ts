import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../../config/env";
import { query } from "../../config/database";

/**
 * Password hashing service using bcrypt with cost factor 10
 * Validates: Requirements 1.3
 */

const BCRYPT_COST_FACTOR = 10;

/**
 * Hash a plain text password using bcrypt
 * @param password - Plain text password to hash
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST_FACTOR);
}

/**
 * Compare a plain text password with a hashed password
 * @param password - Plain text password
 * @param hashedPassword - Hashed password to compare against
 * @returns True if passwords match, false otherwise
 */
export async function comparePassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * JWT token service
 * Validates: Requirements 1.1, 1.4, 1.5
 */

export interface JWTPayload {
  userId: string;
  email: string;
  role: "parent" | "student" | "mentor";
  iat: number;
  exp: number;
}

/**
 * Generate a JWT token with user information
 * @param userId - User's unique identifier
 * @param email - User's email address
 * @param role - User's role (parent, student, or mentor)
 * @returns Signed JWT token
 */
export function generateToken(
  userId: string,
  email: string,
  role: "parent" | "student" | "mentor",
): string {
  const payload = {
    userId,
    email,
    role,
  };

  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRATION,
  } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 * @returns Decoded JWT payload
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token");
    }
    throw error;
  }
}

/**
 * User interface for database queries
 */
interface User {
  id: string;
  email: string;
  password_hash: string;
  role: "parent" | "student" | "mentor";
  created_at: Date;
  updated_at: Date;
}

/**
 * Find a user by email address
 * @param email - Email address to search for
 * @returns User object if found, null otherwise
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await query<User>(
    "SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE email = $1",
    [email],
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Create a new user account
 * @param email - User's email address
 * @param password - Plain text password
 * @param role - User's role (parent, student, or mentor)
 * @returns Created user object
 * @throws Error if email already exists
 */
export async function createUser(
  email: string,
  password: string,
  role: "parent" | "student" | "mentor",
): Promise<User> {
  // Check if user already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error("Email already registered");
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Insert new user
  const result = await query<User>(
    `INSERT INTO users (email, password_hash, role, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING id, email, password_hash, role, created_at, updated_at`,
    [email, passwordHash, role],
  );

  if (result.rows.length === 0) {
    throw new Error("Failed to create user");
  }

  return result.rows[0];
}
