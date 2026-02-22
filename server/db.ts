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
    const hostname = url.hostname;
    const isSupabase =
      hostname.endsWith("supabase.co") ||
      hostname.endsWith("supabase.com") ||
      hostname.endsWith("pooler.supabase.com");

    console.log(`[DB] Initializing connection to host: ${hostname} (Supabase detected: ${isSupabase})`);

    let ssl: any = undefined;
    const sslMode = url.searchParams.get("sslmode");
    if (sslMode === "require" || isSupabase) {
      ssl = {
        rejectUnauthorized: false,
        servername: hostname // Explicitly set for SNI to resolve "tenant not found" issues
      };
      console.log(`[DB] SSL enabled for ${hostname} (rejectUnauthorized: false, servername: ${hostname})`);
    }

    const lookup4 = (targetHostname: string, opts: any, cb: any) => {
      if (typeof opts === "function") {
        cb = opts;
        opts = undefined;
      }

      // If we have a forced IPv4 host override
      if (process.env.PG_IPV4_HOST && targetHostname === hostname) {
        console.log(`[DB] Applying forced IPv4 host override: ${process.env.PG_IPV4_HOST}`);
        return dns.lookup(process.env.PG_IPV4_HOST, { family: 4 }, (err, address, family) => {
          if (err) {
            console.error(`[DB] Forced IPv4 lookup failed for ${process.env.PG_IPV4_HOST}:`, err);
            return cb(err);
          }
          console.log(`[DB] Resolved ${targetHostname} to ${address} via override`);
          const result = { address, family };
          if (opts && opts.all) return cb(null, [result]);
          return cb(null, result.address, result.family);
        });
      }

      // Default forcing IPv4 for all lookups
      return dns.lookup(targetHostname, Object.assign({ family: 4 }, opts || {}), (...args) => {
        const [err, address] = args;
        if (!err) {
           // Only log successful lookups for the main host to avoid noise
           if (targetHostname === hostname) {
             const resolvedAddr = Array.isArray(address) ? address[0].address : address;
             console.log(`[DB] Resolved ${targetHostname} to ${resolvedAddr}`);
           }
        } else {
           console.error(`[DB] Lookup failed for ${targetHostname}:`, err);
        }
        cb(...args);
      });
    };

    const cfg: any = {
      connectionString: process.env.DATABASE_URL,
      ssl,
      lookup: lookup4,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    };
    return new Pool(cfg);
  } catch (err) {
    console.error("[DB] Failed to initialize pool:", err);
    return null;
  }
}

export const pool = buildPool();
export const db = pool ? drizzle(pool, { schema }) : null;
