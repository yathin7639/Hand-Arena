import { rateLimit } from "express-rate-limit";
import { config } from "../config/env.js";

export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: "Too many requests from this IP, please try again later."
  }
});
