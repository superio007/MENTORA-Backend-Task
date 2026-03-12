import { Request, Response } from "express";
import {
  findUserByEmail,
  comparePassword,
  generateToken,
  createUser,
} from "./auth.service";
import { log } from "../../utils/logger";

/**
 * Login controller
 * Validates: Requirements 1.1, 1.2
 *
 * Handles user authentication via email and password
 * Returns JWT token on successful authentication
 * Returns uniform error message for invalid credentials (doesn't reveal which field was wrong)
 */
export async function login(req: Request, res: Response): Promise<void> {
  console.log("\n========== LOGIN START ==========");
  try {
    const { email, password } = req.body;

    console.log(`[AUTH] 1️⃣ Login attempt for: ${email}`);
    console.log(`[AUTH] IP: ${req.ip}`);

    // Log authentication attempt (without sensitive data)
    log.info("Login attempt", {
      email,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    // Query database for user by email
    console.log(`[AUTH] 2️⃣ Querying database for user...`);
    const user = await findUserByEmail(email);

    // If user not found, return uniform error message
    if (!user) {
      console.warn(`[AUTH] ❌ User not found: ${email}`);
      log.warn("Login failed: User not found", {
        email,
        ip: req.ip,
      });
      res.status(401).json({
        error: {
          message: "Invalid credentials",
          code: "INVALID_CREDENTIALS",
        },
      });
      console.log("========== LOGIN END (USER NOT FOUND) ==========\n");
      return;
    }

    console.log(`[AUTH] ✅ User found: ${user.id}`);

    // Verify password using comparePassword
    console.log(`[AUTH] 3️⃣ Comparing passwords...`);
    const isPasswordValid = await comparePassword(password, user.password_hash);

    // If password invalid, return uniform error message
    if (!isPasswordValid) {
      console.warn(`[AUTH] ❌ Invalid password for user: ${email}`);
      log.warn("Login failed: Invalid password", {
        email,
        userId: user.id,
        ip: req.ip,
      });
      res.status(401).json({
        error: {
          message: "Invalid credentials",
          code: "INVALID_CREDENTIALS",
        },
      });
      console.log("========== LOGIN END (INVALID PASSWORD) ==========\n");
      return;
    }

    console.log(`[AUTH] ✅ Password valid`);

    // Generate JWT token on success
    console.log(`[AUTH] 4️⃣ Generating JWT token...`);
    const token = generateToken(user.id, user.email, user.role);
    console.log(`[AUTH] ✅ Token generated: ${token.substring(0, 20)}...`);

    // Log successful authentication (without sensitive data)
    console.log(`[AUTH] ✅ LOGIN SUCCESSFUL`);
    log.info("Login successful", {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: req.ip,
    });

    // Return JWT token and user information
    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
    console.log("========== LOGIN END (SUCCESS) ==========\n");
  } catch (error) {
    console.error("[AUTH] ❌ LOGIN ERROR");
    console.error(
      `[AUTH] Error: ${error instanceof Error ? error.message : String(error)}`,
    );

    // Log error (without sensitive data)
    log.error("Login error", error, {
      path: req.path,
      method: req.method,
    });

    // Return generic error message
    res.status(500).json({
      error: {
        message: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
    });
    console.log("========== LOGIN END (ERROR) ==========\n");
  }
}

/**
 * Get current user info
 * Validates: Requirements 1.1
 *
 * Returns the authenticated user's information
 * Requires valid JWT token
 */
export async function getCurrentUser(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    // User info is attached by authenticateJWT middleware
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        error: {
          message: "Unauthorized",
          code: "AUTH_ERROR",
        },
      });
      return;
    }

    log.info("Get current user", {
      userId: user.userId,
      email: user.email,
    });

    res.status(200).json({
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    log.error("Get current user error", error);
    res.status(500).json({
      error: {
        message: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
    });
  }
}

/**
 * Register controller
 * Validates: Requirements 1.1, 1.2, 1.3
 *
 * Handles user registration with email, password, and role
 * Returns JWT token on successful registration
 * Returns error if email already exists
 */
export async function register(req: Request, res: Response): Promise<void> {
  console.log("\n========== REGISTER START ==========");
  try {
    const { email, password, role } = req.body;

    console.log(`[AUTH] 1️⃣ Registration attempt`);
    console.log(`[AUTH] Email: ${email}`);
    console.log(`[AUTH] Role: ${role}`);
    console.log(`[AUTH] Password length: ${password.length} characters`);
    console.log(`[AUTH] IP: ${req.ip}`);

    // Log registration attempt (without sensitive data)
    log.info("Registration attempt", {
      email,
      role,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    // Create new user
    console.log(`[AUTH] 2️⃣ Creating new user in database...`);
    const user = await createUser(email, password, role);
    console.log(`[AUTH] ✅ User created: ${user.id}`);

    // Generate JWT token
    console.log(`[AUTH] 3️⃣ Generating JWT token...`);
    const token = generateToken(user.id, user.email, user.role);
    console.log(`[AUTH] ✅ Token generated: ${token.substring(0, 20)}...`);

    // Log successful registration (without sensitive data)
    console.log(`[AUTH] ✅ REGISTRATION SUCCESSFUL`);
    log.info("Registration successful", {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: req.ip,
    });

    // Return JWT token and user information
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
    console.log("========== REGISTER END (SUCCESS) ==========\n");
  } catch (error) {
    console.error("[AUTH] ❌ REGISTRATION ERROR");
    console.error(
      `[AUTH] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`,
    );
    console.error(
      `[AUTH] Error message: ${error instanceof Error ? error.message : String(error)}`,
    );

    // Check if error is due to duplicate email
    if (
      error instanceof Error &&
      error.message === "Email already registered"
    ) {
      console.warn(`[AUTH] ❌ Email already registered: ${req.body.email}`);
      log.warn("Registration failed: Email already exists", {
        email: req.body.email,
        ip: req.ip,
      });
      res.status(409).json({
        error: {
          message: "Email already registered",
          code: "DUPLICATE",
        },
      });
      console.log("========== REGISTER END (DUPLICATE EMAIL) ==========\n");
      return;
    }

    // Log error (without sensitive data)
    log.error("Registration error", error, {
      path: req.path,
      method: req.method,
    });

    // Return generic error message
    res.status(500).json({
      error: {
        message: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
    });
    console.log("========== REGISTER END (ERROR) ==========\n");
  }
}
