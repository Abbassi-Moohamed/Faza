import { describe, expect, it } from "vitest";

import {
  orderItemsLabel,
  orderMoment,
  orderStateLabel,
  pendingTableOrders,
  tableTotals,
  tablesSummary,
  totalsFromOrders,
  unpaidTableOrders,
} from "@/lib/admin-tables";
import type { AdminTableDto, AdminTableOrderDto, AdminTableTotals } from "@/types/backend";

const tableOrder = (
  id: string,
  status: AdminTableOrderDto["status"] = "PENDING",
  paymentStatus: AdminTableOrderDto["paymentStatus"] = "UNPAID",
  total = 10,
  tableNumber = 7,
): AdminTableOrderDto => ({
  id,
  tableNumber,
  status,
  paymentStatus,
  total,
  createdAt: "2026-01-01T10:00:00.000Z",
  paidAt: null,
  items: [],
});

const table = (tableNumber: number, orders: AdminTableOrderDto[] = [], totals?: AdminTableTotals): AdminTableDto => ({
  tableNumber,
  sessions: 1,
  openedAt: "2026-01-01T09:00:00.000Z",
  lastOrderAt: "2026-01-01T10:00:00.000Z",
  totals: totals ?? totalsFromOrders(orders),
  orders,
});

describe("admin table view", () => {
  it("reads the date and the time of an order", () => {
    const iso = "2026-01-01T10:05:00.000Z";
    const local = new Date(iso);
    const moment = orderMoment(iso);

    // The admin reads the local time of the coffee, not the UTC one.
    expect(moment.date).toContain("janv");
    expect(moment.time).toBe(
      `${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")}`,
    );
  });

  it("survives an invalid date", () => {
    expect(orderMoment("not-a-date")).toEqual({ date: "—", time: "—" });
  });

  it("lists the items of an order", () => {
    const order = tableOrder("a");
    order.items = [
      { name: "Café crème", quantity: 2 },
      { name: "Dessert", quantity: 1 },
    ];

    expect(orderItemsLabel(order)).toBe("2× Café crème, 1× Dessert");
  });

  it("names the operational state of an order", () => {
    expect(orderStateLabel(tableOrder("a", "PENDING"))).toBe("En attente");
    expect(orderStateLabel(tableOrder("b", "REJECTED"))).toBe("Refusée");
    expect(orderStateLabel(tableOrder("c", "CONFIRMED", "PAID"))).toBe("Payée");
    expect(orderStateLabel(tableOrder("d", "CONFIRMED", "UNPAID"))).toBe("À payer");
  });

  it("rebuilds the bill of a table from its orders", () => {
    const totals = totalsFromOrders([
      tableOrder("a", "CONFIRMED", "PAID", 12),
      tableOrder("b", "CONFIRMED", "UNPAID", 8),
      tableOrder("c", "PENDING", "UNPAID", 5),
      tableOrder("d", "REJECTED", "UNPAID", 3),
    ]);

    expect(totals).toEqual({
      totalOrders: 4,
      confirmedOrders: 2,
      pendingOrders: 1,
      rejectedOrders: 1,
      confirmedRevenue: 20,
      paidRevenue: 12,
      outstandingRevenue: 8,
      pendingRevenue: 5,
    });
  });

  it("trusts the totals sent by the server", () => {
    const totals: AdminTableTotals = {
      totalOrders: 4,
      confirmedOrders: 2,
      pendingOrders: 1,
      rejectedOrders: 1,
      confirmedRevenue: 30,
      paidRevenue: 10,
      outstandingRevenue: 20,
      pendingRevenue: 5,
    };

    expect(tableTotals(table(7, [tableOrder("a", "CONFIRMED", "PAID", 12)], totals))).toEqual(totals);
  });

  it("falls back to the local orders when the server sends no totals", () => {
    const withoutTotals = { ...table(7, [tableOrder("a", "CONFIRMED", "PAID", 12)]), totals: undefined };

    expect(tableTotals(withoutTotals as unknown as AdminTableDto).confirmedRevenue).toBe(12);
  });

  it("lists the orders to settle of a table", () => {
    const current = table(7, [
      tableOrder("a", "PENDING"),
      tableOrder("b", "CONFIRMED", "UNPAID"),
      tableOrder("c", "CONFIRMED", "PAID"),
      tableOrder("d", "REJECTED"),
    ]);

    expect(pendingTableOrders(current).map((order: AdminTableOrderDto) => order.id)).toEqual(["a"]);
    expect(unpaidTableOrders(current).map((order: AdminTableOrderDto) => order.id)).toEqual(["b"]);
  });

  it("sums the figures of the floor", () => {
    const summary = tablesSummary([
      table(7, [tableOrder("a", "CONFIRMED", "PAID", 12)]),
      table(12, [tableOrder("b", "CONFIRMED", "UNPAID", 8), tableOrder("c", "PENDING", "UNPAID", 5)]),
    ]);

    expect(summary.tables).toBe(2);
    expect(summary.orders).toBe(3);
    expect(summary.revenue).toBe(20);
    expect(summary.pending).toBe(1);
    expect(summary.outstanding).toBe(8);
  });
});
