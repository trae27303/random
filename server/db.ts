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
    "[DB] DATABASE_URL not set. Falling back to memory storage.",
  );
}

function buildPool() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const url = new URL(process.env.DATABASE_URL);
    const hostname = url.hostname;

    // Detect Supabase domains for automatic SSL and SNI configuration
    const isSupabase =
      hostname.endsWith("supabase.co") ||
      hostname.endsWith("supabase.com") ||
      hostname.endsWith("pooler.supabase.com");

    console.log(`[DB] Configuring connection to ${hostname} (Supabase: ${isSupabase})`);

    let ssl: any = undefined;
    const sslMode = url.searchParams.get("sslmode");
    if (sslMode === "require" || isSupabase) {
      ssl = {
        rejectUnauthorized: false,
        servername: hostname // CRITICAL: Preserves SNI for Supavisor/Supabase tenant routing
      };
    }

    const lookup4 = (targetHostname: string, opts: any, cb: any) => {
      if (typeof opts === "function") {
        cb = opts;
        opts = undefined;
      }

      // If we have a forced IPv4 host override (e.g. to bypass IPv6 issues on Render)
      const hostOverride = process.env.PG_IPV4_HOST;
      if (hostOverride && targetHostname === hostname) {
        return dns.lookup(hostOverride, { family: 4 }, (err, address, family) => {
          if (err) {
            console.error(`[DB] DNS Override failed for ${hostOverride}:`, err);
            return cb(err);
          }
          const result = { address, family };
          if (opts && opts.all) return cb(null, [result]);
          return cb(null, result.address, result.family);
        });
      }

      // Default to forcing IPv4 for all database lookups
      return dns.lookup(targetHostname, Object.assign({ family: 4 }, opts || {}), (...args) => {
        cb(...args);
      });
    };

    const cfg: any = {
      connectionString: process.env.DATABASE_URL,
      ssl,
      lookup: lookup4,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      max: 10
    };

    return new Pool(cfg);
  } catch (err) {
    console.error("[DB] Failed to parse DATABASE_URL or initialize pool:", err);
    return null;
  }
}

export const pool = buildPool();
export const db = pool ? drizzle(pool, { schema }) : null;

// Perform a simple health check query at startup
if (pool) {
  pool.query('SELECT 1')
    .then(() => {
      console.log("[DB] Database connection health check successful (SELECT 1)");
    })
    .catch((err) => {
      console.error("[DB] Database connection health check failed:", err.message);
      if (err.message.includes("tenant") || err.message.includes("user")) {
        console.error("[DB] HINT: The 'tenant or user not found' error often indicates an SNI mismatch or an incorrect project-ref in the hostname.");
      }
    });
}
