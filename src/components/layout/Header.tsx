"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { siteConfig } from "@/config/site";
import { ApiClientError } from "@/lib/api";
import { cartEventName } from "@/lib/cart";
import { listSessionOrders } from "@/lib/orders";
import { clearTableSession, readTableSession, tableSessionEventName } from "@/lib/table-session";
import { sessionOrdersEventName } from "@/lib/session-orders";

interface HeaderProps {
  myOrdersLabel: string;
  brandLabel: string;
}

export function Header({ myOrdersLabel, brandLabel }: HeaderProps) {
  const pathname = usePathname();
  const [orderCount, setOrderCount] = useState(0);
  const pathParts = pathname.split("/").filter(Boolean);
  const isAdminPage = pathParts.includes("admin");
  const coffeeSlug = pathParts[0] === "faza" && pathParts.length >= 2 && !isAdminPage ? pathParts[1] : null;
  const onHistoryPage = pathParts[pathParts.length - 1] === "orders";

  useEffect(() => {
    if (!coffeeSlug) return;

    let active = true;
    let syncing = false;
    const syncOrders = async () => {
      if (syncing) return;
      syncing = true;
      const session = readTableSession(coffeeSlug);
      if (!session) {
        if (active) setOrderCount(0);
        syncing = false;
        return;
      }

      try {
        const result = await listSessionOrders(session.token);
        if (!active) return;
        if (result.session.status === "CLOSED") {
          clearTableSession(coffeeSlug);
          setOrderCount(0);
        } else {
          setOrderCount(result.session.orderCount);
        }
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiClientError && error.status === 401) {
          clearTableSession(coffeeSlug);
          setOrderCount(0);
        }
      } finally {
        syncing = false;
      }
    };
    const onSessionChange = (event: Event) => {
      const detail = (event as CustomEvent<{ coffeeSlug?: string }>).detail;
      if (detail?.coffeeSlug === coffeeSlug) void syncOrders();
    };
    const onVisibilityChange = () => {
      if (!document.hidden) void syncOrders();
    };
    void syncOrders();
    const timer = window.setInterval(() => void syncOrders(), 15_000);
    window.addEventListener(cartEventName(), syncOrders);
    window.addEventListener("storage", syncOrders);
    window.addEventListener(tableSessionEventName(), onSessionChange);
    const onOrdersChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ coffeeSlug?: string }>).detail;
      if (detail?.coffeeSlug === coffeeSlug) void syncOrders();
    };
    window.addEventListener(sessionOrdersEventName(), onOrdersChanged);
    window.addEventListener("focus", syncOrders);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(cartEventName(), syncOrders);
      window.removeEventListener("storage", syncOrders);
      window.removeEventListener(tableSessionEventName(), onSessionChange);
      window.removeEventListener(sessionOrdersEventName(), onOrdersChanged);
      window.removeEventListener("focus", syncOrders);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [coffeeSlug, pathname]);

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a className="site-header__brand" href="#top" aria-label={siteConfig.name}>
          <span className="menu-card" aria-hidden="true">
            <span className="menu-card__title">{brandLabel}</span>
          </span>
        </a>
        <span className="site-header__spacer" aria-hidden="true" />
        {coffeeSlug && !onHistoryPage ? (
          <Link className="header-orders-link" href={`/faza/${coffeeSlug}/orders`} aria-label={myOrdersLabel}>
            <svg
              className="header-orders-link__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
              <path d="M9 7h6M9 11h6M9 15h3" />
            </svg>
            <span className="header-orders-link__label">{myOrdersLabel}</span>
            {orderCount > 0 ? <strong className="header-orders-link__count">{orderCount}</strong> : null}
          </Link>
        ) : null}
      </div>
    </header>
  );
}
