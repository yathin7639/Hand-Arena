import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { config } from "../config/env.js";
import { errorHandler } from "../middleware/errorHandler.js";
import { apiRateLimiter } from "../middleware/rateLimiter.js";
import { apiRouter } from "../routes/index.js";
import { isOriginAllowed } from "../utils/cors.js";

export function createApp(): express.Application {
  const app = express();
  app.disable("x-powered-by");

  // Production security headers
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );

  // Gzip HTTP compression
  app.use(compression());

  // Dynamic CORS configuration
  app.use(
    cors((req, callback) => {
      const origin = req.header("Origin");
      const host = req.header("Host");
      if (isOriginAllowed(origin, host)) {
        callback(null, { origin: true, credentials: true });
      } else {
        callback(null, { origin: false });
      }
    })
  );

  // Rate Limiter & JSON payload body limit
  app.use(apiRateLimiter);
  app.use(express.json({ limit: config.payloadLimit }));

  // REST API Routes (/health, /healthz, /readyz)
  app.use(apiRouter);

  // Static Frontend Serving (if CLIENT_DIST configured)
  if (config.clientDist) {
    app.use(express.static(config.clientDist));
    app.get("*", (_req, res) => res.sendFile(path.join(config.clientDist!, "index.html")));
  }

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
