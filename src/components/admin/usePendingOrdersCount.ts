import { useEffect, useState } from "react";

import { listOrders } from "@/lib/orders";
import { getAdminRealtimeSocket } from "@/lib/realtime";
import type { OrderDto } from "@/types/backend";

/**
 * Live count of PENDING (unconfirmed) orders for the backoffice tab badge.
 *
 * Reuses the existing admin socket (`order:new` / `order:updated` pushed to
 * the `coffee:{id}` room) — no extra connection, no polling. The count is
 * seeded from one REST call and then maintained with O(1) set operations:
 *
 *  - `order:new` is always born PENDING → increment.
 *  - `order:updated` for an order we know was pending (confirm/reject, from
 *    this device or another) → decrement; set membership makes the handling
 *    idempotent and distinguishes it from payment echoes (CONFIRMED →
 *    CONFIRMED) which must not change the count.
 *  - An `order:updated` for an unknown order could mean our snapshot was
 *    stale (e.g. more pending orders than the snapshot limit), so instead of
 *    guessing we schedule a debounced REST resync.
 *  - Every socket (re)connect resyncs, so events missed while offline self-
 *    heal. Events landing while a snapshot fetch is in flight mark it dirty
 *    and trigger one follow-up fetch, so the displayed count converges to the
 *    database truth regardless of read/event interleaving.
 *
 * The state is tagged with the token it was fetched under: a stale value from
 * a previous session renders as 0 until the first successful fetch for the
 * current token, which avoids resetting state from inside the effect.
 */

/** Backend cap for `limit` (listOrdersQuerySchema max) — cover the whole
 *  pending set in one page; >100 pending orders is handled by the resync
 *  path above. */
const SNAPSHOT_LIMIT = 100;
const RESYNC_DEBOUNCE_MS = 400;

export function usePendingOrdersCount(token: string | null): number {
  const [state, setState] = useState({ token, count: 0 });
  const count = state.token === token ? state.count : 0;

  useEffect(() => {
    if (!token) return;

    const socket = getAdminRealtimeSocket(token);
    const pendingIds = new Set<string>();
    let disposed = false;
    let inflight = false;
    let dirty = false;
    let resyncTimer: number | null = null;

    const updateCount = (next: number | ((current: number) => number)) =>
      setState((current) => {
        if (current.token !== token) return current;
        return { token, count: typeof next === "function" ? next(current.count) : next };
      });

    const fetchSnapshot = async () => {
      if (disposed || inflight) return;
      inflight = true;
      dirty = false;
      try {
        const page = await listOrders(token, "PENDING", undefined, SNAPSHOT_LIMIT);
        if (disposed) return;
        pendingIds.clear();
        for (const order of page.orders) pendingIds.add(order.id);
        // Hydration adopts the token unconditionally (the effect is disposed
        // if the token changed while the fetch was in flight), which is what
        // makes the gated `state.token === token` output start showing a
        // value for this session.
        setState({ token, count: page.total });
      } catch {
        // Keep the last known count; the next connect/event will retry.
      } finally {
        inflight = false;
        if (!disposed && dirty) void fetchSnapshot();
      }
    };

    const scheduleResync = () => {
      if (disposed) return;
      if (inflight) {
        dirty = true;
        return;
      }
      if (resyncTimer !== null) return;
      resyncTimer = window.setTimeout(() => {
        resyncTimer = null;
        void fetchSnapshot();
      }, RESYNC_DEBOUNCE_MS);
    };

    const onNewOrder = (order: OrderDto) => {
      if (disposed) return;
      if (order.status === "PENDING" && !pendingIds.has(order.id)) {
        pendingIds.add(order.id);
        updateCount((current) => current + 1);
      }
      if (inflight) dirty = true;
    };

    const onUpdatedOrder = (order: OrderDto) => {
      if (disposed) return;
      if (pendingIds.delete(order.id)) {
        updateCount((current) => Math.max(0, current - 1));
      } else if (order.status === "PENDING") {
        pendingIds.add(order.id);
        updateCount((current) => current + 1);
      } else {
        scheduleResync();
      }
      if (inflight) dirty = true;
    };

    const onConnect = () => {
      void fetchSnapshot();
    };

    socket.on("connect", onConnect);
    socket.on("order:new", onNewOrder);
    socket.on("order:updated", onUpdatedOrder);
    void fetchSnapshot();

    return () => {
      disposed = true;
      if (resyncTimer !== null) window.clearTimeout(resyncTimer);
      socket.off("connect", onConnect);
      socket.off("order:new", onNewOrder);
      socket.off("order:updated", onUpdatedOrder);
    };
  }, [token]);

  return count;
}
