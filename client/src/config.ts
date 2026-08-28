const rawApiUrl = import.meta.env.VITE_API_URL;
const rawSocketUrl = import.meta.env.VITE_SOCKET_URL;

export const API_URL =
  typeof rawApiUrl === "string" && rawApiUrl.trim().length > 0
    ? rawApiUrl.trim()
    : "";

export const SOCKET_URL =
  typeof rawSocketUrl === "string" && rawSocketUrl.trim().length > 0
    ? rawSocketUrl.trim()
    : undefined;

