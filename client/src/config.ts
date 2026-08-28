const rawApiUrl = import.meta.env.VITE_API_URL;
const rawSocketUrl = import.meta.env.VITE_SOCKET_URL;

const ACTIVE_TUNNEL_URL = "https://ide-variables-parliament-oils.trycloudflare.com";

const getBackendUrl = (raw: string | undefined): string | undefined => {
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  if (typeof window !== "undefined" && window.location) {
    const { hostname } = window.location;
    if (hostname.endsWith(".workers.dev") || hostname.endsWith(".pages.dev")) {
      return ACTIVE_TUNNEL_URL;
    }
  }
  return undefined;
};

export const API_URL = getBackendUrl(rawApiUrl) || "";
export const SOCKET_URL = getBackendUrl(rawSocketUrl);


