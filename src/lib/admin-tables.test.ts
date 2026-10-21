import { describe, expect, it } from "vitest";

import { groupSessionsByTable, sessionOutstanding, sessionPending, sessionRevenue } from "@/lib/admin-tables";
import type { OrderDto, TableSessionDto } from "@/types/backend";

const order = (
  id: string,
  tableNumber: number,
  tableSessionId: string | null,
  status: OrderDto["status"] = "PENDING",
  paymentStatus: OrderDto["paymentStatus"] = "UNPAID",
  total = 10,
): OrderDto => ({
  id,
  coffeeId: "coffee-1",
  tableNumber,
  status,
  paymentStatus,
  paidAt: null,
  paidBy: null,
  items: [],
  total,
  tableSessionId,
  serviceShiftId: null,
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
});

const tableSession = (
  id: string,
  tableNumber: number,
  status: TableSessionDto["status"] = "ACTIVE",
): TableSessionDto => ({
  id,
  coffeeId: "coffee-1",
  tableNumber,
  serviceShiftId: null,
  status,
  openedAt: "2026-01-01T09:00:00.000Z",
  closedAt: null,
  lastOrderAt: "2026-01-01T10:00:00.000Z",
  orderCount: 0,
});

describe("admin table grouping", () => {
  it("groups the sessions of a table under that table", () => {
    const groups = groupSessionsByTable(
      [order("a", 7, "s1"), order("b", 7, "s2")],
      [tableSession("s1", 7), tableSession("s2", 7)],
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].tableNumber).toBe(7);
    expect(groups[0].entries).toHaveLength(2);
    expect(groups[0].entries.map((entry) => entry.session.id)).toEqual(["s1", "s2"]);
    expect(groups[0].orders.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("keeps the bills of two parties at the same table apart", () => {
    const groups = groupSessionsByTable(
      [order("a", 7, "s1"), order("b", 7, "s2")],
      [tableSession("s1", 7), tableSession("s2", 7)],
    );

    expect(groups[0].entries[0].orders.map((item) => item.id)).toEqual(["a"]);
    expect(groups[0].entries[1].orders.map((item) => item.id)).toEqual(["b"]);
  });

  it("sorts the tables by number", () => {
    const groups = groupSessionsByTable(
      [order("a", 12, "s2"), order("b", 7, "s1")],
      [tableSession("s1", 7), tableSession("s2", 12)],
    );

    expect(groups.map((group) => group.tableNumber)).toEqual([7, 12]);
  });

  it("ignores the closed sessions", () => {
    const groups = groupSessionsByTable(
      [order("a", 7, "s1"), order("b", 7, "s2")],
      [tableSession("s1", 7), tableSession("s2", 7, "CLOSED")],
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].entries.map((entry) => entry.session.id)).toEqual(["s1"]);
    expect(groups[0].orders.map((item) => item.id)).toEqual(["a"]);
  });

  it("ignores the orders without a session", () => {
    const groups = groupSessionsByTable([order("a", 7, null)], [tableSession("s1", 7)]);

    expect(groups[0].orders).toEqual([]);
    expect(groups[0].entries).toHaveLength(1);
  });

  it("sums the revenue of a session", () => {
    const orders = [
      order("a", 7, "s1", "CONFIRMED", "PAID", 12),
      order("b", 7, "s1", "CONFIRMED", "UNPAID", 8),
      order("c", 7, "s1", "PENDING", "UNPAID", 5),
    ];

    expect(sessionRevenue(orders)).toBe(20);
    expect(sessionOutstanding(orders)).toBe(8);
    expect(sessionPending(orders)).toBe(5);
  });
});
