/// <reference types="node" />
import postgres from 'postgres';

// Only connect if DATABASE_URL is set (per your plan)
// Missing DATABASE_URL skips the insert; download and email already succeeded.
const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, {
      ssl: 'require',
      max: 10, // Connection pool size
      idle_timeout: 20,
      max_lifetime: 60 * 30,
    })
  : null;

// Export the SQL client
export default sql;

// Helper to check if database is configured
export const isDatabaseConfigured = () => sql !== null;
