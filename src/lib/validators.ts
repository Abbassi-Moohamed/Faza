/** True when `value` is an absolute http(s) URL (matches the backend zod rules). */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** True when `value` is a valid decimal price (finite, >= 0). */
export function isValidPrice(value: string): boolean {
  if (value.trim().length === 0) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}
