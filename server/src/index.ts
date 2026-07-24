import { createServer } from "node:http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@hand-cricket/shared";
import { config } from "./config/env.js";
import { SocketController } from "./controllers/SocketController.js";
import { GameManager } from "./game/GameManager.js";
import { createApp } from "./http/createApp.js";
import { isOriginAllowed } from "./utils/cors.js";
import { logger } from "./utils/logger.js";

const app = createApp();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin, undefined)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  },
  allowRequest: (req, callback) => {
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (isOriginAllowed(origin, host)) {
      callback(null, true);
    } else {
      callback("Origin not allowed by single-origin rules", false);
    }
  }
});

const gameManager = new GameManager();
new SocketController(io, gameManager).register();

httpServer.listen(config.port, "0.0.0.0", () => {
  logger.info("Server", `Environment: ${config.env}`);
  logger.info("Server", `Hand Cricket production backend listening on 0.0.0.0:${config.port}`);
});

// Graceful Shutdown Handler
const gracefulShutdown = (signal: string) => {
  logger.info("Server", `Received ${signal}. Shutting down gracefully...`);
  
  // Save current room state
  gameManager.saveState();

  // Close socket server and HTTP server
  io.close(() => {
    logger.info("Server", "Socket.IO connections closed.");
    httpServer.close(() => {
      logger.info("Server", "HTTP server closed.");
      process.exit(0);
    });
  });

  // Force close after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error("Server", "Forcing shutdown after timeout.");
    process.exit(1);
  }, 10_000);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("uncaughtException", (error) => {
  logger.error("Server", "Uncaught Exception", error);
});
process.on("unhandledRejection", (reason) => {
  logger.error("Server", "Unhandled Rejection", reason);
});
