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

/** Build a unique, URL-safe coffee slug, appending `-2`, `-3`, ... on conflict. */
export function uniqueSlug(input: string, reserved: Iterable<string> = []): string {
  const taken = new Set(Array.from(reserved, (slug) => slug.toLowerCase()));
  const base = slugify(input).slice(0, 80).replace(/-+$/g, "") || "coffee";
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (true) {
    const tail = `-${suffix}`;
    const candidate = `${base.slice(0, 80 - tail.length).replace(/-+$/g, "")}${tail}`;
    if (!taken.has(candidate)) return candidate;
    suffix += 1;
  }
}

/** Canonical public route for a coffee's category items page. */
export function categoryHref(coffeeSlug: string, categoryName: string): string {
  return `/faza/${coffeeSlug}/${slugify(categoryName)}`;
}
