import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import dns from "dns";

const { Pool } = pg;

// Force IPv4 for all DNS lookups to avoid Render -> Supabase connection issues
if ((dns as any).setDefaultResultOrder) {
  (dns as any).setDefaultResultOrder("ipv4first");
}

if (!process.env.DATABASE_URL) {
  console.warn(
    "DATABASE_URL not set. Falling back to memory storage.",
  );
}

function buildPool() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const url = new URL(process.env.DATABASE_URL);
    // Detect Supabase domains for automatic SSL configuration
    const isSupabase =
      url.hostname.endsWith("supabase.co") ||
      url.hostname.endsWith("supabase.com") ||
      url.hostname.endsWith("pooler.supabase.com");

    let ssl: any = undefined;
    const sslMode = url.searchParams.get("sslmode");
    if (sslMode === "require" || isSupabase) {
      ssl = { rejectUnauthorized: false };
    }

    const lookup4 = (hostname: string, opts: any, cb: any) => {
      // Handle the case where opts is the callback
      if (typeof opts === "function") {
        cb = opts;
        opts = undefined;
      }

      // Optional override to force an IPv4 host if provider returns AAAA-only or is firewalled
      if (process.env.PG_IPV4_HOST && hostname === new URL(process.env.DATABASE_URL!).hostname) {
        const result = { address: process.env.PG_IPV4_HOST, family: 4 };
        if (opts && opts.all) {
          return cb(null, [result]);
        }
        return cb(null, result.address, result.family);
      }

      // Default to forcing IPv4 for consistency
      return dns.lookup(hostname, Object.assign({ family: 4 }, opts || {}), (...args) => {
        cb(...args);
      });
    };

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
