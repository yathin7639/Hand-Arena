const DEFAULT_BACKEND_URL = "https://beam-sentence-pts-psychology.trycloudflare.com";

const rawApiUrl = import.meta.env.VITE_API_URL;
const rawSocketUrl = import.meta.env.VITE_SOCKET_URL;

export const API_URL =
  typeof rawApiUrl === "string" && rawApiUrl.trim().length > 0
    ? rawApiUrl.trim()
    : DEFAULT_BACKEND_URL;

export const SOCKET_URL =
  typeof rawSocketUrl === "string" && rawSocketUrl.trim().length > 0
    ? rawSocketUrl.trim()
    : DEFAULT_BACKEND_URL;
