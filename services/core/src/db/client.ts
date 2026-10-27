/**
 * Drape Core Database Client
 * Spec Anchor: docs/Drape/schema.md, architecture.md
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://drape:drape@localhost:5432/drape_core';

// Postgres connection instance for queries
export const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Drizzle ORM client with schema definitions
export const db = drizzle(sql, { schema });

/**
 * Health check helper to verify database connectivity.
 * Returns true if connection succeeds, false otherwise.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Gracefully close database connection pool.
 */
export async function closeDatabaseConnection(): Promise<void> {
  await sql.end();
}
