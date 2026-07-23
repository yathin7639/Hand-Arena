import cors from "cors";
import express from "express";
import path from "node:path";
import { isOriginAllowed } from "../utils/cors.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  
  app.use(cors((req, callback) => {
    const origin = req.header("Origin");
    const host = req.header("Host");
    if (isOriginAllowed(origin, host)) {
      callback(null, { origin: true, credentials: true });
    } else {
      callback(null, { origin: false });
    }
  }));

  app.use(express.json());
  app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));
  app.get("/readyz", (_req, res) => res.status(200).json({ ok: true }));
  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

  // API 404 fallback
  app.all("/api/*", (_req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  const clientDist = process.env.CLIENT_DIST;
  if (clientDist) {
    app.use(express.static(clientDist));
    app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
  }
  return app;
}
