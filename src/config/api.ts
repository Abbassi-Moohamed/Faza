/**
 * API base URL, context-aware because the backend is reached differently on
 * the client and the server:
 *
 *  - Browser: requests go directly to the public Express origin so multipart
 *    uploads are not constrained by a Next/Vercel proxy body limit.
 *  - Server (SSR/ISR): `fetch` needs an absolute origin — `BACKEND_API_URL`
 *    (falls back to the local dev backend).
 */
export const apiConfig = {
  baseUrl:
    typeof window === "undefined"
      ? (process.env.BACKEND_API_URL ?? "http://localhost:4000")
      : (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:4000"),
} as const;
