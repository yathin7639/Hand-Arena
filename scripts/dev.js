import { spawn } from "node:child_process";

console.log("[Dev Launcher] Starting development server and client concurrently...");

const server = spawn("npm", ["run", "dev:server"], { stdio: "inherit", shell: true });
const client = spawn("npm", ["run", "dev:client"], { stdio: "inherit", shell: true });

const killAll = () => {
  try {
    server.kill();
  } catch {}
  try {
    client.kill();
  } catch {}
};

server.on("exit", (code) => {
  killAll();
  process.exit(code ?? 0);
});

client.on("exit", (code) => {
  killAll();
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  killAll();
  process.exit(0);
});

process.on("SIGTERM", () => {
  killAll();
  process.exit(0);
});
