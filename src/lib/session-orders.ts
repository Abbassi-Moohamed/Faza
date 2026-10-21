/**
 * Local ledger of the orders placed from this browser.
 *
 * The session token is the server-side source of truth, but a session can be
 * closed (paid and settled) while the visitor keeps browsing. Keeping the
 * orders locally lets the history page still show every order the visitor
 * placed, even after the session is gone.
 *
 * Each entry carries its table number so the fallback never mixes the orders
 * of two different tables in the same history.
 */

export interface SessionOrderRef {
  id: string;
  tableNumber: number;
}

const storageKey = (coffeeSlug: string) => `faza:session-orders:${coffeeSlug}`;

/** Oldest orders are dropped first — a table rarely holds more than this. */
const MAX_ORDERS = 50;

const isRef = (value: unknown): value is SessionOrderRef => {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<SessionOrderRef>;
  return typeof entry.id === "string" && entry.id.length > 0 && Number.isInteger(entry.tableNumber);
};

export function readSessionOrders(coffeeSlug: string): SessionOrderRef[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(coffeeSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRef).slice(0, MAX_ORDERS);
  } catch {
    return [];
  }
}

export function rememberSessionOrder(coffeeSlug: string, orderId: string, tableNumber: number): void {
  if (typeof window === "undefined" || !orderId) return;
  try {
    const current = readSessionOrders(coffeeSlug).filter((entry) => entry.id !== orderId);
    const next: SessionOrderRef[] = [{ id: orderId, tableNumber }, ...current].slice(0, MAX_ORDERS);
    window.localStorage.setItem(storageKey(coffeeSlug), JSON.stringify(next));
  } catch {
    // Local storage may be unavailable; the session token still carries the
    // history server-side.
  }
}
