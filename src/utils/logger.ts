import winston from "winston";
import { config } from "../config/env";

/**
 * List of sensitive field names that should be redacted from logs.
 * These fields will be replaced with '[REDACTED]' in log output.
 */
const SENSITIVE_FIELDS = [
  "password",
  "passwordHash",
  "password_hash",
  "token",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "apiKey",
  "api_key",
  "secret",
  "authorization",
  "cookie",
  "jwt",
  "bearer",
];

/**
 * Recursively redacts sensitive fields from an object.
 * Creates a deep copy to avoid mutating the original object.
 */
function redactSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item));
  }

  const redacted: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if this key contains any sensitive field name
    const isSensitive = SENSITIVE_FIELDS.some((field) =>
      lowerKey.includes(field.toLowerCase()),
    );

    if (isSensitive) {
      redacted[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Custom format that redacts sensitive data before logging
 */
const redactFormat = winston.format((info) => {
  return redactSensitiveData(info);
});

/**
 * Winston logger configuration with JSON formatting and sensitive data redaction
 */
const logger = winston.createLogger({
  level: config.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss.SSS",
    }),
    winston.format.errors({ stack: true }),
    redactFormat(),
    winston.format.json(),
  ),
  defaultMeta: {
    service: "mentorship-platform-api",
  },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr =
            Object.keys(meta).length > 0
              ? `\n${JSON.stringify(meta, null, 2)}`
              : "";
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        }),
      ),
    }),
  ],
});

/**
 * Structured logger interface with methods for different log levels.
 * All logs include timestamp, level, message, and optional context.
 * Sensitive fields are automatically redacted.
 */
export const log = {
  /**
   * Log informational messages
   */
  info: (message: string, context?: Record<string, any>) => {
    logger.info(message, context);
  },

  /**
   * Log warning messages
   */
  warn: (message: string, context?: Record<string, any>) => {
    logger.warn(message, context);
  },

  /**
   * Log error messages with stack traces
   */
  error: (
    message: string,
    error?: Error | unknown,
    context?: Record<string, any>,
  ) => {
    const errorContext: Record<string, any> = { ...context };

    if (error instanceof Error) {
      errorContext.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    } else if (error) {
      errorContext.error = error;
    }

    logger.error(message, errorContext);
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (message: string, context?: Record<string, any>) => {
    logger.debug(message, context);
  },

  /**
   * Log HTTP request details
   */
  http: (message: string, context?: Record<string, any>) => {
    logger.http(message, context);
  },
};

export default log;
