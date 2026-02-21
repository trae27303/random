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

export const storage = db ? new DatabaseStorage() : new MemoryStorage();
