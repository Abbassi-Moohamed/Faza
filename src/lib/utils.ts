/** Build a semantic class-name string from static and conditional class names. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * URL-safe slug for a display name (category names etc.): lowercase, accents
 * flattened via NFD, separator runs collapsed into a single dash. The backend
 * is the source of truth — category pages slugify names so the route and the
 * data never drift apart.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

/** Canonical public route for a coffee's category items page. */
export function categoryHref(coffeeSlug: string, categoryName: string): string {
  return `/faza/${coffeeSlug}/${slugify(categoryName)}`;
}
