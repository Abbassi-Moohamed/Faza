import type { MenuItem } from "@/types/menu";

export interface CartLine {
  item: Pick<MenuItem, "id" | "name" | "price" | "promotion" | "image">;
  quantity: number;
}

const eventName = "faza-cart-change";

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

export function cartEventName() {
  return eventName;
}
