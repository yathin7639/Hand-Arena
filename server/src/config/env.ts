import dotenv from "dotenv";

// Load .env file if available
dotenv.config();

export interface EnvironmentConfig {
  env: "development" | "production" | "test";
  isProduction: boolean;
  port: number;
  corsOrigins: string[];
  clientDist?: string;
  logLevel: "debug" | "info" | "warn" | "error";
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  payloadLimit: string;
}

const nodeEnv = (process.env.NODE_ENV || "development").toLowerCase() as EnvironmentConfig["env"];

const parseCorsOrigins = (raw?: string): string[] => {
  if (!raw) return [];
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const config: EnvironmentConfig = Object.freeze({
  env: nodeEnv,
  isProduction: nodeEnv === "production",
  port: Number(process.env.PORT) || 3000,
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  clientDist: process.env.CLIENT_DIST ? process.env.CLIENT_DIST.trim() : undefined,
  logLevel: (process.env.LOG_LEVEL?.toLowerCase() as EnvironmentConfig["logLevel"]) || (nodeEnv === "production" ? "info" : "debug"),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 300,
  payloadLimit: process.env.PAYLOAD_LIMIT || "1mb"
});
