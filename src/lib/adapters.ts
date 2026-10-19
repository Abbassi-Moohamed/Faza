import type { CategoryDto, ItemDto } from "@/types/backend";
import type { MenuCategory, MenuItem } from "@/types/menu";

/**
 * Adapters map backend DTOs onto the presentation types consumed by the menu
 * UI. They derive only visual/derived fields (accent, icon) that the backend
 * does not model — deterministically, so bubbles stay stable across renders
 * (same seed → same silhouette, matching the README's design promise).
 */

/** FNV-1a 32-bit string hash → unsigned seed. */
function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Warm palette drawn from the existing coffee design tokens. */
const ACCENT_PALETTE = [
  "#b45309",
  "#9a3412",
  "#0e7490",
  "#3f6212",
  "#be123c",
  "#713f12",
  "#4d7c0f",
  "#a16207",
  "#7c2d12",
  "#155e75",
  "#ea580c",
  "#166534",
  "#9d174d",
  "#57534e",
  "#c2541f",
  "#854d0e",
] as const;

/** Stable accent per category, derived from its unique backend id. */
export function categoryAccent(categoryId: string): string {
  return ACCENT_PALETTE[hashString(categoryId) % ACCENT_PALETTE.length];
}

/** Position-based accents keep adjacent category bubbles visually distinct. */
export function categoryAccentAt(index: number): string {
  return ACCENT_PALETTE[index % ACCENT_PALETTE.length];
}

const FALLBACK_ICONS = ["🌿", "🫘", "🥤", "🍩", "🧁", "🍪", "🍯", "🥜"] as const;

const ICON_BY_KEYWORD: ReadonlyArray<readonly [RegExp, string]> = [
  [/jus|juice|orange|citron|smoothie/i, "🧃"],
  [/caf[eé]|espresso|coffee|latte|cappuccino|americano|flat|mocha/i, "☕"],
  [/chocolat|chocolate|th[eé]|tea|matcha|chai|chaud|boissons/i, "🍵"],
  [/dessert|g[aâ]teau|cake|cheesecake|tiramisu|p[iî]sserie|bakery|croissant|cookie/i, "🍰"],
  [/pancake|breakfast|brunch|petit-d[eé]jeuner|omelette|toast|granola/i, "🥐"],
  [/fra[îi]che|iced|cold|frapp|glac[ée]/i, "🧊"],
  [/salade|sandwich|burger|plats?|main|food/i, "🥪"],
  [/fruit|berry/i, "🍓"],
];

/** Stable glyph per category: keyword match first, seeded fallback otherwise. */
export function categoryIcon(categoryId: string, categoryName: string): string {
  for (const [pattern, icon] of ICON_BY_KEYWORD) {
    if (pattern.test(categoryName)) {
      return icon;
    }
  }
  return FALLBACK_ICONS[hashString(categoryId) % FALLBACK_ICONS.length];
}

/**
 * Build the UI category shell for a backend category. Items are intentionally
 * NOT embedded here: they are fetched on demand from `/categories/:id/items`.
 * The backend id doubles as the anchor slug (hex matches the hash regex) so
 * deep links and bubble geometry stay stable and backend-scoped.
 */
export function toMenuCategory(category: CategoryDto): MenuCategory {
  return {
    id: category.id,
    name: category.name,
    image: category.image ?? undefined,
    accent: categoryAccent(category.id),
    icon: categoryIcon(category.id, category.name),
    itemCount: category.itemCount,
    items: [],
  };
}

export function toMenuItem(item: ItemDto): MenuItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? "",
    price: item.price,
    promotion: item.promotion ?? null,
    isAvailable: item.isAvailable ?? true,
    image: item.image ?? undefined,
  };
}
