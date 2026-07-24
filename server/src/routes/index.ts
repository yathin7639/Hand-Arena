import { Router } from "express";
import { healthRouter } from "./health.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);

// API 404 handler fallback
apiRouter.all("*", (_req, res) => {
  res.status(404).json({ ok: false, error: "API route not found" });
});
