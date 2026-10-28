"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getDictionary } from "@/i18n";
import { ApiClientError } from "@/lib/api";
import { formatPrice } from "@/lib/menu";
import { getOrder, listSessionOrders } from "@/lib/orders";
import { getRealtimeSocket } from "@/lib/realtime";
import { readTableSession } from "@/lib/table-session";
import { siteConfig } from "@/config/site";
import type { OrderDto } from "@/types/backend";
import { BackLink } from "@/components/layout/BackLink";
import { ItemArt } from "@/components/menu/ItemArt";
import type { MenuItem } from "@/types/menu";

const timeFormatter = new Intl.DateTimeFormat(siteConfig.locale, {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default function OrderStatusPage({ params }: { params: Promise<{ slug: string; orderId: string }> }) {
  const d = getDictionary();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [sessionOrders, setSessionOrders] = useState<OrderDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [orderId, setOrderId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [announce, setAnnounce] = useState("");
  const previousStatusRef = useRef<OrderDto["status"] | null>(null);
  useEffect(() => {
    let active = true;
    void params.then(({ slug: nextSlug, orderId: nextId }) => {
      setSlug(nextSlug);
      setOrderId(nextId);
      setError(null);
      return getOrder(nextId, readTableSession(nextSlug)?.token)
        .then((value) => {
          if (active) {
            previousStatusRef.current = value.status;
            setOrder(value);
          }
        })
        .catch((cause: unknown) => {
          if (active)
            setError(
              cause instanceof ApiClientError && cause.status === 404 ? d.order.orderNotFound : d.order.orderLoadError,
            );
        });
    });
    return () => {
      active = false;
    };
  }, [params, d.order.orderLoadError, d.order.orderNotFound]);

  // The other orders of the same table session — the visitor keeps a single
  // ticket per order, the session is the bill.
  useEffect(() => {
    if (!slug) return;
    const stored = readTableSession(slug);
    if (!stored) return;
    let active = true;
    void listSessionOrders(stored.token)
      .then((response) => {
        if (active) setSessionOrders(response.orders);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [slug]);

  // Realtime: subscribe to this order's room so status/payment changes made
  // by the coffee arrive instantly. The manual refresh button stays as the
  // fallback; on (re)connect we also resync over REST in case events were
  // missed while offline.
  useEffect(() => {
    if (!orderId) return;
    const socket = getRealtimeSocket();
    const sessionToken = readTableSession(slug)?.token;
    const applyOrder = (next: OrderDto) => {
      setOrder(next);
      setSessionOrders((current) => current.map((item) => (item.id === next.id ? next : item)));
      if (previousStatusRef.current && previousStatusRef.current !== next.status) {
        const nextLabel =
          next.status === "CONFIRMED"
            ? d.order.statusConfirmed
            : next.status === "REJECTED"
              ? d.order.statusRejected
              : d.order.statusPending;
        setAnnounce(d.order.statusUpdatedAnnounce(nextLabel));
      }
      previousStatusRef.current = next.status;
    };
    const onUpdated = (payload: OrderDto) => {
      if (payload.id !== orderId) return;
      applyOrder(payload);
    };
    const onConnect = () => {
      void getOrder(orderId, sessionToken)
        .then(applyOrder)
        .catch(() => undefined);
    };
    socket.on("order:updated", onUpdated);
    socket.on("connect", onConnect);
    socket.emit("order:subscribe", orderId, sessionToken);
    if (socket.connected) onConnect();
    return () => {
      socket.off("order:updated", onUpdated);
      socket.off("connect", onConnect);
      socket.emit("order:unsubscribe", orderId);
    };
  }, [orderId, slug, d]);
  const refresh = async () => {
    if (!orderId || refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      const latestOrder = await getOrder(orderId, readTableSession(slug)?.token);
      previousStatusRef.current = latestOrder.status;
      setOrder(latestOrder);
    } catch (cause) {
      setError(
        cause instanceof ApiClientError && cause.status === 404 ? d.order.orderNotFound : d.order.orderLoadError,
      );
    } finally {
      setRefreshing(false);
    }
  };
  const label =
    order?.status === "CONFIRMED"
      ? d.order.statusConfirmed
      : order?.status === "REJECTED"
        ? d.order.statusRejected
        : d.order.statusPending;
  return (
    <main id="main">
      <section className="order-status container">
        {slug ? <BackLink className="order-status__back" href={`/faza/${slug}`} label={d.order.backToMenu} /> : null}
        <p className="sr-only" role="status" aria-live="polite">
          {announce}
        </p>
        <h1>{order ? d.order.confirmationTitle : d.order.status}</h1>
        {error ? (
          <div className="admin-form__error" role="alert">
            <p>{error}</p>
            <button type="button" className="admin-btn admin-btn--ghost" onClick={() => void refresh()}>
              {d.order.refresh}
            </button>
          </div>
        ) : order ? (
          <>
            <div className={`order-ticket${order.status === "CONFIRMED" ? " order-ticket--confirmed" : ""}`}>
              <div className="order-ticket__head">
                <div>
                  {d.order.confirmationMessage ? (
                    <p className="order-ticket__eyebrow">{d.order.confirmationMessage}</p>
                  ) : null}
                  <p className={`order-status__badge order-status__badge--${order.status.toLowerCase()}`}>{label}</p>
                </div>
                <div className="order-ticket__table">
                  <span>{d.order.tableNumber}</span>
                  <strong>{order.tableNumber}</strong>
                </div>
              </div>
              <div className="order-ticket__lines">
                {order.items.map((item) => {
                  const artItem: MenuItem = {
                    id: item.itemId,
                    name: item.name,
                    description: "",
                    price: item.unitPrice,
                    promotion: null,
                    isAvailable: true,
                    image: item.image ?? undefined,
                  };
                  return (
                    <div className="order-ticket__line" key={item.itemId}>
                      <div className="order-ticket__product">
                        <div className="order-ticket__image">
                          <ItemArt item={artItem} className="order-ticket__image-art" sizes="48px" />
                        </div>
                        <span>
                          <strong>{item.quantity}×</strong> {item.name}
                        </span>
                      </div>
                      <strong>{item.subtotal.toFixed(3)} DT</strong>
                    </div>
                  );
                })}
                {order.offers.map((offer) => {
                  const artItem: MenuItem = {
                    id: offer.offerId,
                    name: offer.name,
                    description: "",
                    price: offer.unitPrice,
                    promotion: null,
                    isAvailable: true,
                    image: offer.image ?? undefined,
                  };
                  return (
                    <div className="order-ticket__line order-ticket__line--offer" key={`offer-${offer.offerId}`}>
                      <div className="order-ticket__product">
                        <div className="order-ticket__image">
                          <ItemArt item={artItem} className="order-ticket__image-art" sizes="48px" />
                        </div>
                        <span>
                          <strong>{offer.quantity}×</strong> {offer.name}{" "}
                          <span className="order-ticket__offer-tag">{d.offer.cartLabel}</span>
                          {offer.lines.length > 0 ? (
                            <small className="order-ticket__offer-lines">
                              {offer.lines
                                .map((line) => `${line.quantity > 1 ? `${line.quantity}× ` : ""}${line.name}`)
                                .join(" · ")}
                            </small>
                          ) : null}
                        </span>
                      </div>
                      <strong>{offer.subtotal.toFixed(3)} DT</strong>
                    </div>
                  );
                })}
              </div>
              <div className="order-ticket__total">
                <span>{d.order.total}</span>
                <strong>{order.total.toFixed(3)} DT</strong>
              </div>
              {order.status === "CONFIRMED" ? (
                <p className="order-status__payment">
                  {order.paymentStatus === "PAID" ? d.order.paymentPaid : d.order.paymentUnpaid}
                </p>
              ) : null}
            </div>
            {sessionOrders.length > 0 ? (
              <div className="order-siblings">
                <div className="order-siblings__head">
                  <h2>{d.order.myOrders}</h2>
                  <Link className="order-siblings__all" href={`/faza/${slug}/orders`}>
                    {d.order.ordersCountLabel(sessionOrders.length)}
                  </Link>
                </div>
                <ul className="order-siblings__list">
                  {sessionOrders.map((item) => (
                    <li key={item.id}>
                      <Link
                        className={`order-siblings__link${item.id === orderId ? " order-siblings__link--current" : ""}`}
                        href={`/faza/${slug}/order/${item.id}`}
                      >
                        <span className={`orders-history__badge orders-history__badge--${item.status.toLowerCase()}`}>
                          {item.status === "CONFIRMED"
                            ? d.order.statusConfirmed
                            : item.status === "REJECTED"
                              ? d.order.statusRejected
                              : d.order.statusPending}
                        </span>
                        <span className="order-siblings__date">{timeFormatter.format(new Date(item.createdAt))}</span>
                        <strong>{formatPrice(item.total, siteConfig.currency, siteConfig.locale)}</strong>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <button
              className={`order-status__refresh${refreshing ? " order-status__refresh--loading" : ""}`}
              type="button"
              onClick={refresh}
              disabled={refreshing}
              aria-label={d.order.refresh}
              title={d.order.refresh}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 11a8.1 8.1 0 0 0-14.7-4.7L4 8" />
                <path d="M4 4v4h4" />
                <path d="M4 13a8.1 8.1 0 0 0 14.7 4.7L20 16" />
                <path d="M20 20v-4h-4" />
              </svg>
            </button>
          </>
        ) : (
          <p>…</p>
        )}
      </section>
    </main>
  );
}
