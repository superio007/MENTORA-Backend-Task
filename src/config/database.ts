import { Pool, QueryResult, QueryResultRow } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Validate required database environment variables
function validateDatabaseConfig(): void {
  const requiredVars = [
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
  ];
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missing.join(", ")}\n` +
        "Please ensure all database configuration variables are set in your .env file.",
    );
  }
}

// Validate configuration on module load
validateDatabaseConfig();

// Create connection pool with configuration from design document
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT!, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection cannot be established
});

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle database client", err);
  process.exit(-1);
});

/**
 * Query helper function with automatic client release
 * Executes a query using a client from the pool and ensures proper cleanup
 *
 * @param text - SQL query string
 * @param params - Query parameters (optional)
 * @returns Query result
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[],
): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    return await client.query<T>(text, params);
  } finally {
    client.release();
  }
}

/**
 * Get the connection pool instance
 * Useful for advanced operations like transactions
 */
export function getPool(): Pool {
  return pool;
}

/**
 * Close all connections in the pool
 * Should be called when shutting down the application
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

export default pool;
