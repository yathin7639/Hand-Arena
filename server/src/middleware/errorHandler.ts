import type { Request, Response, NextFunction } from "express";
import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";

export interface CustomError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = config.isProduction && statusCode === 500
    ? "Internal Server Error"
    : err.message || "An unexpected error occurred";

  logger.error("HTTP", `Error processing request ${req.method} ${req.originalUrl}: ${err.message}`, {
    statusCode,
    stack: config.isProduction ? undefined : err.stack
  });

  res.status(statusCode).json({
    ok: false,
    error: message
  });
}
