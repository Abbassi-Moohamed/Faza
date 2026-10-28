import { recordMenuItemView } from "@/lib/api";

const pendingViews = new Set<string>();
const recordedViews = new Set<string>();

/**
 * Count a detail opening once per item in the current browser tab session.
 * The server stores only aggregate daily counts; no visitor identifier leaves
 * the browser.
 */
export async function recordMenuItemViewOnce(coffeeSlug: string, itemId: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const key = `faza:item-view:${coffeeSlug}:${itemId}`;
  if (pendingViews.has(key) || recordedViews.has(key)) return false;

  try {
    if (window.sessionStorage.getItem(key)) {
      recordedViews.add(key);
      return false;
    }
  } catch {
    // Keep the in-memory guard when browser storage is unavailable.
  }

  pendingViews.add(key);
  try {
    await recordMenuItemView(coffeeSlug, itemId);
    recordedViews.add(key);
    try {
      window.sessionStorage.setItem(key, "1");
    } catch {
      // The in-memory guard still prevents duplicate requests for this page.
    }
    return true;
  } finally {
    pendingViews.delete(key);
  }
}
