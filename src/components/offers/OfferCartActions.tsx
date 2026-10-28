"use client";

import { useEffect, useState } from "react";

import { getDictionary } from "@/i18n";
import { cartEventName, readCart, setOfferQuantity, writeCart, type CartLine } from "@/lib/cart";
import type { FeaturedOfferDto } from "@/types/backend";

interface OfferCartActionsProps {
  coffeeSlug: string;
  offer: FeaturedOfferDto;
  compact?: boolean;
}

/**
 * Add-to-cart controls of one offer. The cart lives in localStorage and is
 * shared across menu and offer pages, so this component subscribes to the
 * cart event instead of keeping a second source of truth.
 */
export function OfferCartActions({ coffeeSlug, offer, compact = false }: OfferCartActionsProps) {
  const d = getDictionary();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    const sync = () => setLines(readCart(coffeeSlug));
    sync();
    window.addEventListener(cartEventName(), sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(cartEventName(), sync);
      window.removeEventListener("storage", sync);
    };
  }, [coffeeSlug]);

  const quantity = lines.find((line) => line.kind === "offer" && line.item.id === offer.id)?.quantity ?? 0;
  const soldOut = offer.stock <= 0;

  const change = (next: number) => {
    const clamped = Math.max(0, Math.min(next, offer.stock));
    const nextLines = setOfferQuantity(lines, offer, clamped);
    setLines(nextLines);
    writeCart(coffeeSlug, nextLines);
    if (clamped > 0) setAnnounce(d.offer.inCart(clamped));
  };

  return (
    <div className={`offer-actions${compact ? " offer-actions--compact" : ""}`}>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      {soldOut ? (
        <p className="offer-actions__soldout">{d.offer.soldOut}</p>
      ) : quantity > 0 ? (
        <>
          <div className="offer-actions__stepper">
            <button
              type="button"
              className="offer-actions__stepper-btn"
              onClick={() => change(quantity - 1)}
              aria-label={`${d.order.decrease} : ${offer.name}`}
            >
              -
            </button>
            <span className="offer-actions__stepper-value" aria-hidden="true">
              {quantity}
            </span>
            <button
              type="button"
              className="offer-actions__stepper-btn"
              disabled={quantity >= offer.stock}
              onClick={() => change(quantity + 1)}
              aria-label={`${d.order.increase} : ${offer.name}`}
            >
              +
            </button>
          </div>
          <p className="offer-actions__note">{d.offer.inCart(quantity)}</p>
        </>
      ) : (
        <button type="button" className="add-btn offer-actions__add" onClick={() => change(1)}>
          {d.offer.addToCart}
        </button>
      )}
      {!soldOut && offer.stock <= 5 ? <p className="offer-actions__stock">{d.offer.stockLeft(offer.stock)}</p> : null}
    </div>
  );
}
