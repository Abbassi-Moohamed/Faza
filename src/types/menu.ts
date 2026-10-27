export type CurrencyCode =
  "AUD" | "CAD" | "CHF" | "DKK" | "EUR" | "GBP" | "JPY" | "NOK" | "NZD" | "SEK" | "TND" | "USD";

export interface MenuMedia {
  imageId?: string;
  url: string;
  type: "image" | "video";
  mimeType?: string;
  durationMs?: number;
  alt?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  /** Decimal backend price (e.g. `2.5` TND) — stored and displayed as-is. */
  price: number;
  promotion: number | null;
  isAvailable: boolean;
  /** Remote image URL. Images are optional — a gradient placeholder is used when absent. */
  image?: string;
  /** Ordered gallery (cover first). Videos are muted, inline and short. */
  media?: MenuMedia[];
  /** Seed color used for the gradient placeholder and highlights. */
  accent?: string;
}


export interface MenuCategory {
  id: string;
  name: string;
  image?: string;
  /** Small glyph (emoji) used in navigation chips. */
  icon?: string;
  /** Accent color used across the category's visuals. */
  accent: string;
  /** Total items in the category, straight from the public coffee DTO. */
  itemCount: number;
  items: MenuItem[];
}
