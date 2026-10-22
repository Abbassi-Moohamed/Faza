import type { AdminTableDto, AdminTableOrderDto, AdminTableTotals } from "@/types/backend";

/**
 * Helpers for the table-centric backoffice view.
 *
 * The coffee admin works with tables: every session running on a table is
 * part of it, and the table is settled as a whole. The client sessions stay
 * an implementation detail — they are never rendered.
 */

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" });
const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

/** Date and time of an order, split for a readable layout. */
export function orderMoment(value: string | Date): { date: string; time: string } {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return { date: "—", time: "—" };
  return { date: dateFormatter.format(date), time: timeFormatter.format(date) };
}

/** "2× Café crème, 1× Dessert" — what the client ordered. */
export function orderItemsLabel(order: AdminTableOrderDto): string {
  if (!order.items?.length) return "—";
  return order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ");
}

/** Operational state of an order: pending, refused, paid or still due. */
export function orderStateLabel(order: AdminTableOrderDto): string {
  if (order.status === "PENDING") return "En attente";
  if (order.status === "REJECTED") return "Refusée";
  return order.paymentStatus === "PAID" ? "Payée" : "À payer";
}

/** Bill of a table rebuilt from its orders. */
export function totalsFromOrders(orders: AdminTableOrderDto[]): AdminTableTotals {
  const sum = (predicate: (order: AdminTableOrderDto) => boolean) =>
    orders.filter(predicate).reduce((total, order) => total + Number(order.total ?? 0), 0);
  const isConfirmed = (order: AdminTableOrderDto) => order.status === "CONFIRMED";
  const isPaid = (order: AdminTableOrderDto) => order.paymentStatus === "PAID";

  return {
    totalOrders: orders.length,
    confirmedOrders: orders.filter(isConfirmed).length,
    pendingOrders: orders.filter((order) => order.status === "PENDING").length,
    rejectedOrders: orders.filter((order) => order.status === "REJECTED").length,
    confirmedRevenue: sum(isConfirmed),
    paidRevenue: sum((order) => isConfirmed(order) && isPaid(order)),
    outstandingRevenue: sum((order) => isConfirmed(order) && !isPaid(order)),
    pendingRevenue: sum((order) => order.status === "PENDING"),
  };
}

/**
 * Bill of a table.
 *
 * The server aggregates it so the numbers stay exact; the orders known
 * locally are only a fallback.
 */
export function tableTotals(table: AdminTableDto): AdminTableTotals {
  return table.totals ?? totalsFromOrders(table.orders ?? []);
}

/** Orders of a table waiting for a decision (confirmation or refusal). */
export function pendingTableOrders(table: AdminTableDto): AdminTableOrderDto[] {
  return table.orders.filter((order) => order.status === "PENDING");
}

/** Orders of a table confirmed but not paid yet. */
export function unpaidTableOrders(table: AdminTableDto): AdminTableOrderDto[] {
  return table.orders.filter((order) => order.status === "CONFIRMED" && order.paymentStatus !== "PAID");
}
