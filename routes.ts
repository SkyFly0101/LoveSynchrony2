import { Express } from "express";
import { createServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { storage } from "./storage";
import { insertCoupleSchema, insertMoodSchema } from "@shared/schema";

let wss: WebSocketServer;

function broadcastMood(mood: any) {
  if (wss?.clients) {
    const message = JSON.stringify({ type: 'mood_update', data: mood });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

export function registerRoutes(app: Express) {
  app.post("/api/couples", async (req, res) => {
    try {
      const couple = insertCoupleSchema.parse(req.body);
      const created = await storage.createCouple(couple);
      res.json(created);
    } catch (error) {
      res.status(400).json({ error: "Invalid couple data" });
    }
  });

  app.get("/api/couples/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const couple = await storage.getCouple(id);
    if (!couple) {
      res.status(404).json({ error: "Couple not found" });
      return;
    }
    res.json(couple);
  });

  app.post("/api/moods", async (req, res) => {
    try {
      const mood = insertMoodSchema.parse(req.body);
      const created = await storage.setMood(mood);
      broadcastMood(created);
      res.json(created);
    } catch (error) {
      res.status(400).json({ error: "Invalid mood data" });
    }
  });

  app.get("/api/share/:coupleId", async (req, res) => {
    try {
      const coupleId = parseInt(req.params.coupleId);
      const couple = await storage.getCouple(coupleId);
      if (!couple) {
        res.status(404).json({ error: "Couple not found" });
        return;
      }
      const shareUrl = `${req.protocol}://${req.get('host')}/?coupleId=${coupleId}`;
      res.json({ shareUrl, couple });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate share link" });
    }
  });

  app.get("/api/moods/:coupleId/:date", async (req, res) => {
    try {
      const coupleId = parseInt(req.params.coupleId);
      const date = new Date(req.params.date);
      if (isNaN(date.getTime())) {
        res.status(400).json({ error: "Invalid date format" });
        return;
      }

      // Add cache control headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const mood = await storage.getMood(coupleId, date);
      if (!mood) {
        return res.json({ partner1Mood: "none", partner2Mood: "none" });
      }
      res.json(mood);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mood" });
    }
  });

  const server = createServer(app);
  wss = new WebSocketServer({ 
    port: 5001,
    clientTracking: true,
    perMessageDeflate: false
  });
  return server;
}