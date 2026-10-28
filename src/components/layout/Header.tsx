"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { siteConfig } from "@/config/site";
import { cartEventName } from "@/lib/cart";
import { readSessionOrders } from "@/lib/session-orders";

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

    const syncOrders = () => {
      setOrderCount(readSessionOrders(coffeeSlug).length);
    };
    syncOrders();
    window.addEventListener(cartEventName(), syncOrders);
    window.addEventListener("storage", syncOrders);
    return () => {
      window.removeEventListener(cartEventName(), syncOrders);
      window.removeEventListener("storage", syncOrders);
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
