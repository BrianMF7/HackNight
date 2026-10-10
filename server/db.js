import postgres from "postgres";

/** Tiger / Postgres client for the clinical server. Null when DATABASE_URL is unset. */
export function createSql(databaseUrl = process.env.DATABASE_URL || "") {
  if (!databaseUrl) return null;
  return postgres(databaseUrl, {
    ssl: "require",
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
  });
}

export async function pingDatabase(sql) {
  if (!sql) {
    const err = new Error("DATABASE_URL is not set");
    err.code = "NO_DATABASE";
    throw err;
  }
  const [row] = await sql`select 1 as ok, current_database() as db, now() as ts`;
  return { ok: true, db: row.db, ts: row.ts };
}
