import type { AdminAuthDto, AdminRole } from "@/types/backend";

/**
 * Lightweight admin session storage.
 *
 * The backend's only auth/session mechanism is a short-lived bearer token
 * (HS256 JWT, default 12h). The token itself is the session: nothing that
 * just says `isAuthenticated = true` is ever stored. It lives in
 * sessionStorage rather than localStorage so it dies with the browser tab —
 * a smaller exposure surface for the credential while still keeping the
 * backoffice alive across client-side navigations.
 */
export interface AdminSession {
  token: string;
  role: AdminRole;
  /** Present only for COFFEE_ADMIN sessions. */
  coffeeId?: string;
  expiresIn: string;
}

const STORAGE_KEY = "faza.admin.session";

export function readSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AdminSession>;
    if (typeof parsed.token !== "string" || parsed.token.length === 0) return null;
    if (parsed.role !== "APP_ADMIN" && parsed.role !== "COFFEE_ADMIN") return null;
    return {
      token: parsed.token,
      role: parsed.role,
      coffeeId: typeof parsed.coffeeId === "string" ? parsed.coffeeId : undefined,
      expiresIn: typeof parsed.expiresIn === "string" ? parsed.expiresIn : "12h",
    };
  } catch {
    return null;
  }
}

export function writeSession(session: AdminAuthDto): AdminSession {
  const stored: AdminSession = {
    token: session.token,
    role: session.role,
    coffeeId: session.coffeeId,
    expiresIn: session.expiresIn,
  };
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Storage unavailable (private mode…) — keep the in-memory value only.
    }
  }
  return stored;
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clear.
    }
  }
}
