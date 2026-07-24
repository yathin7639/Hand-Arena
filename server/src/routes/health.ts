import { Router } from "express";
import { config } from "../config/env.js";

export const healthRouter = Router();

const VERSION = "1.0.0";

healthRouter.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: Number(process.uptime().toFixed(2)),
    version: VERSION,
    environment: config.env
  });
});

healthRouter.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

healthRouter.get("/readyz", (_req, res) => {
  res.status(200).json({ ok: true });
});
