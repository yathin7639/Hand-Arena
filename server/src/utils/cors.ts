const allowedOriginsRegex = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

export function isOriginAllowed(origin: string | undefined, hostHeader?: string | undefined): boolean {
  if (!origin) return true; // Allow non-browser requests (e.g. server-to-server, curl, health checks)

  // Allow same-origin (where Origin host matches request Host header)
  if (hostHeader) {
    const host = hostHeader.split(":")[0];
    const originHost = origin.replace(/^https?:\/\//, "").split(":")[0];
    if (host === originHost) {
      return true;
    }
  }

  // Allow localhost & local loopbacks on any port
  if (allowedOriginsRegex.some((regex) => regex.test(origin))) {
    return true;
  }

  // Allow Cloudflare Tunnel domains
  if (origin.endsWith(".trycloudflare.com")) {
    return true;
  }

  // Allow domains configured in CORS_ORIGIN env var
  const envOrigins = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean) || [];
  if (envOrigins.includes(origin)) {
    return true;
  }

  return false;
}
