const ordersEventName = "faza-session-orders-change";

export function sessionOrdersEventName() {
  return ordersEventName;
}

export function notifySessionOrdersChanged(coffeeSlug: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ordersEventName, { detail: { coffeeSlug } }));
}
