"use client";

import { useEffect, useRef, useState } from "react";

import { getDictionary } from "@/i18n";
import { cartEventName, readCart, writeCart, type CartLine } from "@/lib/cart";
import { recordMenuItemViewOnce } from "@/lib/item-views";
import type { MenuItem } from "@/types/menu";
import type { FeaturedOfferDto } from "@/types/backend";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { OrderCenter } from "./OrderCenter";
import { siteConfig } from "@/config/site";

interface OrderExperienceProps {
  coffeeSlug: string;
  tableCount?: number | null;
  items: MenuItem[];
  /** Includes unavailable items so an existing cart can be validated. */
  cartItems?: MenuItem[];
  offers?: FeaturedOfferDto[];
}

export function OrderExperience({ coffeeSlug, tableCount, items, cartItems = items, offers }: OrderExperienceProps) {
  const d = getDictionary();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [announce, setAnnounce] = useState("");
  const [pulseId, setPulseId] = useState<string | null>(null);
  const announceTimer = useRef<number | null>(null);
  const pulseTimer = useRef<number | null>(null);

  useEffect(() => {
    const sync = () => setLines(readCart(coffeeSlug));
    sync();
    window.addEventListener(cartEventName(), sync);
    return () => window.removeEventListener(cartEventName(), sync);
  }, [coffeeSlug]);

  useEffect(
    () => () => {
      if (announceTimer.current !== null) window.clearTimeout(announceTimer.current);
      if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current);
    },
    [],
  );

  const quantityOf = (itemId: string) => lines.find((line) => line.item.id === itemId)?.quantity ?? 0;

  const persist = (next: CartLine[]) => {
    setLines(next);
    writeCart(coffeeSlug, next);
  };

  const add = (item: MenuItem) => {
    if (!item.isAvailable) return;
    const next = lines.some((line) => line.item.id === item.id)
      ? lines.map((line) => (line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line))
      : [...lines, { item, quantity: 1 }];
    persist(next);
    setAnnounce(d.order.itemAddedAnnounce(item.name));
    if (announceTimer.current !== null) window.clearTimeout(announceTimer.current);
    announceTimer.current = window.setTimeout(() => setAnnounce(""), 1500);
    setPulseId(item.id);
    if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setPulseId((current) => (current === item.id ? null : current)), 600);
  };

  const setQuantity = (item: MenuItem, quantity: number) => {
    persist(
      quantity <= 0
        ? lines.filter((line) => line.item.id !== item.id)
        : lines.map((line) => (line.item.id === item.id ? { ...line, quantity } : line)),
    );
  };

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      <div className="container order-menu-list">
        <ul className="sheet__list">
          {items.map((item, index) => {
            const quantity = quantityOf(item.id);
            return (
              <li key={item.id} className="sheet__item">
                <div className="order-item">
                  <MenuItemCard
                    item={item}
                    currency={siteConfig.currency}
                    locale={siteConfig.locale}
                    delay={index * 55}
                    onView={() => void recordMenuItemViewOnce(coffeeSlug, item.id).catch(() => undefined)}
                  />
                  {quantity > 0 ? (
                    <div
                      className={`qty-stepper${pulseId === item.id ? " qty-stepper--pulse" : ""}`}
                      aria-label={`${item.name} — quantité`}
                    >
                      <button
                        className="qty-stepper__btn"
                        type="button"
                        onClick={() => setQuantity(item, quantity - 1)}
                        aria-label={`${d.order.decrease} : ${item.name}`}
                      >
                        −
                      </button>
                      <span className="qty-stepper__value">{quantity}</span>
                      <button
                        className="qty-stepper__btn"
                        type="button"
                        disabled={!item.isAvailable}
                        onClick={() => setQuantity(item, quantity + 1)}
                        aria-label={`${d.order.increase} : ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button className="add-btn" type="button" disabled={!item.isAvailable} onClick={() => add(item)}>
                      {item.isAvailable ? d.order.addToCart : d.menuItem.unavailable}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <OrderCenter coffeeSlug={coffeeSlug} tableCount={tableCount} items={cartItems} offers={offers} />
    </>
  );
}
