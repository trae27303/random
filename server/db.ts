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
    const isSupabase = url.hostname.endsWith("supabase.co") || url.hostname.endsWith("supabase.com");

    const sslMode = url.searchParams.get("sslmode");
    if (sslMode === "require" || isSupabase) {
      ssl = { rejectUnauthorized: false };
    }

    const lookup4 = ((hostname: string, _opts: any, cb: any) => {
      // If PG_IPV4_HOST is provided, use it to override the resolved IP
      // while keeping the original hostname for SNI/routing.
      if (process.env.PG_IPV4_HOST) {
        return cb(null, [{ address: process.env.PG_IPV4_HOST, family: 4 }]);
      }
      return dns.lookup(hostname, { family: 4, all: false }, cb);
    }) as any;

    const cfg: any = {
      connectionString: process.env.DATABASE_URL,
      ssl,
      lookup: lookup4
    };
    return new Pool(cfg);
  } catch (err) {
    console.error("[DB] Failed to initialize pool:", err);
    return null;
  }
}

export const pool = buildPool();
export const db = pool ? drizzle(pool, { schema }) : null;
