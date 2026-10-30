"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getDictionary } from "@/i18n";
import { ApiClientError } from "@/lib/api";
import { formatPrice } from "@/lib/menu";
import { listSessionOrders } from "@/lib/orders";
import { getRealtimeSocket } from "@/lib/realtime";
import { clearTableSession, readTableSession, tableSessionEventName } from "@/lib/table-session";
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
 * "Mes commandes" shows orders for the visitor's active table session only.
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
      setLoading(true);
      setError(null);

      if (!stored) {
        setOrders([]);
        setSession(null);
        setTableNumber(null);
        setLoading(false);
        return;
      }

      try {
        const response = await listSessionOrders(stored.token);
        if (response.session.status !== "ACTIVE") {
          clearTableSession(coffeeSlug);
          setOrders([]);
          setSession(null);
          setTableNumber(null);
        } else {
          setOrders(response.orders);
          setSession(response.session);
          setTableNumber(response.session.tableNumber);
        }
      } catch (e) {
        if (!(e instanceof ApiClientError) || e.status !== 401) {
          setError(d.order.ordersLoadError);
        } else {
          clearTableSession(coffeeSlug);
          setOrders([]);
          setSession(null);
          setTableNumber(null);
        }
      } finally {
        setLoading(false);
      }
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

  useEffect(() => {
    if (!slug) return;
    const handleSessionChange = (event: Event) => {
      const detail = (event as CustomEvent<{ coffeeSlug?: string; status?: string }>).detail;
      if (detail?.coffeeSlug !== slug) return;
      if (detail.status === "closed") {
        setOrders([]);
        setSession(null);
        setTableNumber(null);
      } else {
        void load(slug);
      }
    };
    window.addEventListener(tableSessionEventName(), handleSessionChange);
    return () => {
      window.removeEventListener(tableSessionEventName(), handleSessionChange);
    };
  }, [slug, load]);

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
  const activeBillable = orders.filter((order) => order.status !== "REJECTED");
  const activeTotal = activeBillable.reduce((sum, order) => sum + order.total, 0);

  const renderOrderCard = (order: OrderDto) => (
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
  );

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
            {orders.length > 0 ? (
              <div className="orders-history__summary">
                <div className="orders-history__summary-item">
                  <span>{d.order.tableNumber}</span>
                  <strong>{tableNumber ?? "—"}</strong>
                </div>
                <div className="orders-history__summary-item">
                  <span>{d.order.ordersCountLabel(activeBillable.length)}</span>
                  <strong>{formatPrice(activeTotal, siteConfig.currency, siteConfig.locale)}</strong>
                </div>
                {session ? (
                  <div className="orders-history__summary-item">
                    <span>{d.order.sessionState}</span>
                    <strong>{session.status === "CLOSED" ? d.order.sessionClosed : d.order.sessionActive}</strong>
                  </div>
                ) : null}
              </div>
            ) : null}
            {orders.length > 0 ? (
              <>
                <h2 className="orders-history__section-title">{d.order.activeSessionOrders}</h2>
                <ul className="orders-history__list">{orders.map(renderOrderCard)}</ul>
              </>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
