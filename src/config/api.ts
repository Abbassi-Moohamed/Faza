/**
 * API base URL, context-aware because the backend is reached differently on
 * the client and the server:
 *
 *  - Browser: requests go directly to the public Express origin so multipart
 *    uploads are not constrained by a Next/Vercel proxy body limit.
 *  - Server (SSR/ISR): `fetch` needs an absolute origin — `BACKEND_API_URL`
 *    (falls back to the local dev backend).
 *
 * LAN/QR-testing override: when the dev config points at localhost but the
 * page itself is served from another host (e.g. a phone scanning a QR code
 * at `http://192.168.1.146:3000`), localhost would resolve to the visitor's
 * own device. In that case the API origin follows the page's hostname
 * instead — the backend binds 0.0.0.0, so it is reachable on the same
 * host, port 4000.
 */
function resolveBrowserBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:4000";
  let configuredHost: string;
  try {
    configuredHost = new URL(configured).hostname;
  } catch {
    return configured; // invalid URL — let fetch surface the original value
  }
  const isLoopback = (host: string) => host === "localhost" || host === "127.0.0.1";
  const pageHost = window.location.hostname;
  if (isLoopback(configuredHost) && !isLoopback(pageHost)) {
    return `http://${pageHost}:4000`;
  }
  return configured;
}

export const apiConfig = {
  baseUrl:
    typeof window === "undefined" ? (process.env.BACKEND_API_URL ?? "http://localhost:4000") : resolveBrowserBaseUrl(),
} as const;
