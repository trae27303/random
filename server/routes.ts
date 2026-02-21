import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { wsClientMessageSchema, type WsServerMessage } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // --- REST API ROUTES ---
  app.post(api.reports.create.path, async (req, res) => {
    try {
      const input = api.reports.create.input.parse(req.body);
      const report = await storage.createReport(input);
      res.status(201).json(report);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.stats.get.path, (req, res) => {
    res.json({ activeUsers: activeUsersCount });
  });

  // --- WEBSOCKET SERVER ---
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  let activeUsersCount = 0;
  
  // A simple queue for users waiting for a match
  let waitingUsers: WebSocket[] = [];
  
  // Map of active pairs
  const activeMatches = new Map<WebSocket, WebSocket>();

  function sendMessage(ws: WebSocket, message: WsServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  function unmatch(ws: WebSocket) {
    const peer = activeMatches.get(ws);
    if (peer) {
      activeMatches.delete(ws);
      activeMatches.delete(peer);
      sendMessage(peer, { type: "peer_left" });
    }
  }

  function removeFromWaiting(ws: WebSocket) {
    waitingUsers = waitingUsers.filter((u) => u !== ws);
  }

  wss.on("connection", (ws) => {
    activeUsersCount++;

    ws.on("message", (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        const message = wsClientMessageSchema.parse(parsed);

        switch (message.type) {
          case "join":
            // If already matched or waiting, ignore
            if (activeMatches.has(ws) || waitingUsers.includes(ws)) {
              return;
            }

            if (waitingUsers.length > 0) {
              // Match with the first waiting user
              const peer = waitingUsers.shift()!;
              
              // Ensure peer is still open
              if (peer.readyState !== WebSocket.OPEN) {
                // Retry join logic if peer is dead
                waitingUsers.push(ws);
                sendMessage(ws, { type: "waiting" });
                return;
              }

              activeMatches.set(ws, peer);
              activeMatches.set(peer, ws);

              // Notify both
              sendMessage(ws, { type: "match", initiator: true });
              sendMessage(peer, { type: "match", initiator: false });
            } else {
              waitingUsers.push(ws);
              sendMessage(ws, { type: "waiting" });
            }
            break;

          case "skip":
            // Unmatch current peer
            unmatch(ws);
            // Re-join logic for the user who skipped
            if (waitingUsers.length > 0) {
              const peer = waitingUsers.shift()!;
              if (peer.readyState !== WebSocket.OPEN) {
                waitingUsers.push(ws);
                sendMessage(ws, { type: "waiting" });
              } else {
                activeMatches.set(ws, peer);
                activeMatches.set(peer, ws);
                sendMessage(ws, { type: "match", initiator: true });
                sendMessage(peer, { type: "match", initiator: false });
              }
            } else {
              waitingUsers.push(ws);
              sendMessage(ws, { type: "waiting" });
            }
            break;

          case "offer":
          case "answer":
          case "ice-candidate":
          case "chat":
            // Forward these messages to the peer
            const peer = activeMatches.get(ws);
            if (peer) {
              sendMessage(peer, message as WsServerMessage);
            }
            break;
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    });

    ws.on("close", () => {
      activeUsersCount--;
      removeFromWaiting(ws);
      unmatch(ws);
    });
    
    ws.on("error", () => {
      removeFromWaiting(ws);
      unmatch(ws);
    });
  });

  return httpServer;
}
