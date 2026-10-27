"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getDictionary } from "@/i18n";
import { ApiClientError } from "@/lib/api";
import { formatPrice } from "@/lib/menu";
import { getOrder, listSessionOrders } from "@/lib/orders";
import { getRealtimeSocket } from "@/lib/realtime";
import { readSessionOrders } from "@/lib/session-orders";
import { mergeSessionHistory, selectLedgerCandidates } from "@/lib/session-history";
import { readTableSession } from "@/lib/table-session";
import { siteConfig } from "@/config/site";
import type { OrderDto, SessionSummaryDto } from "@/types/backend";
import { BackLink } from "@/components/layout/BackLink";

const timeFormatter = new Intl.DateTimeFormat(siteConfig.locale, {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * "Mes commandes" — the whole history of the visitor's table session.
 *
 * The session token is the source of truth (the server groups the orders of
 * one session), while the local ledger keeps the orders of a session that has
 * been closed and settled in the meantime.
 */
export default function SessionOrdersPage({ params }: { params: Promise<{ slug: string }> }) {
  const d = getDictionary();
  const [slug, setSlug] = useState("");
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [session, setSession] = useState<SessionSummaryDto | null>(null);
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (coffeeSlug: string) => {
      const stored = readTableSession(coffeeSlug);
      const local = readSessionOrders(coffeeSlug);
      const serverOrders: OrderDto[] = [];
      let summary: SessionSummaryDto | null = null;

      if (stored) {
        try {
          const response = await listSessionOrders(stored.token);
          serverOrders.push(...response.orders);
          summary = response.session;
        } catch (e) {
          // An unknown token means the session is gone; the local ledger
          // still lists the orders placed from this browser.
          if (!(e instanceof ApiClientError) || e.status !== 401) {
            setError(d.order.ordersLoadError);
            setLoading(false);
            return;
          }
        }
      }

      // The server owns the session history. The ledger only fills the gap for
      // the orders of the same table that the server does not know about
      // (session closed and dropped), so two tables never mix in one history.
      const candidates = selectLedgerCandidates(local, serverOrders, summary);
      const extras = await Promise.all(candidates.map((entry) => getOrder(entry.id, stored?.token).catch(() => null)));
      const history = mergeSessionHistory(
        serverOrders,
        summary,
        local,
        extras.filter((order): order is OrderDto => order !== null),
      );

      setOrders(history.orders);
      setSession(history.session);
      setTableNumber(history.tableNumber);
      setLoading(false);
    },
    [d],
  );

  useEffect(() => {
    let active = true;
    void params.then(({ slug: nextSlug }) => {
      if (!active) return;
      setSlug(nextSlug);
      void load(nextSlug);
    });
    return () => {
      active = false;
    };
  }, [params, load]);

  // Live updates: the session room streams the orders of this session only.
  useEffect(() => {
    if (!slug) return;
    const stored = readTableSession(slug);
    if (!stored) return;
    const socket = getRealtimeSocket();
    const onNew = (payload: OrderDto) => {
      setOrders((current) => (current.some((order) => order.id === payload.id) ? current : [payload, ...current]));
    };
    const onUpdated = (payload: OrderDto) => {
      setOrders((current) => current.map((order) => (order.id === payload.id ? payload : order)));
    };
    socket.on("order:new", onNew);
    socket.on("order:updated", onUpdated);
    socket.emit("session:subscribe", stored.token);
    return () => {
      socket.off("order:new", onNew);
      socket.off("order:updated", onUpdated);
      socket.emit("session:unsubscribe", stored.token);
    };
  }, [slug]);

  // A refused order is not billed: it stays visible in the list but it does
  // not count in the bill of the table.
  const billable = orders.filter((order) => order.status !== "REJECTED");
  const total = billable.reduce((sum, order) => sum + order.total, 0);
  return (
    <main id="main">
      <section className="order-status container">
        {slug ? <BackLink className="order-status__back" href={`/faza/${slug}`} label={d.order.backToMenu} /> : null}
        <h1>{d.order.myOrders}</h1>

        {loading ? (
          <p>…</p>
        ) : error ? (
          <p className="admin-form__error">{error}</p>
        ) : orders.length === 0 ? (
          <div className="orders-history__empty">
            <p className="orders-history__empty-title">{d.order.noOrders}</p>
            <p>{d.order.noOrdersHint}</p>
            <Link className="orders-history__cta" href={`/faza/${slug}`}>
              {d.order.backToMenu}
            </Link>
          </div>
        ) : (
          <>
            <div className="orders-history__summary">
              <div className="orders-history__summary-item">
                <span>{d.order.tableNumber}</span>
                <strong>{tableNumber ?? "—"}</strong>
              </div>
              <div className="orders-history__summary-item">
                <span>{d.order.ordersCountLabel(billable.length)}</span>
                <strong>{formatPrice(total, siteConfig.currency, siteConfig.locale)}</strong>
              </div>
              {session ? (
                <div className="orders-history__summary-item">
                  <span>{d.order.sessionState}</span>
                  <strong>{session.status === "CLOSED" ? d.order.sessionClosed : d.order.sessionActive}</strong>
                </div>
              ) : null}
            </div>

            <ul className="orders-history__list">
              {orders.map((order) => (
                <li className="orders-history__card" key={order.id}>
                  <div className="orders-history__head">
                    <div>
                      <span className="orders-history__date">{timeFormatter.format(new Date(order.createdAt))}</span>
                      <p className={`orders-history__badge orders-history__badge--${order.status.toLowerCase()}`}>
                        {order.status === "CONFIRMED"
                          ? d.order.statusConfirmed
                          : order.status === "REJECTED"
                            ? d.order.statusRejected
                            : d.order.statusPending}
                      </p>
                    </div>
                    <strong className="orders-history__total">
                      {formatPrice(order.total, siteConfig.currency, siteConfig.locale)}
                    </strong>
                  </div>
                  <ul className="orders-history__lines">
                    {order.items.map((item) => (
                      <li key={item.itemId}>
                        <strong>{item.quantity}×</strong> {item.name}
                      </li>
                    ))}
                    {order.offers.map((offer) => (
                      <li key={`offer-${offer.offerId}`}>
                        <strong>{offer.quantity}×</strong> {offer.name}{" "}
                        <span className="orders-history__offer-tag">{d.offer.cartLabel}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="orders-history__foot">
                    <span>
                      {order.status === "CONFIRMED"
                        ? order.paymentStatus === "PAID"
                          ? d.order.paymentPaid
                          : d.order.paymentUnpaid
                        : d.order.status}
                    </span>
                    <Link className="orders-history__link" href={`/faza/${slug}/order/${order.id}`}>
                      {d.order.viewOrder}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
