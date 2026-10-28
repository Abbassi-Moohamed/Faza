import type { CSSProperties } from "react";
import { useState } from "react";

import type { CurrencyCode, MenuItem } from "@/types/menu";

import { ItemMediaCarousel } from "./ItemMediaCarousel";
import { PriceBadge } from "./PriceBadge";
import { getDictionary } from "@/i18n";

interface MenuItemCardProps {
  item: MenuItem;
  currency: CurrencyCode;
  locale: string;
  /** Entrance animation delay (ms) for the sheet's staggered reveal. */
  delay?: number;
  onView?: () => void;
}

export function MenuItemCard({ item, currency, locale, delay = 0, onView }: MenuItemCardProps) {
  const dict = getDictionary();
  const [expanded, setExpanded] = useState(false);
  const hasPromotion = item.promotion !== null;
  const toggleDetails = () => {
    const shouldExpand = !expanded;
    setExpanded(shouldExpand);
    if (shouldExpand && item.isAvailable) onView?.();
  };

  return (
    <article
      className={`item-card${hasPromotion ? " item-card--promotion" : ""}${item.isAvailable ? "" : " item-card--unavailable"}${expanded ? " item-card--expanded" : ""}`}
      style={{ "--delay": `${delay}ms` } as CSSProperties}
      aria-label={!item.isAvailable ? `${item.name}, ${dict.menuItem.unavailable}` : undefined}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
        toggleDetails();
      }}
    >
      {hasPromotion ? (
        <span className="item-card__promotion">
          <span className="item-card__promotion-shape">
            {item.isAvailable ? dict.menuItem.promotion : dict.menuItem.unavailable}
          </span>
        </span>
      ) : null}
      <div className="item-card__art">
        <ItemMediaCarousel item={item} sizes="(min-width: 42rem) 19rem, 92vw" />
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
        <p className={`item-card__description${expanded ? " item-card__description--expanded" : ""}`}>
          {item.description}
        </p>
        <button
          type="button"
          className="item-card__details-toggle"
          aria-expanded={expanded}
          aria-label={`${expanded ? dict.menuItem.hideDetails : dict.menuItem.viewDetails} : ${item.name}`}
          onClick={toggleDetails}
        >
          {expanded ? dict.menuItem.hideDetails : dict.menuItem.viewDetails}
          <span aria-hidden="true">{expanded ? "−" : "+"}</span>
        </button>
      </div>
    </article>
  );
}
