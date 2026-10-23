import { describe, expect, it } from "vitest";

import { mergeSessionHistory, selectLedgerCandidates } from "@/lib/session-history";
import type { SessionOrderRef } from "@/lib/session-orders";
import type { OrderDto, SessionSummaryDto } from "@/types/backend";

const order = (id: string, tableNumber: number, createdAt: string, total = 10): OrderDto => ({
  id,
  coffeeId: "coffee-1",
  tableNumber,
  status: "PENDING",
  paymentStatus: "UNPAID",
  paidAt: null,
  paidBy: null,
  items: [],
  offers: [],
  total,
  tableSessionId: "session-1",
  serviceShiftId: null,
  createdAt,
  updatedAt: createdAt,
});

const session = (tableNumber: number, status: "ACTIVE" | "CLOSED" = "ACTIVE"): SessionSummaryDto => ({
  tableNumber,
  status,
  orderCount: 2,
  openedAt: "2026-01-01T10:00:00.000Z",
  closedAt: null,
});

const ledger = (...entries: SessionOrderRef[]): SessionOrderRef[] => entries;

describe("session history merge", () => {
  it("returns the server orders untouched when the ledger is empty", () => {
    const serverOrders = [order("a", 7, "2026-01-01T10:00:00.000Z"), order("b", 7, "2026-01-01T09:00:00.000Z")];

    const history = mergeSessionHistory(serverOrders, session(7), [], []);

    expect(history.orders.map((item) => item.id)).toEqual(["a", "b"]);
    expect(history.tableNumber).toBe(7);
    expect(history.session?.status).toBe("ACTIVE");
  });

  it("sorts the merged orders newest first", () => {
    const serverOrders = [order("a", 7, "2026-01-01T10:00:00.000Z")];
    const fallback = [order("b", 7, "2026-01-01T11:00:00.000Z")];

    const history = mergeSessionHistory(serverOrders, session(7), ledger({ id: "b", tableNumber: 7 }), fallback);

    expect(history.orders.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("never duplicates an order the server already knows", () => {
    const serverOrders = [order("a", 7, "2026-01-01T10:00:00.000Z")];

    const history = mergeSessionHistory(serverOrders, session(7), ledger({ id: "a", tableNumber: 7 }), [
      order("a", 7, "2026-01-01T10:00:00.000Z"),
    ]);

    expect(history.orders).toHaveLength(1);
  });

  it("keeps the orders of another table out of the history", () => {
    const fallback = [order("other", 12, "2026-01-01T11:00:00.000Z")];

    const history = mergeSessionHistory([], session(7), ledger({ id: "other", tableNumber: 12 }), fallback);

    expect(history.orders).toEqual([]);
    expect(history.tableNumber).toBe(7);
  });

  it("shows every ledger order when the session is gone", () => {
    const fallback = [order("a", 7, "2026-01-01T10:00:00.000Z"), order("b", 12, "2026-01-01T11:00:00.000Z")];

    const history = mergeSessionHistory(
      [],
      null,
      ledger({ id: "a", tableNumber: 7 }, { id: "b", tableNumber: 12 }),
      fallback,
    );

    expect(history.orders.map((item) => item.id)).toEqual(["b", "a"]);
    expect(history.session).toBeNull();
    // The orders span two tables: the table number must stay unknown.
    expect(history.tableNumber).toBeNull();
  });

  it("resolves the table number when the ledger holds a single table", () => {
    const history = mergeSessionHistory([], null, ledger({ id: "a", tableNumber: 7 }), [
      order("a", 7, "2026-01-01T10:00:00.000Z"),
    ]);

    expect(history.tableNumber).toBe(7);
  });

  it("selects only the ledger entries the server does not know", () => {
    const serverOrders = [order("a", 7, "2026-01-01T10:00:00.000Z")];

    const candidates = selectLedgerCandidates(
      ledger({ id: "a", tableNumber: 7 }, { id: "b", tableNumber: 7 }, { id: "c", tableNumber: 12 }),
      serverOrders,
      session(7),
    );

    expect(candidates.map((entry) => entry.id)).toEqual(["b"]);
  });

  it("selects every ledger entry when there is no session", () => {
    const candidates = selectLedgerCandidates(
      ledger({ id: "a", tableNumber: 7 }, { id: "c", tableNumber: 12 }),
      [],
      null,
    );

    expect(candidates.map((entry) => entry.id)).toEqual(["a", "c"]);
  });
});
