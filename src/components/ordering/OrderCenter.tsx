"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getDictionary } from "@/i18n";
import { ApiClientError } from "@/lib/api";
import { createOrder } from "@/lib/orders";
import {
  cartCount,
  cartEventName,
  cartLinePrice,
  cartTotal,
  readCart,
  writeCart,
  type CartLine,
} from "@/lib/cart";
import { clearTableSession, readTableSession, writeTableSession } from "@/lib/table-session";
import type { MenuItem } from "@/types/menu";
import { ItemArt } from "@/components/menu/ItemArt";

const activeOrderKey = (coffeeSlug: string) => `faza:active-order:${coffeeSlug}`;

interface OrderCenterProps {
  coffeeSlug: string;
  items?: MenuItem[];
}

export function OrderCenter({ coffeeSlug, items = [] }: OrderCenterProps) {
  const d = getDictionary();
  const router = useRouter();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [sessionState, setSessionState] = useState<ReturnType<typeof readTableSession>>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const available = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  useEffect(() => {
    const sync = () => {
      setLines(readCart(coffeeSlug));
      setActiveOrderId(window.localStorage.getItem(activeOrderKey(coffeeSlug)));
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

  const update = (id: string, quantity: number) => {
    const next = quantity <= 0
      ? lines.filter((line) => line.item.id !== id)
      : lines.map((line) => line.item.id === id ? { ...line, quantity } : line);
    setLines(next);
    writeCart(coffeeSlug, next);
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
        const nextSession = { token: order.sessionToken, tableNumber: parsedTable, lastUpdatedAt: new Date().toISOString() };
        writeTableSession(coffeeSlug, nextSession);
        setSessionState(nextSession);
        setTableNumber(String(parsedTable));
      }
      window.localStorage.setItem(activeOrderKey(coffeeSlug), order.id);
      setLines([]);
      setActiveOrderId(order.id);
      setOpen(false);
      router.push(`/faza/${coffeeSlug}/order/${order.id}`);
    } catch (e) {
      const status = e instanceof ApiClientError ? e.status : 0;
      if (status === 401 || status === 404 || status === 400) {
        resetSession();
        setError(d.order.sessionExpired ?? "Votre session de table est terminée. Vous pouvez commencer une nouvelle commande.");
        setOpen(true);
        return;
      }
      setError(e instanceof Error ? e.message : d.order.submitError);
    } finally {
      setBusy(false);
    }
  };

  if (lines.length === 0 && !activeOrderId) return null;

  return (
    <>
      <div className={`order-dock${open ? " order-dock--open" : ""}`} aria-label={d.order.openCart}>
        {lines.length > 0 ? (
          <button className="cart-fab" type="button" onClick={() => setOpen(true)} aria-label={d.order.openCart}>
            <span aria-hidden="true">🛒</span><span>{cartCount(lines)}</span>
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="cart-dialog" role="dialog" aria-modal="true" aria-labelledby="cart-title">
          <button className="cart-dialog__scrim" type="button" aria-label={d.order.closeCart} onClick={() => setOpen(false)} />
          <section className="cart-dialog__panel">
            <div className="admin-head">
              <h2 id="cart-title" className="admin-head__title">{d.order.cartTitle}</h2>
              <button className="sheet__back" type="button" onClick={() => setOpen(false)} aria-label={d.order.closeCart}>×</button>
            </div>
            {sessionState ? (
              <div className="admin-notice" style={{ margin: "0 0 1rem" }}>
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
                    <div className="cart-line__image"><ItemArt item={{ ...line.item, description: "", isAvailable: !unavailable }} className="cart-line__image-art" sizes="56px" /></div>
                    <div><strong>{line.item.name}</strong><small>{cartLinePrice(line).toFixed(3)} DT</small>{unavailable ? <small>{d.menuItem.unavailable}</small> : null}</div>
                  </div>
                  <div className="cart-line__controls">
                    <button type="button" onClick={() => update(line.item.id, line.quantity - 1)} aria-label={d.order.decrease}>−</button>
                    <span>{line.quantity}</span>
                    <button type="button" disabled={unavailable} onClick={() => update(line.item.id, line.quantity + 1)} aria-label={d.order.increase}>+</button>
                  </div>
                </div>
              );
            })}
            <div className="cart-total"><strong>{d.order.total}</strong><strong>{cartTotal(lines).toFixed(3)} DT</strong></div>
            {!sessionState ? (
              <label className="admin-field"><span className="admin-field__label">{d.order.tableNumber}</span><input className="admin-field__input" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} inputMode="numeric" placeholder={d.order.tablePlaceholder} /></label>
            ) : null}
            {error ? <p className="admin-form__error">{error}</p> : null}
            <button className="admin-btn admin-btn--primary" type="button" disabled={busy || lines.length === 0} onClick={() => void submit()}>{busy ? d.order.submitting : d.order.submit}</button>
          </section>
        </div>
      ) : null}
    </>
  );
}
