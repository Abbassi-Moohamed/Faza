import type { OrderDto, SessionSummaryDto } from "@/types/backend";
import type { SessionOrderRef } from "@/lib/session-orders";

export interface SessionHistory {
  /** Every order the visitor can see, newest first. */
  orders: OrderDto[];
  /**
   * The table the history belongs to. `null` when the orders come from the
   * local ledger only and span several tables — showing one of them would lie.
   */
  tableNumber: number | null;
  /** The session as the server knows it; `null` when only the ledger answered. */
  session: SessionSummaryDto | null;
}

/**
 * Ledger entries the server does not know about and that belong to the same
 * table as the session. They are the only ones worth fetching: the ledger
 * never mixes two tables in one history.
 */
export function selectLedgerCandidates(
  ledger: SessionOrderRef[],
  serverOrders: OrderDto[],
  session: SessionSummaryDto | null,
): SessionOrderRef[] {
  const known = new Set(serverOrders.map((order) => order.id));
  return ledger.filter((entry) => {
    if (known.has(entry.id)) return false;
    return session ? entry.tableNumber === session.tableNumber : true;
  });
}

/**
 * Merge the server session history with the orders fetched from the ledger.
 *
 * The server owns the orders of the session (it groups them by session, so a
 * table shared by several parties never leaks). The ledger only fills the gap
 * for the orders the server does not know about — the case where the session
 * was closed and dropped.
 */
export function mergeSessionHistory(
  serverOrders: OrderDto[],
  session: SessionSummaryDto | null,
  ledger: SessionOrderRef[],
  fallbackOrders: OrderDto[],
): SessionHistory {
  const candidateIds = new Set(selectLedgerCandidates(ledger, serverOrders, session).map((entry) => entry.id));

  const orders = [...serverOrders, ...fallbackOrders.filter((order) => candidateIds.has(order.id))].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const tableNumbers = new Set(orders.map((order) => order.tableNumber));
  const tableNumber = session?.tableNumber ?? (tableNumbers.size === 1 ? [...tableNumbers][0] : null);

  return { orders, tableNumber, session };
}
