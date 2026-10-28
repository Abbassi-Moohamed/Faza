import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MenuItem } from "@/types/menu";
import { getDictionary } from "@/i18n";

import { MenuItemCard } from "./MenuItemCard";

vi.mock("./ItemMediaCarousel", () => ({
  ItemMediaCarousel: () => (
    <div>
      <button type="button" className="item-media__nav--next">
        Next
      </button>
    </div>
  ),
}));

vi.mock("./PriceBadge", () => ({
  PriceBadge: ({ price }: { price: number }) => <span>{price}</span>,
}));

const item: MenuItem = {
  id: "coffee-1",
  name: "Café crème",
  description: "Espresso, lait chaud et une longue description à découvrir.",
  price: 4.5,
  promotion: null,
  isAvailable: true,
};

describe("MenuItemCard", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("expands inline from the card or detail control, preserves media controls, and reports openings", () => {
    const onView = vi.fn();
    act(() => {
      root.render(<MenuItemCard item={item} currency="TND" locale="fr-TN" onView={onView} />);
    });

    const article = container.querySelector("article")!;
    const description = container.querySelector(".item-card__description")!;
    expect(description.classList.contains("item-card__description--expanded")).toBe(false);
    act(() => container.querySelector<HTMLElement>(".item-card__art")!.click());

    expect(article.classList.contains("item-card--expanded")).toBe(true);
    expect(description.classList.contains("item-card__description--expanded")).toBe(true);
    expect(description.textContent).toBe(item.description);
    expect(onView).toHaveBeenCalledTimes(1);

    const carouselButton = container.querySelector<HTMLButtonElement>(".item-media__nav--next")!;
    act(() => carouselButton.click());
    expect(article.classList.contains("item-card--expanded")).toBe(true);
    expect(onView).toHaveBeenCalledTimes(1);

    const detailsButton = container.querySelector<HTMLButtonElement>(".item-card__details-toggle")!;
    expect(detailsButton.getAttribute("aria-expanded")).toBe("true");
    expect(detailsButton.getAttribute("aria-label")).toContain(item.name);
    expect(detailsButton.textContent).toContain(getDictionary().menuItem.hideDetails);
    act(() => detailsButton.click());
    expect(article.classList.contains("item-card--expanded")).toBe(false);
    expect(onView).toHaveBeenCalledTimes(1);
  });

  it("does not report views for an unavailable item", () => {
    const onView = vi.fn();
    const unavailableItem = { ...item, isAvailable: false };
    act(() => {
      root.render(<MenuItemCard item={unavailableItem} currency="TND" locale="fr-TN" onView={onView} />);
    });

    act(() => container.querySelector("h3")!.click());

    expect(container.querySelector("article")?.classList.contains("item-card--expanded")).toBe(true);
    expect(onView).not.toHaveBeenCalled();
  });
});
