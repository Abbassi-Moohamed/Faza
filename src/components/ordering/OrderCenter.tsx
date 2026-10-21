"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { getDictionary } from "@/i18n";
import { ApiClientError } from "@/lib/api";
import { createOrder } from "@/lib/orders";
import { cartCount, cartEventName, cartLinePrice, cartTotal, readCart, writeCart, type CartLine } from "@/lib/cart";
import { readSessionOrders, rememberSessionOrder } from "@/lib/session-orders";
import { clearTableSession, readTableSession, writeTableSession } from "@/lib/table-session";
import { formatPrice } from "@/lib/menu";
import { siteConfig } from "@/config/site";
import type { MenuItem } from "@/types/menu";
import { ItemArt } from "@/components/menu/ItemArt";
import { CartBubble } from "@/components/ordering/CartBubble";

const activeOrderKey = (coffeeSlug: string) => `faza:active-order:${coffeeSlug}`;
/** Mirrors the cart sheet's closing keyframes in globals.css. */
const CLOSE_ANIMATION_MS = 260;

interface OrderCenterProps {
  coffeeSlug: string;
  items?: MenuItem[];
}

export function OrderCenter({ coffeeSlug, items = [] }: OrderCenterProps) {
  const d = getDictionary();
  const router = useRouter();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [sessionState, setSessionState] = useState<ReturnType<typeof readTableSession>>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const available = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  useEffect(() => {
    const sync = () => {
      setLines(readCart(coffeeSlug));
      setActiveOrderId(window.localStorage.getItem(activeOrderKey(coffeeSlug)));
      setOrderCount(readSessionOrders(coffeeSlug).length);
      const stored = readTableSession(coffeeSlug);
      setSessionState(stored);
      if (stored) {
        setTableNumber(String(stored.tableNumber));
      }
    };
    sync();
    window.addEventListener(cartEventName(), sync);
    return () => window.removeEventListener(cartEventName(), sync);
  }, [coffeeSlug]);

  const closeDialog = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      closingRef.current = false;
      setClosing(false);
      setOpen(false);
    }, CLOSE_ANIMATION_MS);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const update = (id: string, quantity: number) => {
    const next =
      quantity <= 0
        ? lines.filter((line) => line.item.id !== id)
        : lines.map((line) => (line.item.id === id ? { ...line, quantity } : line));
    setLines(next);
    writeCart(coffeeSlug, next);
  };

  const clearAll = () => {
    setLines([]);
    writeCart(coffeeSlug, []);
  };

  const resetSession = () => {
    clearTableSession(coffeeSlug);
    setSessionState(null);
    setTableNumber("");
  };

  const submit = async () => {
    const parsedTable = sessionState ? sessionState.tableNumber : Number(tableNumber.trim());
    const validLines = lines.filter((line) => {
      const currentItem = available.get(line.item.id);
      return currentItem === undefined || currentItem.isAvailable;
    });
    if (!Number.isInteger(parsedTable) || parsedTable < 1 || parsedTable > 10000 || validLines.length === 0) {
      setError(d.order.invalidCheckout);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const order = await createOrder({
        coffeeSlug,
        tableNumber: parsedTable,
        items: validLines.map((line) => ({ itemId: line.item.id, quantity: line.quantity })),
        sessionToken: sessionState?.token,
      });
      writeCart(coffeeSlug, []);
      if (order.sessionToken) {
        const nextSession = {
          token: order.sessionToken,
          tableNumber: parsedTable,
          lastUpdatedAt: new Date().toISOString(),
        };
        writeTableSession(coffeeSlug, nextSession);
        setSessionState(nextSession);
        setTableNumber(String(parsedTable));
      }
      window.localStorage.setItem(activeOrderKey(coffeeSlug), order.id);
      rememberSessionOrder(coffeeSlug, order.id, parsedTable);
      setLines([]);
      setActiveOrderId(order.id);
      setOrderCount(readSessionOrders(coffeeSlug).length);
      closeDialog();
      router.push(`/faza/${coffeeSlug}/order/${order.id}`);
    } catch (e) {
      const status = e instanceof ApiClientError ? e.status : 0;
      // Only an invalid session token means the table session is over: any
      // other failure (invalid basket, unavailable item, unknown menu) must
      // not throw the session — and its history — away.
      if (status === 401) {
        resetSession();
        setError(
          d.order.sessionExpired ?? "Votre session de table est terminée. Vous pouvez commencer une nouvelle commande.",
        );
        setOpen(true);
        return;
      }
      setError(e instanceof Error ? e.message : d.order.submitError);
    } finally {
      setBusy(false);
    }
  };

  if (lines.length === 0 && !activeOrderId && orderCount === 0) return null;

  const count = cartCount(lines);
  const total = formatPrice(cartTotal(lines), siteConfig.currency, siteConfig.locale);

  return (
    <>
      {count > 0 ? (
        <CartBubble
          count={count}
          label={`${d.order.openCart} · ${d.sheet.itemsCountLabel(count)} · ${total}`}
          sheetOpen={open}
          onOpen={() => setOpen(true)}
        />
      ) : null}

      {orderCount > 0 ? (
        <Link className="orders-entry" href={`/faza/${coffeeSlug}/orders`} aria-label={d.order.myOrders}>
          <svg
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
          <span>{d.order.myOrders}</span>
          <strong>{orderCount}</strong>
        </Link>
      ) : null}

      {open ? (
        <div
          className={`cart-dialog${closing ? " cart-dialog--closing" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-title"
        >
          <button className="cart-dialog__scrim" type="button" aria-label={d.order.closeCart} onClick={closeDialog} />
          <section className="cart-dialog__panel" ref={panelRef} tabIndex={-1}>
            <div className="cart-dialog__body">
              <div className="cart-sheet__grip" aria-hidden="true" />
              <div className="admin-head">
                <h2 id="cart-title" className="admin-head__title">
                  {d.order.cartTitle}
                </h2>
                <button className="sheet__back" type="button" onClick={closeDialog} aria-label={d.order.closeCart}>
                  ×
                </button>
              </div>
              {sessionState ? (
                <div className="admin-notice" style={{ margin: "0 0 0.25rem" }}>
                  <strong>{`Table ${sessionState.tableNumber}`}</strong>
                  <div>{d.order.sessionInProgress}</div>
                </div>
              ) : null}
              {lines.map((line) => {
                const item = available.get(line.item.id);
                const unavailable = item !== undefined && !item.isAvailable;
                return (
                  <div className={`cart-line${unavailable ? " cart-line--unavailable" : ""}`} key={line.item.id}>
                    <div className="cart-line__product">
                      <div className="cart-line__image">
                        <ItemArt
                          item={{ ...line.item, description: "", isAvailable: !unavailable }}
                          className="cart-line__image-art"
                          sizes="56px"
                        />
                      </div>
                      <div>
                        <strong>{line.item.name}</strong>
                        <small>
                          {formatPrice(cartLinePrice(line) * line.quantity, siteConfig.currency, siteConfig.locale)}
                        </small>
                        {unavailable ? <small>{d.menuItem.unavailable}</small> : null}
                      </div>
                    </div>
                    <div className="cart-line__controls">
                      <button
                        type="button"
                        onClick={() => update(line.item.id, line.quantity - 1)}
                        aria-label={d.order.decrease}
                      >
                        −
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        disabled={unavailable}
                        onClick={() => update(line.item.id, line.quantity + 1)}
                        aria-label={d.order.increase}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="cart-total">
                <strong>{d.order.total}</strong>
                <strong>{total}</strong>
              </div>
              {lines.length > 1 ? (
                <button className="cart-sheet__clear" type="button" onClick={clearAll}>
                  {d.order.clearCart}
                </button>
              ) : null}
            </div>
            <div className="cart-dialog__footer">
              {error ? <p className="admin-form__error">{error}</p> : null}
              {!sessionState ? (
                <label className="admin-field">
                  <span className="admin-field__label">{d.order.tableNumber}</span>
                  <input
                    className="admin-field__input"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    inputMode="numeric"
                    placeholder={d.order.tablePlaceholder}
                  />
                </label>
              ) : null}
              <button
                className="cart-sheet__cta"
                type="button"
                disabled={busy || lines.length === 0}
                onClick={() => void submit()}
              >
                <span>{busy ? d.order.submitting : d.order.submit}</span>
                <span className="cart-sheet__cta-total">{total}</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
