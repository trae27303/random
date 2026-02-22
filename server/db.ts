import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";
import dns from "dns";

// Force IPv4 for all DNS lookups to avoid Render -> Supabase connection issues
// if ((dns as any).setDefaultResultOrder) {
//   (dns as any).setDefaultResultOrder("ipv4first");
// }

if (!process.env.DATABASE_URL) {
  console.warn(
    "[DB] DATABASE_URL not set. Falling back to memory storage.",
  );
}

function buildClient() {
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

    const ssl = (url.searchParams.get("sslmode") === "require" || isSupabase)
      ? {
          rejectUnauthorized: false,
          servername: hostname // CRITICAL: Preserves SNI for Supavisor/Supabase tenant routing
        }
      : false;

    // Use postgres-js with prepare: false for Supabase Transaction Mode
    const queryClient = postgres(process.env.DATABASE_URL, {
      prepare: false,
      ssl,
      // Forcing IPv4 via host override if provided
      host: process.env.PG_IPV4_HOST || hostname,
      connect_timeout: 15,
      idle_timeout: 30,
      max: 10
    });

    return queryClient;
  } catch (err) {
    console.error("[DB] Failed to initialize postgres client:", err);
    return null;
  }
}

export const client = buildClient();
export const db = client ? drizzle(client, { schema }) : null;

// Perform a simple health check query at startup
if (client) {
  // Use setTimeout to avoid blocking server startup
  setTimeout(() => {
    client`SELECT 1`
      .then(() => {
        console.log("[DB] Database connection health check successful (SELECT 1)");
      })
      .catch((err) => {
        console.error("[DB] Database connection health check failed:", err.message);
        if (err.message.includes("tenant") || err.message.includes("user")) {
          console.error("[DB] HINT: The 'tenant or user not found' error often indicates an SNI mismatch or an incorrect project-ref in the hostname.");
        }
        // Don't crash the server on health check failure - just log it
      });
  }, 2000); // Wait 2 seconds before health check to allow connection to establish
}
