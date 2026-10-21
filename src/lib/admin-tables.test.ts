import { describe, expect, it } from "vitest";

import {
  groupSessionsByTable,
  sessionOutstanding,
  sessionPaid,
  sessionPending,
  sessionRevenue,
  sessionTotals,
  totalsFromOrders,
} from "@/lib/admin-tables";
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
  totals?: TableSessionDto["totals"],
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
  ...(totals ? { totals } : {}),
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
    expect(sessionPaid(orders)).toBe(12);
    expect(sessionOutstanding(orders)).toBe(8);
    expect(sessionPending(orders)).toBe(5);
  });

  it("rebuilds the bill of a session from the orders it knows", () => {
    const totals = totalsFromOrders([
      order("a", 7, "s1", "CONFIRMED", "PAID", 12),
      order("b", 7, "s1", "PENDING", "UNPAID", 5),
    ]);

    expect(totals).toEqual({ orders: 2, revenue: 12, paid: 12, outstanding: 0, pending: 5 });
  });

  it("trusts the server-side totals over the local order list", () => {
    const session = tableSession("s1", 7, "ACTIVE", {
      totalOrders: 4,
      confirmedOrders: 2,
      pendingOrders: 1,
      rejectedOrders: 1,
      confirmedRevenue: 30,
      paidRevenue: 10,
      outstandingRevenue: 20,
      pendingRevenue: 5,
    });

    // The backoffice only holds the newest order of the session.
    const totals = sessionTotals(session, [order("a", 7, "s1", "CONFIRMED", "PAID", 12)]);

    expect(totals).toEqual({ orders: 4, revenue: 30, paid: 10, outstanding: 20, pending: 5 });
  });

  it("falls back to the local orders when the server sends no totals", () => {
    const totals = sessionTotals(tableSession("s1", 7), [order("a", 7, "s1", "CONFIRMED", "PAID", 12)]);

    expect(totals).toEqual({ orders: 1, revenue: 12, paid: 12, outstanding: 0, pending: 0 });
  });

  it("sums the bills of the sessions of a table", () => {
    const groups = groupSessionsByTable(
      [order("a", 7, "s1", "CONFIRMED", "PAID", 12)],
      [
        tableSession("s1", 7, "ACTIVE", {
          totalOrders: 1,
          confirmedOrders: 1,
          pendingOrders: 0,
          rejectedOrders: 0,
          confirmedRevenue: 12,
          paidRevenue: 12,
          outstandingRevenue: 0,
          pendingRevenue: 0,
        }),
        tableSession("s2", 7, "ACTIVE", {
          totalOrders: 3,
          confirmedOrders: 1,
          pendingOrders: 2,
          rejectedOrders: 0,
          confirmedRevenue: 8,
          paidRevenue: 0,
          outstandingRevenue: 8,
          pendingRevenue: 6,
        }),
      ],
    );

    expect(groups[0].totals).toEqual({ orders: 4, revenue: 20, paid: 12, outstanding: 8, pending: 6 });
    expect(groups[0].entries[1].totals.revenue).toBe(8);
  });
});
