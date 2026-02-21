import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We keep a simple table for analytics or reports (e.g., if a user reports someone)
// Most of the app logic is transient and relies on WebSockets.
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true });

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

// === WEBSOCKET SCHEMAS ===
// These define the exact payload structure for WS messages

// From Client to Server
export const wsClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("join") }),
  z.object({ type: z.literal("skip") }),
  z.object({ type: z.literal("offer"), sdp: z.any() }), // RTCSessionDescriptionInit
  z.object({ type: z.literal("answer"), sdp: z.any() }), // RTCSessionDescriptionInit
  z.object({ type: z.literal("ice-candidate"), candidate: z.any() }), // RTCIceCandidateInit
  z.object({ type: z.literal("chat"), message: z.string() }),
]);

export type WsClientMessage = z.infer<typeof wsClientMessageSchema>;

// From Server to Client
export const wsServerMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("waiting") }),
  z.object({ type: z.literal("match"), initiator: z.boolean() }),
  z.object({ type: z.literal("peer_left") }),
  z.object({ type: z.literal("offer"), sdp: z.any() }),
  z.object({ type: z.literal("answer"), sdp: z.any() }),
  z.object({ type: z.literal("ice-candidate"), candidate: z.any() }),
  z.object({ type: z.literal("chat"), message: z.string() }),
]);

export type WsServerMessage = z.infer<typeof wsServerMessageSchema>;
