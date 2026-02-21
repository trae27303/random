import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn(
    "DATABASE_URL not set. Falling back to memory storage.",
  );
}

function buildPool() {
  if (!process.env.DATABASE_URL) return null;
  let ssl: any = undefined;
  try {
    const url = new URL(process.env.DATABASE_URL);
    const sslMode = url.searchParams.get("sslmode");
    if (sslMode === "require" || url.hostname.endsWith("supabase.co")) {
      ssl = { rejectUnauthorized: false };
    }
  } catch {}
  return new Pool({ connectionString: process.env.DATABASE_URL, ssl });
}

export const pool = buildPool();
export const db = pool ? drizzle(pool, { schema }) : null;
