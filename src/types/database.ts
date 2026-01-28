/**
 * Shared Database Type Definitions
 *
 * Common types for better-sqlite3 database operations across the codebase
 */

/**
 * Generic database row type from better-sqlite3 queries
 * Used to properly type raw database results before transformation
 */
export interface DatabaseRow {
  [key: string]: string | number | Buffer | null;
}

/**
 * Type for SQL query parameters
 */
export type SqlParam = string | number | Buffer | null;

/**
 * Helper type for extracting specific database row structures
 */
export type DbRowOf<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends number
    ? number
    : T[K] extends Buffer
    ? Buffer
    : T[K] extends boolean
    ? number  // SQLite stores booleans as integers
    : string | number | Buffer | null;
};
