import { describe, expect, it } from "vitest";

import { toAvailableMenuItems } from "@/lib/adapters";
import type { ItemDto } from "@/types/backend";

const item = (id: string, isAvailable: boolean): ItemDto => ({
  id,
  name: `Item ${id}`,
  description: null,
  price: 5,
  promotion: null,
  isAvailable,
  image: null,
  media: [],
});

describe("public menu item adapter", () => {
  it("omits unavailable items from the customer-facing menu", () => {
    const availableItems = toAvailableMenuItems([item("available", true), item("unavailable", false)]);

    expect(availableItems.map(({ id }) => id)).toEqual(["available"]);
    expect(availableItems[0]?.isAvailable).toBe(true);
  });
});
