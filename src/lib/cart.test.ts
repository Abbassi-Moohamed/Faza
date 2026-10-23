import { describe, expect, it } from "vitest";

import {
  cartCount,
  cartLinePrice,
  cartSplit,
  cartTotal,
  isOfferLine,
  offerImage,
  setOfferQuantity,
  type CartLine,
} from "@/lib/cart";
import type { FeaturedOfferDto } from "@/types/backend";

const itemLine: CartLine = {
  item: { id: "item-1", name: "Espresso", price: 2, promotion: null, image: undefined },
  quantity: 2,
};

const offerLine: CartLine = {
  kind: "offer",
  item: { id: "offer-1", name: "Formule du jour", price: 6.5, promotion: null, image: undefined },
  quantity: 1,
};

const offer: FeaturedOfferDto = {
  id: "offer-1",
  name: "Formule du jour",
  description: null,
  price: 6.5,
  image: null,
  originalPrice: 8,
  savings: 1.5,
  stock: 5,
  startAt: null,
  endAt: null,
  status: "ACTIVE",
  lines: [
    { itemId: "item-1", name: "Espresso", image: null, quantity: 1, unitPrice: 2 },
    { itemId: "item-2", name: "Croissant", image: "https://cdn.test/croissant.jpg", quantity: 1, unitPrice: 6 },
  ],
};

describe("cart", () => {
  it("treats a legacy line without kind as a menu item", () => {
    expect(isOfferLine(itemLine)).toBe(false);
    expect(cartSplit([itemLine])).toEqual({ items: [{ itemId: "item-1", quantity: 2 }], offers: [] });
  });

  it("routes offer lines to the offers payload", () => {
    expect(isOfferLine(offerLine)).toBe(true);
    expect(cartSplit([itemLine, offerLine])).toEqual({
      items: [{ itemId: "item-1", quantity: 2 }],
      offers: [{ offerId: "offer-1", quantity: 1 }],
    });
  });

  it("prices and counts both kinds of lines", () => {
    expect(cartLinePrice(offerLine)).toBe(6.5);
    expect(cartTotal([itemLine, offerLine])).toBe(10.5);
    expect(cartCount([itemLine, offerLine])).toBe(3);
  });

  it("falls back to the first composed image when the offer has none", () => {
    expect(offerImage(offer)).toBe("https://cdn.test/croissant.jpg");
    expect(offerImage({ ...offer, image: "https://cdn.test/offer.jpg" })).toBe("https://cdn.test/offer.jpg");
  });

  it("adds an offer once and updates the existing line instead of duplicating it", () => {
    const added = setOfferQuantity([itemLine], offer, 1);
    expect(added).toHaveLength(2);
    expect(added[1]).toMatchObject({ kind: "offer", quantity: 1, item: { id: "offer-1", price: 6.5 } });

    const updated = setOfferQuantity(added, offer, 3);
    expect(updated.filter(isOfferLine)).toHaveLength(1);
    expect(updated.find(isOfferLine)?.quantity).toBe(3);
  });

  it("removes the offer line when the quantity reaches zero", () => {
    expect(setOfferQuantity([itemLine, offerLine], offer, 0)).toEqual([itemLine]);
    expect(setOfferQuantity([itemLine, offerLine], offer, -1)).toEqual([itemLine]);
  });
});
