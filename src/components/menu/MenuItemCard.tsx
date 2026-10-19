import type { CSSProperties } from "react";

import type { CurrencyCode, MenuItem } from "@/types/menu";

import { ItemArt } from "./ItemArt";
import { PriceBadge } from "./PriceBadge";
import { getDictionary } from "@/i18n";

interface MenuItemCardProps {
  item: MenuItem;
  currency: CurrencyCode;
  locale: string;
  /** Entrance animation delay (ms) for the sheet's staggered reveal. */
  delay?: number;
}

export function MenuItemCard({ item, currency, locale, delay = 0 }: MenuItemCardProps) {
  const dict = getDictionary();
  const hasPromotion = item.promotion !== null;
  return (
    <article
      className={`item-card${hasPromotion ? " item-card--promotion" : ""}${item.isAvailable ? "" : " item-card--unavailable"}`}
      style={{ "--delay": `${delay}ms` } as CSSProperties}
      aria-label={!item.isAvailable ? `${item.name}, ${dict.menuItem.unavailable}` : undefined}
    >
      {hasPromotion ? (
        <span className="item-card__promotion">
          {item.isAvailable ? dict.menuItem.promotion : dict.menuItem.unavailable}
        </span>
      ) : null}
      <div className="item-card__art">
        <ItemArt item={item} className="item-card__art-img" sizes="(min-width: 42rem) 19rem, 92vw" />
        {!item.isAvailable ? (
          <div className="item-card__unavailable-overlay" aria-hidden="true">
            <span>{dict.menuItem.unavailable}</span>
          </div>
        ) : null}
      </div>
      <div className="item-card__body">
        <div className="item-card__row">
          <h3 className="item-card__name">{item.name}</h3>
          {item.promotion !== null && item.isAvailable ? (
            <span className="item-card__prices">
              <PriceBadge
                className="item-card__price item-card__price--old"
                price={item.price}
                currency={currency}
                locale={locale}
              />
              <PriceBadge className="item-card__price" price={item.promotion} currency={currency} locale={locale} />
            </span>
          ) : (
            <PriceBadge className="item-card__price" price={item.price} currency={currency} locale={locale} />
          )}
        </div>
        {!item.isAvailable ? <p className="item-card__availability">{dict.menuItem.unavailable}</p> : null}
        <p className="item-card__description">{item.description}</p>
      </div>
    </article>
  );
}
