import type { ClientSession } from "@hand-cricket/shared";

const key = "hand-cricket-session";

const randomId = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

export function loadSession(): ClientSession {
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      return JSON.parse(raw) as ClientSession;
    } catch {
      localStorage.removeItem(key);
    }
  }
  const session = { playerId: randomId(), name: `Player ${Math.floor(Math.random() * 90) + 10}` };
  saveSession(session);
  return session;
}

export function saveSession(session: ClientSession): void {
  localStorage.setItem(key, JSON.stringify(session));
}
