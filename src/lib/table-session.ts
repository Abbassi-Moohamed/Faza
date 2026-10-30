export interface ActiveTableSession {
  token: string;
  tableNumber: number;
  lastUpdatedAt: string;
}

const sessionEventName = "faza-table-session-change";

function announceSessionChange(coffeeSlug: string, status: "active" | "closed") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(sessionEventName, { detail: { coffeeSlug, status } }));
}

export function tableSessionEventName() {
  return sessionEventName;
}

export function tableSessionStorageKey(coffeeSlug: string) {
  return `faza:table-session:${coffeeSlug}`;
}

export function readTableSession(coffeeSlug: string): ActiveTableSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(tableSessionStorageKey(coffeeSlug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActiveTableSession>;
    const tableNumberValue = parsed.tableNumber;
    const normalizedTableNumber = typeof tableNumberValue === "number" ? tableNumberValue : Number(tableNumberValue);

    if (!parsed.token || !Number.isInteger(normalizedTableNumber) || normalizedTableNumber < 1) {
      return null;
    }

    return {
      token: parsed.token,
      tableNumber: normalizedTableNumber,
      lastUpdatedAt: typeof parsed.lastUpdatedAt === "string" ? parsed.lastUpdatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeTableSession(coffeeSlug: string, session: ActiveTableSession) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(tableSessionStorageKey(coffeeSlug), JSON.stringify(session));
    announceSessionChange(coffeeSlug, "active");
  } catch {
    // Local storage may be unavailable; the UI should recover gracefully.
  }
}

export function clearTableSession(coffeeSlug: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(tableSessionStorageKey(coffeeSlug));
    announceSessionChange(coffeeSlug, "closed");
  } catch {
    // Ignore browser storage failures.
  }
}
