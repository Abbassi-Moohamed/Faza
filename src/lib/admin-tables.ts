import type { OrderDto, TableSessionDto } from "@/types/backend";

/**
 * Bill of a session, in one place.
 *
 * `revenue` is the money the session actually booked (confirmed orders);
 * `pending` is not booked yet and `outstanding` is confirmed but not paid.
 */
export interface SessionTotals {
  /** Every order of the session, rejected ones included. */
  orders: number;
  revenue: number;
  paid: number;
  outstanding: number;
  pending: number;
}

export interface AdminSessionEntry {
  session: TableSessionDto;
  orders: OrderDto[];
  totals: SessionTotals;
}

export interface AdminTableGroup {
  tableNumber: number;
  /** The sessions of the table, each with its own bill. */
  entries: AdminSessionEntry[];
  /** Every order of the table, across its sessions. */
  orders: OrderDto[];
  /** Bill of the table, summed over its sessions. */
  totals: SessionTotals;
}

/** Confirmed revenue of a session, pending orders excluded. */
export function sessionRevenue(orders: OrderDto[]): number {
  return orders.filter((order) => order.status === "CONFIRMED").reduce((sum, order) => sum + order.total, 0);
}

/** Revenue still due for a session (confirmed but not paid yet). */
export function sessionOutstanding(orders: OrderDto[]): number {
  return orders
    .filter((order) => order.status === "CONFIRMED" && order.paymentStatus !== "PAID")
    .reduce((sum, order) => sum + order.total, 0);
}

/** Sum of the orders waiting for a confirmation. */
export function sessionPending(orders: OrderDto[]): number {
  return orders.filter((order) => order.status === "PENDING").reduce((sum, order) => sum + order.total, 0);
}

/** Paid amount of a session (confirmed and settled). */
export function sessionPaid(orders: OrderDto[]): number {
  return orders
    .filter((order) => order.status === "CONFIRMED" && order.paymentStatus === "PAID")
    .reduce((sum, order) => sum + order.total, 0);
}

/** Bill of a session rebuilt from the orders the backoffice happens to hold. */
export function totalsFromOrders(orders: OrderDto[]): SessionTotals {
  return {
    orders: orders.length,
    revenue: sessionRevenue(orders),
    paid: sessionPaid(orders),
    outstanding: sessionOutstanding(orders),
    pending: sessionPending(orders),
  };
}

const emptyTotals = (): SessionTotals => ({ orders: 0, revenue: 0, paid: 0, outstanding: 0, pending: 0 });

/**
 * Bill of a session.
 *
 * The server aggregates it (`session.totals`) so the numbers stay exact even
 * when the session holds more orders than the paginated order list returns;
 * the orders known locally are only a fallback.
 */
export function sessionTotals(session: TableSessionDto, orders: OrderDto[] = []): SessionTotals {
  const totals = session.totals;
  if (!totals) return totalsFromOrders(orders);
  return {
    orders: totals.totalOrders,
    revenue: totals.confirmedRevenue,
    paid: totals.paidRevenue,
    outstanding: totals.outstandingRevenue,
    pending: totals.pendingRevenue,
  };
}

/**
 * Group the active table sessions by table, then attach the orders of each
 * session.
 *
 * A table can host several sessions (one per party), and each session keeps
 * its own bill: the admin settles them one by one. Orders without a session
 * (legacy data) are ignored here — the "commandes" list still shows them.
 */
export function groupSessionsByTable(orders: OrderDto[], sessions: TableSessionDto[]): AdminTableGroup[] {
  const active = new Map<string, AdminSessionEntry>();
  for (const session of sessions) {
    if (session.status !== "ACTIVE") continue;
    active.set(session.id, { session, orders: [], totals: emptyTotals() });
  }

  for (const order of orders) {
    if (!order.tableSessionId) continue;
    const entry = active.get(order.tableSessionId);
    if (entry) entry.orders.push(order);
  }

  for (const entry of active.values()) {
    entry.totals = sessionTotals(entry.session, entry.orders);
  }

  const byTable = new Map<number, AdminSessionEntry[]>();
  for (const entry of active.values()) {
    const list = byTable.get(entry.session.tableNumber) ?? [];
    list.push(entry);
    byTable.set(entry.session.tableNumber, list);
  }

  return Array.from(byTable.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([tableNumber, entries]) => ({
      tableNumber,
      entries,
      orders: entries.flatMap((entry) => entry.orders),
      totals: entries.reduce<SessionTotals>(
        (sum, entry) => ({
          orders: sum.orders + entry.totals.orders,
          revenue: sum.revenue + entry.totals.revenue,
          paid: sum.paid + entry.totals.paid,
          outstanding: sum.outstanding + entry.totals.outstanding,
          pending: sum.pending + entry.totals.pending,
        }),
        emptyTotals(),
      ),
    }));
}
