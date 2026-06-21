import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_DATABASE_URL (or DATABASE_URL) must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.SUPABASE_DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Force UTF-8 on every new connection so Arabic / non-ASCII text never gets
// re-interpreted as Latin-1 by the driver (root cause of the Ø§Ù„ mojibake).
pool.on("connect", (client) => {
  client.query("SET client_encoding TO 'UTF8'").catch(() => {});
});

export const db = drizzle(pool, { schema });

export * from "./schema";
