import { formatPrice } from "@/lib/menu";
import { cn } from "@/lib/utils";
import type { CurrencyCode } from "@/types/menu";

interface PriceBadgeProps {
  price: number;
  currency: CurrencyCode;
  locale: string;
  className?: string;
}

export function PriceBadge({ price, currency, locale, className }: PriceBadgeProps) {
  return <span className={cn("menu-card__price", className)}>{formatPrice(price, currency, locale)}</span>;
}
