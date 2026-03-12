import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Define the environment variable schema using Zod
const envSchema = z.object({
  // Server Configuration
  PORT: z.string().regex(/^\d+$/).transform(Number).default("3000"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Database Configuration
  DB_HOST: z.string().min(1, "DB_HOST is required"),
  DB_PORT: z
    .string()
    .regex(/^\d+$/, "DB_PORT must be a valid port number")
    .transform(Number),
  DB_NAME: z.string().min(1, "DB_NAME is required"),
  DB_USER: z.string().min(1, "DB_USER is required"),
  DB_PASSWORD: z.string().min(1, "DB_PASSWORD is required"),

  // JWT Configuration
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters for security"),
  JWT_EXPIRATION: z
    .string()
    .regex(/^\d+[smhd]$/, "JWT_EXPIRATION must be in format like 24h, 7d, 60m")
    .default("24h"),

  // LLM Service Configuration
  LLM_API_KEY: z.string().min(1, "LLM_API_KEY is required"),
  LLM_API_URL: z.string().url("LLM_API_URL must be a valid URL"),
  LLM_MODEL: z.string().min(1, "LLM_MODEL is required"),
  LLM_TIMEOUT_MS: z.string().regex(/^\d+$/).transform(Number).default("30000"),

  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default("60000"),
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default("10"),

  // CORS Configuration
  CORS_ORIGIN: z.string().url("CORS_ORIGIN must be a valid URL"),

  // Request Body Size Limits
  REQUEST_SIZE_LIMIT: z
    .string()
    .regex(
      /^\d+[kmg]b$/i,
      "REQUEST_SIZE_LIMIT must be in format like 10mb, 1gb",
    )
    .default("10mb"),
  LLM_REQUEST_SIZE_LIMIT: z
    .string()
    .regex(/^\d+[kmg]b$/i, "LLM_REQUEST_SIZE_LIMIT must be in format like 50kb")
    .default("50kb"),
});

// Type for the validated configuration
export type Config = z.infer<typeof envSchema>;

/**
 * Validates environment variables at startup and returns typed configuration object.
 * Terminates the process with a descriptive error if validation fails.
 */
function validateEnv(): Config {
  try {
    const config = envSchema.parse(process.env);
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment variable validation failed:");
      console.error("");

      error.errors.forEach((err) => {
        const path = err.path.join(".");
        console.error(`  • ${path}: ${err.message}`);
      });

      console.error("");
      console.error(
        "Please check your .env file and ensure all required variables are set correctly.",
      );
      console.error("See .env.example for reference.");

      process.exit(1);
    }

    // Unexpected error
    console.error("❌ Unexpected error during environment validation:", error);
    process.exit(1);
  }
}

// Validate and export the configuration
export const config = validateEnv();
