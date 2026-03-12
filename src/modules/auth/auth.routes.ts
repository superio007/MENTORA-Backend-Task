import { Router } from "express";
import { login, register, getCurrentUser } from "./auth.controller";
import { authenticateJWT } from "./auth.middleware";
import {
  validateRequest,
  loginSchema,
  registerSchema,
} from "../../middleware/validation";

/**
 * Authentication routes
 * Validates: Requirements 1.1, 1.2
 */
const router = Router();

/**
 * POST /auth/login
 * Authenticate user with email and password
 * Returns JWT token on success
 */
router.post("/login", validateRequest(loginSchema), login);

/**
 * POST /auth/register
 * Register a new user with email, password, and role
 * Returns JWT token on success
 */
router.post("/register", validateRequest(registerSchema), register);

/**
 * GET /auth/me
 * Get current authenticated user information
 * Requires valid JWT token
 */
router.get("/me", authenticateJWT, getCurrentUser);

export default router;
