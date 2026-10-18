"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { siteConfig } from "@/config/site";
import { cartEventName } from "@/lib/cart";

interface HeaderProps {
  viewOrder: string;
}

export function Header({ viewOrder }: HeaderProps) {
  const pathname = usePathname();
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const pathParts = pathname.split("/").filter(Boolean);
  const isAdminPage = pathParts.includes("admin");
  const coffeeSlug =
    pathParts[0] === "faza" && pathParts.length >= 2 && !isAdminPage
      ? pathParts[1]
      : null;

  useEffect(() => {
    if (!coffeeSlug) return;

    const syncOrder = () => {
      setActiveOrderId(window.localStorage.getItem(`faza:active-order:${coffeeSlug}`));
    };
    syncOrder();
    window.addEventListener(cartEventName(), syncOrder);
    window.addEventListener("storage", syncOrder);
    return () => {
      window.removeEventListener(cartEventName(), syncOrder);
      window.removeEventListener("storage", syncOrder);
    };
  }, [coffeeSlug]);

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a className="site-header__brand" href="#top" aria-label={siteConfig.name}>
          <span className="menu-card" aria-hidden="true">
            <span className="menu-card__title">Menu Digitale</span>
          </span>
        </a>
        <span className="site-header__spacer" aria-hidden="true" />
        {activeOrderId && coffeeSlug ? (
          <Link
            className="header-order-link"
            href={`/faza/${coffeeSlug}/order/${activeOrderId}`}
          >
            <span className="header-order-link__icon" aria-hidden="true">📋</span>
            {viewOrder}
          </Link>
        ) : null}
      </div>
    </header>
  );
}