import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, client } from "./db";

async function main() {
  if (!db || !client) {
    console.error("Database connection not established. Skipping migrations.");
    process.exit(1);
  }

  console.log("[Migration] Running migrations...");
  try {
    await migrate(db, { migrationsFolder: "./migrations" });
    console.log("[Migration] Migrations completed successfully.");
  } catch (error) {
    console.error("[Migration] Error during migration:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
