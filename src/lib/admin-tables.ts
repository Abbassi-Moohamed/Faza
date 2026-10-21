import type { OrderDto, TableSessionDto } from "@/types/backend";

export interface AdminSessionEntry {
  session: TableSessionDto;
  orders: OrderDto[];
}

export interface AdminTableGroup {
  tableNumber: number;
  /** The sessions of the table, each with its own bill. */
  entries: AdminSessionEntry[];
  /** Every order of the table, across its sessions. */
  orders: OrderDto[];
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
    active.set(session.id, { session, orders: [] });
  }

  for (const order of orders) {
    if (!order.tableSessionId) continue;
    const entry = active.get(order.tableSessionId);
    if (entry) entry.orders.push(order);
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
    }));
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
