import app from "./app";
import { config } from "./config/env";
import { query, closePool } from "./config/database";
import { log } from "./utils/logger";

/**
 * Server startup script
 * Validates: Requirements 10.4, 10.5, 12.7
 *
 * Validates environment variables on startup
 * Initializes database connection pool
 * Tests database connectivity
 * Starts Express server on configured port
 * Logs startup success with port number
 * Handles startup errors gracefully
 */

/**
 * Test database connectivity by executing a simple query
 * Throws an error if the connection fails
 */
async function testDatabaseConnectivity(): Promise<void> {
  try {
    console.log("\n[DB] 🔍 Testing database connectivity...");
    log.info("Testing database connectivity...");
    const result = await query("SELECT NOW()");
    console.log(`[DB] ✅ Database connected successfully`);
    console.log(`[DB] Server time: ${result.rows[0].now}`);
    log.info("Database connectivity test successful", {
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    console.error("[DB] ❌ Database connection failed");
    console.error(
      `[DB] Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    log.error("Database connectivity test failed", error, {
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME,
    });
    throw new Error("Failed to connect to database");
  }
}

/**
 * Start the Express server
 * Handles graceful shutdown on SIGTERM and SIGINT signals
 */
async function startServer(): Promise<void> {
  try {
    // Log environment configuration (without sensitive data)
    console.log("\n========== SERVER STARTUP ==========");
    console.log(`[SERVER] 1️⃣ Starting mentorship platform backend`);
    console.log(`[SERVER] Environment: ${config.NODE_ENV}`);
    console.log(`[SERVER] Port: ${config.PORT}`);
    console.log(
      `[SERVER] Database: ${config.DB_NAME}@${config.DB_HOST}:${config.DB_PORT}`,
    );

    log.info("Starting mentorship platform backend", {
      environment: config.NODE_ENV,
      port: config.PORT,
      database: config.DB_NAME,
      dbHost: config.DB_HOST,
      dbPort: config.DB_PORT,
    });

    // Test database connectivity before starting server
    console.log(`[SERVER] 2️⃣ Testing database connectivity...`);
    await testDatabaseConnectivity();

    // Start Express server
    console.log(`[SERVER] 3️⃣ Starting Express server...`);
    const server = app.listen(config.PORT, () => {
      console.log(`\n[SERVER] ✅ SERVER STARTED SUCCESSFULLY`);
      console.log(`[SERVER] 🚀 Listening on port ${config.PORT}`);
      console.log(`[SERVER] 📍 URL: http://localhost:${config.PORT}`);
      console.log(`[SERVER] 🔧 Environment: ${config.NODE_ENV}`);
      console.log("========== SERVER READY ==========\n");

      log.info(`✅ Server started successfully on port ${config.PORT}`, {
        port: config.PORT,
        environment: config.NODE_ENV,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle graceful shutdown on SIGTERM
    process.on("SIGTERM", async () => {
      console.log("\n[SERVER] 🛑 SIGTERM signal received: closing HTTP server");
      log.info("SIGTERM signal received: closing HTTP server");
      server.close(async () => {
        console.log("[SERVER] ✅ HTTP server closed");
        await closePool();
        console.log("[SERVER] ✅ Database connection pool closed");
        console.log("[SERVER] 👋 Server shutdown complete\n");
        log.info("Database connection pool closed");
        process.exit(0);
      });
    });

    // Handle graceful shutdown on SIGINT (Ctrl+C)
    process.on("SIGINT", async () => {
      console.log("\n[SERVER] 🛑 SIGINT signal received: closing HTTP server");
      log.info("SIGINT signal received: closing HTTP server");
      server.close(async () => {
        console.log("[SERVER] ✅ HTTP server closed");
        await closePool();
        console.log("[SERVER] ✅ Database connection pool closed");
        console.log("[SERVER] 👋 Server shutdown complete\n");
        log.info("Database connection pool closed");
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("\n[SERVER] ❌ UNCAUGHT EXCEPTION");
      console.error(`[SERVER] Error: ${error.message}`);
      console.error(`[SERVER] Stack:`, error.stack);
      log.error("Uncaught exception", error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("\n[SERVER] ❌ UNHANDLED REJECTION");
      console.error(`[SERVER] Reason: ${String(reason)}`);
      console.error(`[SERVER] Promise:`, promise);
      log.error("Unhandled rejection at promise", new Error(String(reason)), {
        promise: String(promise),
      });
      process.exit(1);
    });
  } catch (error) {
    console.error("\n[SERVER] ❌ FAILED TO START SERVER");
    console.error(
      `[SERVER] Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.error(
      `[SERVER] Stack:`,
      error instanceof Error ? error.stack : "N/A",
    );
    log.error("Failed to start server", error);
    await closePool();
    process.exit(1);
  }
}

// Start the server
startServer();
