import { config } from "../config/env.js";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_WEIGHTS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

class Logger {
  private currentWeight: number;

  constructor() {
    this.currentWeight = LOG_LEVEL_WEIGHTS[config.logLevel] ?? LOG_LEVEL_WEIGHTS.info;
  }

  private formatMessage(level: LogLevel, tag: string, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    let formatted = `[${timestamp}] [${level.toUpperCase()}] [${tag}] ${message}`;
    if (meta !== undefined) {
      if (meta instanceof Error) {
        formatted += ` | Stack: ${meta.stack ?? meta.message}`;
      } else if (typeof meta === "object") {
        try {
          formatted += ` | ${JSON.stringify(meta)}`;
        } catch {
          formatted += ` | [Object]`;
        }
      } else {
        formatted += ` | ${String(meta)}`;
      }
    }
    return formatted;
  }

  debug(tag: string, message: string, meta?: unknown): void {
    if (this.currentWeight <= LOG_LEVEL_WEIGHTS.debug) {
      console.debug(this.formatMessage("debug", tag, message, meta));
    }
  }

  info(tag: string, message: string, meta?: unknown): void {
    if (this.currentWeight <= LOG_LEVEL_WEIGHTS.info) {
      console.info(this.formatMessage("info", tag, message, meta));
    }
  }

  warn(tag: string, message: string, meta?: unknown): void {
    if (this.currentWeight <= LOG_LEVEL_WEIGHTS.warn) {
      console.warn(this.formatMessage("warn", tag, message, meta));
    }
  }

  error(tag: string, message: string, meta?: unknown): void {
    if (this.currentWeight <= LOG_LEVEL_WEIGHTS.error) {
      console.error(this.formatMessage("error", tag, message, meta));
    }
  }
}

export const logger = new Logger();
