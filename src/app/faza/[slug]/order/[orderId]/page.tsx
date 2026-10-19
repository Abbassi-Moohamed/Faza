"use client";

import { useEffect, useState } from "react";

import { getDictionary } from "@/i18n";
import { getOrder } from "@/lib/orders";
import type { OrderDto } from "@/types/backend";
import { BackLink } from "@/components/layout/BackLink";
import { ItemArt } from "@/components/menu/ItemArt";
import type { MenuItem } from "@/types/menu";

export default function OrderStatusPage({ params }: { params: Promise<{ slug: string; orderId: string }> }) {
  const d = getDictionary();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState(false);
  const [slug, setSlug] = useState("");
  const [orderId, setOrderId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    let active = true;
    void params.then(({ slug: nextSlug, orderId: nextId }) => {
      setSlug(nextSlug);
      setOrderId(nextId);
      return getOrder(nextId)
        .then((value) => {
          if (active) setOrder(value);
        })
        .catch(() => {
          if (active) setError(true);
        });
    });
    return () => {
      active = false;
    };
  }, [params]);
  const refresh = async () => {
    if (!orderId || refreshing) return;
    setRefreshing(true);
    setError(false);
    try {
      const latestOrder = await getOrder(orderId);
      setOrder(latestOrder);
    } catch {
      setError(true);
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
        {slug ? <BackLink className="order-status__back" href={`/faza/${slug}`} label={d.notFound.cta} /> : null}
        <h1>{order ? d.order.confirmationTitle : d.order.status}</h1>
        {error ? (
          <p className="admin-form__error">{d.order.orderNotFound}</p>
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
