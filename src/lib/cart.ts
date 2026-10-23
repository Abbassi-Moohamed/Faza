import type { FeaturedOfferDto } from "@/types/backend";
import type { MenuItem } from "@/types/menu";

export interface CartLine {
  item: Pick<MenuItem, "id" | "name" | "price" | "promotion" | "image">;
  quantity: number;
  /** Missing (legacy carts) means a plain menu item. */
  kind?: "item" | "offer";
}

export interface OrderItemsPayload {
  items: Array<{ itemId: string; quantity: number }>;
  offers: Array<{ offerId: string; quantity: number }>;
}

const eventName = "faza-cart-change";

export function isOfferLine(line: CartLine) {
  return line.kind === "offer";
}

export function cartStorageKey(coffeeSlug: string) {
  return `faza:cart:${coffeeSlug}`;
}

export function readCart(coffeeSlug: string): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(cartStorageKey(coffeeSlug)) ?? "[]");
    return Array.isArray(value)
      ? value.filter((line) => line?.item?.id && Number.isInteger(line.quantity) && line.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

export function writeCart(coffeeSlug: string, lines: CartLine[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(cartStorageKey(coffeeSlug), JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent(eventName));
}

export function cartLinePrice(line: CartLine) {
  return line.item.promotion ?? line.item.price;
}

export function cartTotal(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + cartLinePrice(line) * line.quantity, 0);
}

export function cartCount(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** Splits the cart into the two id-based payloads the order API expects. */
export function cartSplit(lines: CartLine[]): OrderItemsPayload {
  const payload: OrderItemsPayload = { items: [], offers: [] };
  for (const line of lines) {
    if (isOfferLine(line)) payload.offers.push({ offerId: line.item.id, quantity: line.quantity });
    else payload.items.push({ itemId: line.item.id, quantity: line.quantity });
  }
  return payload;
}

export function cartEventName() {
  return eventName;
}

/** The offer's own photo, falling back to the first composed item's photo. */
export function offerImage(offer: Pick<FeaturedOfferDto, "image" | "lines">): string | undefined {
  return offer.image ?? offer.lines.find((line) => line.image)?.image ?? undefined;
}

/** Cart line for a purchasable offer, in the shape the ordering sheet expects. */
export function offerCartLine(offer: FeaturedOfferDto, quantity: number): CartLine {
  return {
    kind: "offer",
    item: {
      id: offer.id,
      name: offer.name,
      price: offer.price,
      promotion: null,
      image: offerImage(offer),
    },
    quantity,
  };
}

/**
 * Adds, updates or removes an offer line and returns the next cart. Pure:
 * the caller decides when to persist (and therefore when to announce) it.
 */
export function setOfferQuantity(lines: CartLine[], offer: FeaturedOfferDto, quantity: number): CartLine[] {
  if (quantity <= 0) {
    return lines.filter((line) => !(isOfferLine(line) && line.item.id === offer.id));
  }
  if (lines.some((line) => isOfferLine(line) && line.item.id === offer.id)) {
    return lines.map((line) => (isOfferLine(line) && line.item.id === offer.id ? { ...line, quantity } : line));
  }
  return [...lines, offerCartLine(offer, quantity)];
}
