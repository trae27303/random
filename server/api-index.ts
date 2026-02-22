import "dotenv/config";
import dns from "dns";
// Force IPv4 for all DNS lookups to avoid Render -> Supabase connection issues
if ((dns as any).setDefaultResultOrder) {
  (dns as any).setDefaultResultOrder("ipv4first");
}

import express from "express";
import { db as rawDb } from "./db";
import { reports, users, calls, type InsertReport, type InsertUser, type InsertCall } from "@shared/schema";
import { eq } from "drizzle-orm";
import cors from "cors";

if (!rawDb) {
  console.error("DATABASE_URL is required for API service");
  process.exit(1);
}
const db = rawDb!;

const app = express();
app.use(express.json());

const allowedOrigin = process.env.API_CORS_ORIGIN || "*";
app.use(
  cors({
    origin: allowedOrigin === "*" ? true : allowedOrigin.split(","),
    credentials: false,
  }),
);

function requireBearer(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");
  if (!process.env.STORAGE_SERVER_TOKEN) {
    return res.status(500).json({ message: "Server token not configured" });
  }
  if (!token || token !== process.env.STORAGE_SERVER_TOKEN) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use(requireBearer);

// Reports
app.post("/reports", async (req, res, next) => {
  try {
    const data = req.body as InsertReport;
    const [created] = await db.insert(reports).values(data).returning();
    res.json(created);
  } catch (err) {
    next(err);
  }
});

// Users
app.get("/users/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return res.status(404).json({ message: "Not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

app.get("/users/by-username/:username", async (req, res, next) => {
  try {
    const username = req.params.username;
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) return res.status(404).json({ message: "Not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

app.post("/users", async (req, res, next) => {
  try {
    const data = req.body as InsertUser;
    const [created] = await db.insert(users).values(data).returning();
    res.json(created);
  } catch (err) {
    next(err);
  }
});

app.patch("/users/:id/tokens", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const tokens = Number(req.body.tokens);
    const [updated] = await db.update(users).set({ tokens }).where(eq(users.id, id)).returning();
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.get("/models", async (_req, res, next) => {
  try {
    const rows = await db.select().from(users).where(eq(users.role, "model"));
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Calls
app.post("/calls", async (req, res, next) => {
  try {
    const data = req.body as InsertCall;
    const [created] = await db.insert(calls).values(data).returning();
    res.json(created);
  } catch (err) {
    next(err);
  }
});

app.get("/calls/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(calls).where(eq(calls.id, id));
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

app.patch("/calls/:id/status", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const status = req.body.status as "pending" | "accepted" | "rejected" | "active" | "completed" | "expired";
    const [updated] = await db.update(calls).set({ status }).where(eq(calls.id, id)).returning();
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.post("/calls/:id/end", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const endTime = new Date(req.body.endTime);
    const totalCost = Number(req.body.totalCost);
    const [updated] = await db.update(calls)
      .set({ endTime, status: "completed", totalCost })
      .where(eq(calls.id, id))
      .returning();
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const errorDetails = {
    message: err?.message || "Internal Error",
    code: err?.code,
    detail: err?.detail,
    stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
  };

  console.error("[API Error]", {
    ...errorDetails,
    stack: err?.stack, // Always log stack to console
  });

  res.status(500).json({ message: errorDetails.message });
});

const port = parseInt(process.env.PORT || "5001", 10);
app.listen(port, "0.0.0.0", () => {
  console.log(`api listening on ${port}`);
});
