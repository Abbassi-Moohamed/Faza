import { beforeEach, describe, expect, it } from "vitest";

import { readSessionOrders, rememberSessionOrder } from "@/lib/session-orders";

const SLUG = "cafe-el-manzah";
const KEY = `faza:session-orders:${SLUG}`;

describe("session order ledger", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("is empty when nothing was ordered yet", () => {
    expect(readSessionOrders(SLUG)).toEqual([]);
  });

  it("keeps the newest order first and remembers the table", () => {
    rememberSessionOrder(SLUG, "order-1", 7);
    rememberSessionOrder(SLUG, "order-2", 7);

    expect(readSessionOrders(SLUG)).toEqual([
      { id: "order-2", tableNumber: 7 },
      { id: "order-1", tableNumber: 7 },
    ]);
  });

  it("never stores the same order twice", () => {
    rememberSessionOrder(SLUG, "order-1", 7);
    rememberSessionOrder(SLUG, "order-1", 7);

    expect(readSessionOrders(SLUG)).toEqual([{ id: "order-1", tableNumber: 7 }]);
  });

  it("keeps the table number of every order", () => {
    rememberSessionOrder(SLUG, "order-1", 7);
    rememberSessionOrder(SLUG, "order-2", 12);

    expect(readSessionOrders(SLUG).map((entry) => entry.tableNumber)).toEqual([12, 7]);
  });

  it("drops the oldest orders beyond the cap", () => {
    for (let index = 0; index < 55; index += 1) {
      rememberSessionOrder(SLUG, `order-${index}`, 7);
    }

    const entries = readSessionOrders(SLUG);
    expect(entries).toHaveLength(50);
    expect(entries[0].id).toBe("order-54");
    expect(entries.at(-1)?.id).toBe("order-5");
  });

  it("ignores a corrupted payload instead of throwing", () => {
    window.localStorage.setItem(KEY, "{not json");
    expect(readSessionOrders(SLUG)).toEqual([]);

    window.localStorage.setItem(KEY, JSON.stringify([{ id: "order-1" }, "nope", null, { id: "x", tableNumber: 2 }]));
    expect(readSessionOrders(SLUG)).toEqual([{ id: "x", tableNumber: 2 }]);
  });

  it("scopes the ledger to its coffee", () => {
    rememberSessionOrder(SLUG, "order-1", 7);
    rememberSessionOrder("brew-and-beans", "order-2", 3);

    expect(readSessionOrders(SLUG)).toEqual([{ id: "order-1", tableNumber: 7 }]);
    expect(readSessionOrders("brew-and-beans")).toEqual([{ id: "order-2", tableNumber: 3 }]);
  });
});
