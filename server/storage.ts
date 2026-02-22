import { db } from "./db";
import { reports, users, calls, type InsertReport, type Report, type InsertUser, type User, type InsertCall, type Call } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  createReport(report: InsertReport): Promise<Report>;

  // User Management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTokens(id: number, tokens: number): Promise<User>;
  getModels(): Promise<User[]>;
  updateUserOnline(id: number, isOnline: boolean): Promise<User>;

  // Call Management
  createCall(call: InsertCall): Promise<Call>;
  getCall(id: number): Promise<Call | undefined>;
  updateCallStatus(id: number, status: "pending" | "accepted" | "rejected" | "active" | "completed" | "expired"): Promise<Call>;
  endCall(id: number, endTime: Date, totalCost: number): Promise<Call>;
}

export class DatabaseStorage implements IStorage {
  async createReport(report: InsertReport): Promise<Report> {
    if (!db) throw new Error("Database not initialized");
    const [created] = await db.insert(reports).values(report).returning();
    return created;
  }

  async getUser(id: number): Promise<User | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    if (!db) throw new Error("Database not initialized");
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUserTokens(id: number, tokens: number): Promise<User> {
    if (!db) throw new Error("Database not initialized");
    const [updated] = await db.update(users)
      .set({ tokens })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getModels(): Promise<User[]> {
    if (!db) throw new Error("Database not initialized");
    return await db.select().from(users).where(eq(users.role, "model"));
  }

  async updateUserOnline(id: number, isOnline: boolean): Promise<User> {
    if (!db) throw new Error("Database not initialized");
    const [updated] = await db.update(users)
      .set({ isOnline })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async createCall(call: InsertCall): Promise<Call> {
    if (!db) throw new Error("Database not initialized");
    const [created] = await db.insert(calls).values(call).returning();
    return created;
  }

  async getCall(id: number): Promise<Call | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [call] = await db.select().from(calls).where(eq(calls.id, id));
    return call;
  }

  async updateCallStatus(id: number, status: "pending" | "accepted" | "rejected" | "active" | "completed" | "expired"): Promise<Call> {
    if (!db) throw new Error("Database not initialized");
    const [updated] = await db.update(calls)
      .set({ status })
      .where(eq(calls.id, id))
      .returning();
    return updated;
  }

  async endCall(id: number, endTime: Date, totalCost: number): Promise<Call> {
    if (!db) throw new Error("Database not initialized");
    const [updated] = await db.update(calls)
      .set({ endTime, status: "completed", totalCost })
      .where(eq(calls.id, id))
      .returning();
    return updated;
  }
}

export class MemoryStorage implements IStorage {
  private reports: Report[] = [];
  private users: User[] = [];
  private calls: Call[] = [];

  private reportId = 1;
  private userId = 1;
  private callId = 1;

  async createReport(report: InsertReport): Promise<Report> {
    const created: Report = {
      ...report,
      id: this.reportId++,
      createdAt: new Date(),
    };
    this.reports.push(created);
    return created;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.find((u) => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find((u) => u.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const created: User = {
      ...user,
      id: this.userId++,
      tokens: 0,
      role: user.role || "user",
      isOnline: false,
      createdAt: new Date(),
    };
    this.users.push(created);
    return created;
  }

  async updateUserTokens(id: number, tokens: number): Promise<User> {
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new Error("User not found");
    user.tokens = tokens;
    return user;
  }

  async getModels(): Promise<User[]> {
    return this.users.filter((u) => u.role === "model");
  }

  async updateUserOnline(id: number, isOnline: boolean): Promise<User> {
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new Error("User not found");
    user.isOnline = isOnline;
    return user;
  }

  async createCall(call: InsertCall): Promise<Call> {
    const created: Call = {
      ...call,
      id: this.callId++,
      startTime: null,
      endTime: null,
      status: "pending",
      totalCost: 0,
      costPerMinute: 20,
      createdAt: new Date(),
    };
    this.calls.push(created);
    return created;
  }

  async getCall(id: number): Promise<Call | undefined> {
    return this.calls.find((c) => c.id === id);
  }

  async updateCallStatus(id: number, status: "pending" | "accepted" | "rejected" | "active" | "completed" | "expired"): Promise<Call> {
    const call = this.calls.find((c) => c.id === id);
    if (!call) throw new Error("Call not found");
    call.status = status;
    return call;
  }

  async endCall(id: number, endTime: Date, totalCost: number): Promise<Call> {
    const call = this.calls.find((c) => c.id === id);
    if (!call) throw new Error("Call not found");
    call.endTime = endTime;
    call.status = "completed";
    call.totalCost = totalCost;
    return call;
  }
}

export class HttpStorage implements IStorage {
  private base: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, authToken?: string) {
    this.base = baseUrl.replace(/\/+$/, "");
    this.headers = {
      "Content-Type": "application/json",
      ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {})
    };
  }

  private async req<T>(method: string, path: string, body?: any): Promise<T> {
    const url = `${this.base}${path}`;
    const options: RequestInit = {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    try {
      const res = await fetch(url, options);

      if (!res.ok) {
        const text = await res.text();
        let message = text;
        try {
          const json = JSON.parse(text);
          message = json.message || text;
        } catch {
          // Fallback to raw text
        }

        console.error(`HttpStorage Error [${method} ${url}]: ${res.status} ${message}`);
        throw new Error(message);
      }

      if (res.status === 204) return undefined as unknown as T;
      return (await res.json()) as T;
    } catch (err) {
      console.error(`HttpStorage Request Failed [${method} ${url}]:`, err);
      throw err;
    }
  }

  async createReport(report: InsertReport): Promise<Report> {
    return this.req<Report>("POST", "/reports", report);
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      return await this.req<User>("GET", `/users/${id}`);
    } catch (err) {
      // 404 is valid for getUser if not found
      if (err instanceof Error && err.message.includes("404")) return undefined;
      throw err;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      return await this.req<User>("GET", `/users/by-username/${encodeURIComponent(username)}`);
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) return undefined;
      throw err;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.req<User>("POST", `/users`, user);
  }

  async updateUserTokens(id: number, tokens: number): Promise<User> {
    return this.req<User>("PATCH", `/users/${id}/tokens`, { tokens });
  }

  async getModels(): Promise<User[]> {
    return this.req<User[]>("GET", `/models`);
  }

  async updateUserOnline(id: number, isOnline: boolean): Promise<User> {
    return this.req<User>("PATCH", `/users/${id}/online`, { isOnline });
  }

  async createCall(call: InsertCall): Promise<Call> {
    return this.req<Call>("POST", `/calls`, call);
  }

  async getCall(id: number): Promise<Call | undefined> {
    try {
      return await this.req<Call>("GET", `/calls/${id}`);
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) return undefined;
      throw err;
    }
  }

  async updateCallStatus(id: number, status: "pending" | "accepted" | "rejected" | "active" | "completed" | "expired"): Promise<Call> {
    return this.req<Call>("PATCH", `/calls/${id}/status`, { status });
  }

  async endCall(id: number, endTime: Date, totalCost: number): Promise<Call> {
    return this.req<Call>("POST", `/calls/${id}/end`, { endTime, totalCost });
  }
}

const storageBackend = process.env.STORAGE_BACKEND;
const storageBaseUrl = process.env.STORAGE_BASE_URL;

// Prioritize DatabaseStorage if DATABASE_URL is present, unless HTTP is explicitly requested and configured.
const isHttp = storageBackend === "http" && !!storageBaseUrl;
let storageInstance: IStorage;

if (isHttp) {
  console.log(`[Storage] Selected: HttpStorage (Target: ${storageBaseUrl})`);
  storageInstance = new HttpStorage(storageBaseUrl!, process.env.STORAGE_TOKEN);
} else if (db) {
  console.log(`[Storage] Selected: DatabaseStorage (Direct SQL Connection)`);
  storageInstance = new DatabaseStorage();
} else {
  if (process.env.DATABASE_URL) {
    console.error(`[Storage] CRITICAL: DATABASE_URL is set but database pool failed to initialize. Falling back to MemoryStorage.`);
  } else {
    console.warn(`[Storage] Selected: MemoryStorage (DATABASE_URL missing and HTTP storage not configured)`);
  }
  storageInstance = new MemoryStorage();
}

export const storage = storageInstance;
