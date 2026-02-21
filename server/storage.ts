import { db } from "./db";
import { reports, type InsertReport, type Report } from "@shared/schema";

export interface IStorage {
  createReport(report: InsertReport): Promise<Report>;
}

export class DatabaseStorage implements IStorage {
  async createReport(report: InsertReport): Promise<Report> {
    const [created] = await db.insert(reports).values(report).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
