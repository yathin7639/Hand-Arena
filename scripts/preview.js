import { spawn } from "node:child_process";
import path from "node:path";

// Set production environment variables
process.env.NODE_ENV = "production";
process.env.CLIENT_DIST = path.resolve("client/dist");

console.log("[Preview Launcher] Starting HandArena in Production-like Mode...");
console.log(`[Preview Launcher] Serving static frontend files from: ${process.env.CLIENT_DIST}`);

// Build client and shared, then start server
const buildProcess = spawn("npm", ["run", "build"], { stdio: "inherit", shell: true });

buildProcess.on("exit", (code) => {
  if (code !== 0) {
    console.error(`[Preview Launcher Error] Build failed with exit code ${code}`);
    process.exit(code ?? 1);
  }

  console.log("[Preview Launcher] Build successful. Launching Express server...");
  const serverProcess = spawn("npm", ["run", "start", "-w", "server"], { stdio: "inherit", shell: true });

  serverProcess.on("exit", (srvCode) => {
    process.exit(srvCode ?? 0);
  });
});
