import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { wsClientMessageSchema, type WsServerMessage, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStoreFactory from "memorystore";

const MemoryStore = MemoryStoreFactory(session);

// Extend session user type
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      role: "user" | "model";
      tokens: number;
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // --- SESSION & AUTH SETUP ---
  const sessionMiddleware = session({
    store: new MemoryStore({ checkPeriod: 86400000 }),
    secret: process.env.SESSION_SECRET || "change-me",
    resave: false,
    saveUninitialized: false,
    proxy: true, // Required for secure cookies behind Render's proxy
    cookie: {
      maxAge: 86400000, // 1 day
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    }
  });

  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      console.log(`[Auth] Attempting login for: ${username}`);
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.warn(`[Auth] User not found: ${username}`);
        return done(null, false, { message: "Invalid credentials" });
      }
      if (user.password !== password) { // Plain text for simplicity as requested, in prod use bcrypt
        console.warn(`[Auth] Password mismatch for: ${username}`);
        return done(null, false, { message: "Invalid credentials" });
      }
      console.log(`[Auth] Login successful for: ${username} (ID: ${user.id})`);
      return done(null, user);
    } catch (err) {
      console.error(`[Auth] Database error during login for ${username}:`, err);
      return done(err);
    }
  }));

  passport.serializeUser((user, done) => {
    console.log(`[Auth] Serializing user ID: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) console.warn(`[Auth] Failed to deserialize user ID: ${id}`);
      done(null, user);
    } catch (err) {
      console.error(`[Auth] Error deserializing user ID: ${id}`, err);
      done(err);
    }
  });

  // --- AUTH ROUTES ---
  app.post("/api/register", async (req, res, next) => {
    try {
      const data = insertUserSchema.parse(req.body);
      console.log(`[Auth] Registering new user: ${data.username}`);
      const existing = await storage.getUserByUsername(data.username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const user = await storage.createUser(data);
      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Login failed" });

      req.login(user, (err) => {
        if (err) return next(err);
        console.log(`[Auth] Session established for user: ${user.username}, SessionID: ${req.sessionID}`);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const username = req.user?.username;
    req.logout((err) => {
      if (err) return next(err);
      console.log(`[Auth] Logged out user: ${username}`);
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/user", (req, res) => {
    const isAuth = req.isAuthenticated();
    console.log(`[Auth] GET /api/user - Authenticated: ${isAuth}, SessionID: ${req.sessionID}, UserID: ${req.user?.id || 'none'}`);
    if (!isAuth) return res.status(401).json({ message: "Not authenticated" });
    res.json(req.user);
  });

  // --- TOKEN & MODEL ROUTES ---
  app.post("/api/tokens/add", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const amount = parseInt(req.body.amount || "0");
    if (amount <= 0) return res.status(400).json({ message: "Invalid amount" });

    // Mock payment success
    const updated = await storage.updateUserTokens(req.user!.id, req.user!.tokens + amount);
    res.json(updated);
  });

  app.get("/api/models", async (req, res) => {
    const models = await storage.getModels();
    res.json(models);
  });

  app.post("/api/models/join", async (req, res) => {
    // TODO: Add logic to upgrade user to model if needed
    // For now, role is set at registration
    res.status(501).json({ message: "Not implemented yet" });
  });

  // --- EXISTING ROUTES ---
  app.post(api.reports.create.path, async (req, res) => {
    try {
      const input = api.reports.create.input.parse(req.body);
      const report = await storage.createReport(input);
      res.status(201).json(report);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.stats.get.path, (req, res) => {
    res.json({ activeUsers: activeUsersCount });
  });

  // --- WEBSOCKET SERVER ---
  const wss = new WebSocketServer({ noServer: true }); // Attach manually to handle session

  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url === '/ws') {
      // @ts-ignore
      sessionMiddleware(request, {} as any, () => {
        // @ts-ignore
        passport.session()(request, {} as any, () => {
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
          });
        });
      });
    }
  });

  let activeUsersCount = 0;

  // Random Chat Queues
  let waitingUsers: WebSocket[] = [];
  const activeMatches = new Map<WebSocket, WebSocket>();

  // Direct Call Maps
  const userSockets = new Map<number, WebSocket>(); // userId -> WS
  const activeCalls = new Map<number, NodeJS.Timeout>(); // callId -> timer

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

  wss.on("connection", (ws, req: any) => {
    activeUsersCount++;
    const user = req.user as Express.User | undefined;

    if (user) {
      userSockets.set(user.id, ws);
      // Mark as online?
    }

    ws.on("message", async (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        const message = wsClientMessageSchema.parse(parsed);

        switch (message.type) {
          // --- RANDOM CHAT LOGIC ---
          case "join":
            if (activeMatches.has(ws) || waitingUsers.includes(ws)) return;
            if (waitingUsers.length > 0) {
              const peer = waitingUsers.shift()!;
              if (peer.readyState !== WebSocket.OPEN) {
                waitingUsers.push(ws);
                sendMessage(ws, { type: "waiting" });
                return;
              }
              activeMatches.set(ws, peer);
              activeMatches.set(peer, ws);
              sendMessage(ws, { type: "match", initiator: true });
              sendMessage(peer, { type: "match", initiator: false });
            } else {
              waitingUsers.push(ws);
              sendMessage(ws, { type: "waiting" });
            }
            break;

          case "skip":
            unmatch(ws);
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

          // --- WEBRTC SIGNALING (SHARED) ---
          case "offer":
          case "answer":
          case "ice-candidate":
          case "chat":
            if (message.targetId) {
              // Direct Call Signaling
              const targetWs = userSockets.get(message.targetId);
              if (targetWs) {
                sendMessage(targetWs, { ...message, fromId: user?.id } as any);
              }
            } else {
              // Random Chat Signaling
              const peer = activeMatches.get(ws);
              if (peer) {
                sendMessage(peer, message as any);
              }
            }
            break;

          // --- DIRECT CALL LOGIC ---
          case "request_call": {
            if (!user) return;
            const modelId = message.modelId;
            const modelWs = userSockets.get(modelId);

            // Check tokens
            const currentUser = await storage.getUser(user.id);
            if (!currentUser || currentUser.tokens < 20) {
              sendMessage(ws, { type: "error", message: "Insufficient tokens. Need at least 20." });
              return;
            }

            if (!modelWs) {
              sendMessage(ws, { type: "error", message: "Model is offline" });
              return;
            }

            // Create call record
            const call = await storage.createCall({
              callerId: user.id,
              modelId: modelId,
              costPerMinute: 20
            });

            // Notify Model
            sendMessage(modelWs, {
              type: "incoming_call",
              callId: call.id,
              callerId: user.id,
              callerName: user.username
            });
            break;
          }

          case "accept_call": {
            if (!user) return;
            const call = await storage.getCall(message.callId);
            if (!call || call.modelId !== user.id || call.status !== "pending") return;

            await storage.updateCallStatus(call.id, "active"); // Status active but timer starts on connection? Or now?
            // Let's start timer now for simplicity, or wait for WebRTC connection?
            // Requirement: "token start consume after they got connected"
            // For simplicity, we assume "accept" = connected start. 
            // Ideally we wait for ICE connection state, but that's complex.

            const callerWs = userSockets.get(call.callerId);
            if (callerWs) {
              sendMessage(callerWs, { type: "call_accepted", callId: call.id, modelId: user.id });
            }

            // Start Timer Loop
            const timer = setInterval(async () => {
              const currentCall = await storage.getCall(call.id);
              if (!currentCall || currentCall.status !== "active") {
                clearInterval(timer);
                return;
              }

              const caller = await storage.getUser(call.callerId);
              const model = await storage.getUser(call.modelId);

              if (!caller || caller.tokens < 20) {
                // End call due to no funds
                await storage.endCall(call.id, new Date(), currentCall.totalCost || 0);
                clearInterval(timer);
                const cWs = userSockets.get(call.callerId);
                const mWs = userSockets.get(call.modelId);
                if (cWs) sendMessage(cWs, { type: "call_ended", callId: call.id, reason: "Insufficient tokens" });
                if (mWs) sendMessage(mWs, { type: "call_ended", callId: call.id, reason: "User ran out of tokens" });
                return;
              }

              // Deduct tokens
              await storage.updateUserTokens(caller.id, caller.tokens - 20);
              await storage.updateUserTokens(model!.id, model!.tokens + 5); // Model earns 5

              // Notify updates
              const cWs = userSockets.get(call.callerId);
              const mWs = userSockets.get(call.modelId);
              if (cWs) sendMessage(cWs, { type: "token_update", tokens: caller.tokens - 20 });
              if (mWs) sendMessage(mWs, { type: "token_update", tokens: model!.tokens + 5 });

            }, 60000); // Every minute

            activeCalls.set(call.id, timer);
            break;
          }

          case "reject_call": {
            if (!user) return;
            const call = await storage.getCall(message.callId);
            if (!call || call.modelId !== user.id) return;

            await storage.updateCallStatus(call.id, "rejected");
            const callerWs = userSockets.get(call.callerId);
            if (callerWs) {
              sendMessage(callerWs, { type: "call_rejected", callId: call.id, reason: "Busy" });
            }
            break;
          }

          case "end_call": {
            const call = await storage.getCall(message.callId);
            if (!call) return;

            // Cleanup
            const timer = activeCalls.get(call.id);
            if (timer) {
              clearInterval(timer);
              activeCalls.delete(call.id);
            }

            await storage.endCall(call.id, new Date(), call.totalCost || 0);

            const otherId = user?.id === call.callerId ? call.modelId : call.callerId;
            const otherWs = userSockets.get(otherId);
            if (otherWs) {
              sendMessage(otherWs, { type: "call_ended", callId: call.id, reason: "Peer ended call" });
            }
            break;
          }
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    });

    ws.on("close", () => {
      activeUsersCount--;
      removeFromWaiting(ws);
      unmatch(ws);
      if (user) {
        userSockets.delete(user.id);
        // Clean up active calls? Maybe logic to end them if user disconnects?
      }
    });

    ws.on("error", () => {
      removeFromWaiting(ws);
      unmatch(ws);
      if (user) {
        userSockets.delete(user.id);
      }
    });
  });

  return httpServer;
}
