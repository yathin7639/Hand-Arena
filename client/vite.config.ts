import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const target = process.env.VITE_SOCKET_URL || process.env.VITE_API_URL || process.env.VITE_PROXY_TARGET || "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/socket.io": {
        target,
        ws: true
      },
      "/api": {
        target
      }
    }
  }
});
