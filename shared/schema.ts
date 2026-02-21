import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === REPORTS ===
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true });
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

// === USERS ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["user", "model"] }).default("user").notNull(),
  tokens: integer("tokens").default(0).notNull(),
  isOnline: boolean("is_online").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, tokens: true, isOnline: true, createdAt: true });
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// === CALLS ===
export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  callerId: integer("caller_id").notNull(), // User who initiates
  modelId: integer("model_id").notNull(),   // Model who receives
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  status: text("status", { enum: ["pending", "accepted", "rejected", "active", "completed", "expired"] }).default("pending").notNull(),
  costPerMinute: integer("cost_per_minute").default(20).notNull(),
  totalCost: integer("total_cost").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCallSchema = createInsertSchema(calls).omit({ id: true, startTime: true, endTime: true, status: true, totalCost: true, createdAt: true });
export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;

// === WEBSOCKET SCHEMAS ===

// From Client to Server
export const wsClientMessageSchema = z.discriminatedUnion("type", [
  // Random Chat
  z.object({ type: z.literal("join") }),
  z.object({ type: z.literal("skip") }),
  
  // WebRTC Signaling (Shared)
  z.object({ type: z.literal("offer"), sdp: z.any(), targetId: z.number().optional() }), 
  z.object({ type: z.literal("answer"), sdp: z.any(), targetId: z.number().optional() }), 
  z.object({ type: z.literal("ice-candidate"), candidate: z.any(), targetId: z.number().optional() }), 
  z.object({ type: z.literal("chat"), message: z.string(), targetId: z.number().optional() }),

  // Direct Calls (Model System)
  z.object({ type: z.literal("request_call"), modelId: z.number() }),
  z.object({ type: z.literal("accept_call"), callId: z.number() }),
  z.object({ type: z.literal("reject_call"), callId: z.number() }),
  z.object({ type: z.literal("end_call"), callId: z.number() }),
]);

export type WsClientMessage = z.infer<typeof wsClientMessageSchema>;

// From Server to Client
export const wsServerMessageSchema = z.discriminatedUnion("type", [
  // Random Chat
  z.object({ type: z.literal("waiting") }),
  z.object({ type: z.literal("match"), initiator: z.boolean(), peerId: z.number().optional() }), // Added peerId for direct reference if needed
  z.object({ type: z.literal("peer_left") }),
  
  // WebRTC Signaling (Shared)
  z.object({ type: z.literal("offer"), sdp: z.any(), fromId: z.number().optional() }),
  z.object({ type: z.literal("answer"), sdp: z.any(), fromId: z.number().optional() }),
  z.object({ type: z.literal("ice-candidate"), candidate: z.any(), fromId: z.number().optional() }),
  z.object({ type: z.literal("chat"), message: z.string(), fromId: z.number().optional() }),

  // Direct Calls (Model System)
  z.object({ type: z.literal("incoming_call"), callId: z.number(), callerId: z.number(), callerName: z.string() }),
  z.object({ type: z.literal("call_accepted"), callId: z.number(), modelId: z.number() }), // To caller
  z.object({ type: z.literal("call_rejected"), callId: z.number(), reason: z.string().optional() }), // To caller
  z.object({ type: z.literal("call_ended"), callId: z.number(), reason: z.string().optional() }),
  z.object({ type: z.literal("token_update"), tokens: z.number() }),
  z.object({ type: z.literal("call_timer"), duration: z.number(), cost: z.number() }), // Periodic update during call
  z.object({ type: z.literal("error"), message: z.string() }),
]);

export type WsServerMessage = z.infer<typeof wsServerMessageSchema>;
