import { createServer } from "node:http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@hand-cricket/shared";
import { SocketController } from "./controllers/SocketController.js";
import { GameManager } from "./game/GameManager.js";
import { createApp } from "./http/createApp.js";
import { isOriginAllowed } from "./utils/cors.js";

const port = Number(process.env.PORT ?? 3000);
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

new SocketController(io, new GameManager()).register();

const detectEnvironment = () => {
  if (process.env.NODE_ENV === "production") {
    if (process.env.CORS_ORIGIN?.includes("trycloudflare.com")) {
      return "Cloudflare Tunnel (Production)";
    }
    return "Production / VPS";
  }
  return "Development";
};

httpServer.listen(port, "0.0.0.0", () => {
  const env = detectEnvironment();
  console.log(`[Server Started] Environment: ${env}`);
  console.log(`[Server Started] Hand Cricket server listening on 0.0.0.0:${port}`);
});
