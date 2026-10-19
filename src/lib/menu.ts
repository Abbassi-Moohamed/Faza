import type { CurrencyCode } from "@/types/menu";

/**
 * Format a decimal backend price (e.g. `2.5` TND) as a human-readable string.
 * Uses `Intl.NumberFormat` with the menu locale and currency so formatting
 * stays correct if the menu is served in another region. Currencies such as
 * the Tunisian dinar conventionally use three fraction digits.
 */
export function formatPrice(value: number, currency: CurrencyCode, locale: string): string {
  const fractionDigits = currency === "TND" ? 3 : 2;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
