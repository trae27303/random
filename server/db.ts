import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import dns from "dns";

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
  const lookup4 = ((hostname: string, _opts: any, cb: any) =>
    dns.lookup(hostname, { family: 4, all: false }, cb)) as any;
  const cfg: any = { connectionString: process.env.DATABASE_URL, ssl, lookup: lookup4 };
  return new Pool(cfg);
}

export const pool = buildPool();
export const db = pool ? drizzle(pool, { schema }) : null;
