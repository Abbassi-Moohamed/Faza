"use client";

import { useCallback, useEffect, useState } from "react";
import { getDictionary } from "@/i18n";
import {
  ApiClientError,
  closeCoffeeTable,
  closeCurrentServiceShift,
  getCurrentServiceShift,
  listCoffeeTables,
  listServiceShifts,
  openServiceShift,
} from "@/lib/api";
import { listOrders, markOrderPaid, updateOrderStatus } from "@/lib/orders";
import { getAdminRealtimeSocket } from "@/lib/realtime";
import {
  orderItemsLabel,
  orderMoment,
  orderStateLabel,
  pendingOrders,
  pendingTableOrders,
  tableTotals,
  totalsFromOrders,
  unpaidOrders,
  unpaidTableOrders,
} from "@/lib/admin-tables";
import type { AdminTableDto, AdminTableOrderDto, OrderDto, OrderStatus, ServiceShiftDto } from "@/types/backend";
import { AdminConfirmDialog } from "./AdminConfirmDialog";

const firstShiftLabel = (shift: ServiceShiftDto | null) => {
  if (!shift) return "";
  if (shift.type === "MORNING") return "☀️ Service du matin";
  if (shift.type === "AFTERNOON") return "🌤 Service de l'après-midi";
  return shift.label ?? shift.name ?? "Service";
};

const serviceDateTime = (value: string, includeDate = true) =>
  new Intl.DateTimeFormat("fr-FR", {
    ...(includeDate ? { dateStyle: "medium" as const } : {}),
    timeStyle: "short",
  }).format(new Date(value));

type OrdersSectionProps = {
  token: string;
  section: "service" | "tables" | "orders";
  onStartService: () => void;
};

type OpenServiceTable = {
  tableNumber: number;
  orders: number;
  revenue: number;
};

let serviceRefreshSequence = 0;

export function OrdersSection({ token, section, onStartService }: OrdersSectionProps) {
  const dict = getDictionary();
  const d = dict.admin.orders;
  const serviceDict = dict.admin.service;
  const [filter, setFilter] = useState<OrderStatus>("PENDING");
  const [paymentFilter, setPaymentFilter] = useState<"ALL" | "PAID" | "UNPAID">("ALL");
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentShift, setCurrentShift] = useState<ServiceShiftDto | null>(null);
  const [history, setHistory] = useState<ServiceShiftDto[]>([]);
  const [serviceView, setServiceView] = useState<"current" | "history">("current");
  const [historyRange, setHistoryRange] = useState<"today" | "all">("today");
  const [tables, setTables] = useState<AdminTableDto[]>([]);
  const [shiftType, setShiftType] = useState<"MORNING" | "AFTERNOON" | "CUSTOM">("MORNING");
  const [shiftBusy, setShiftBusy] = useState(false);
  const [closeShiftBusy, setCloseShiftBusy] = useState(false);
  const [closeTableBusy, setCloseTableBusy] = useState<number | null>(null);
  const [orderBusy, setOrderBusy] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Pick<OrderDto, "id" | "tableNumber" | "total"> | null>(null);
  const [tablePayment, setTablePayment] = useState<{ tableNumber: number; orders: AdminTableOrderDto[] } | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [serviceCloseTables, setServiceCloseTables] = useState<OpenServiceTable[] | null>(null);
  const [returnToServiceClose, setReturnToServiceClose] = useState(false);
  const [noActiveServiceOrder, setNoActiveServiceOrder] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [newOrdersAvailable, setNewOrdersAvailable] = useState(0);
  const loadOrders = useCallback(() => {
    const status = section === "orders" ? filter : undefined;
    const paymentStatus = section === "orders" && paymentFilter !== "ALL" ? paymentFilter : undefined;
    void listOrders(token, status, paymentStatus)
      .then((result) => {
        setOrders(result.orders);
        setNewOrdersAvailable(0);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, [token, filter, paymentFilter, section]);

  const loadShiftData = useCallback(async () => {
    const generation = ++serviceRefreshSequence;
    try {
      const [shift, tableList, historyResult] = await Promise.all([
        getCurrentServiceShift(token),
        listCoffeeTables(token),
        serviceView === "history"
          ? listServiceShifts(token, "CLOSED", 1, 50)
          : Promise.resolve({ shifts: [], total: 0, page: 1, limit: 50 }),
      ]);
      if (generation !== serviceRefreshSequence) return;
      setCurrentShift(shift);
      setTables(tableList.tables);
      setHistory(historyResult.shifts.filter((item) => item.id !== shift?.id));
    } catch {
      if (generation !== serviceRefreshSequence) return;
      setCurrentShift(null);
      setTables([]);
      setHistory([]);
    }
  }, [token, serviceView]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);
  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadShiftData();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [loadShiftData]);

  // Escape closes the dialog on top: an admin on a phone must never be
  // trapped in one. The confirmation dialog handles its own Escape (it sits
  // above the others), so it is left alone here.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || paymentTarget) return;
      if (paymentBusy || closeTableBusy !== null || closeShiftBusy) return;
      if (tablePayment) {
        setTablePayment(null);
        return;
      }
      if (noActiveServiceOrder) {
        setNoActiveServiceOrder(null);
        return;
      }
      if (serviceCloseTables) {
        setServiceCloseTables(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    paymentTarget,
    paymentBusy,
    closeTableBusy,
    closeShiftBusy,
    tablePayment,
    noActiveServiceOrder,
    serviceCloseTables,
  ]);

  // Realtime: receive order:new / order:updated pushed by the backend, and
  // resync over REST on every (re)connect so no event is lost while offline.
  useEffect(() => {
    const socket = getAdminRealtimeSocket(token);
    const matchesCurrentFilters = (order: OrderDto) => {
      // Service/tables sections load every status; only the orders list is filtered.
      if (section !== "orders") return true;
      if (order.status !== filter) return false;
      if (filter === "CONFIRMED" && paymentFilter !== "ALL" && order.paymentStatus !== paymentFilter) return false;
      return true;
    };
    const onNewOrder = (order: OrderDto) => {
      setOrders((current) =>
        current.some((existing) => existing.id === order.id)
          ? current
          : matchesCurrentFilters(order)
            ? [order, ...current]
            : current,
      );
      if (!matchesCurrentFilters(order)) setNewOrdersAvailable((count) => count + 1);
      void loadShiftData();
    };
    const onUpdatedOrder = (order: OrderDto) => {
      setOrders((current) => {
        const exists = current.some((existing) => existing.id === order.id);
        if (!matchesCurrentFilters(order)) return current.filter((existing) => existing.id !== order.id);
        return exists ? current.map((existing) => (existing.id === order.id ? order : existing)) : [order, ...current];
      });
      void loadShiftData();
    };
    const onConnect = () => {
      setLive(true);
      loadOrders();
      void loadShiftData();
    };
    const onDisconnect = () => setLive(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("order:new", onNewOrder);
    socket.on("order:updated", onUpdatedOrder);
    // Sync the indicator if the socket is already connected (e.g. the effect
    // re-ran after a filter change); deferred to keep the effect body free
    // of synchronous setState.
    const syncTimer = window.setTimeout(() => {
      if (socket.connected) setLive(true);
    }, 0);
    return () => {
      window.clearTimeout(syncTimer);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("order:new", onNewOrder);
      socket.off("order:updated", onUpdatedOrder);
    };
  }, [token, filter, paymentFilter, section, loadOrders, loadShiftData]);

  const action = async (id: string, status: OrderStatus) => {
    if (orderBusy) return;
    setOrderBusy(id);
    try {
      await updateOrderStatus(token, id, status);
      loadOrders();
      await loadShiftData();
    } catch (e) {
      if (
        status === "CONFIRMED" &&
        e instanceof ApiClientError &&
        e.status === 409 &&
        typeof e.details === "object" &&
        e.details !== null &&
        "code" in e.details &&
        e.details.code === "NO_ACTIVE_SERVICE"
      ) {
        setNoActiveServiceOrder(id);
        return;
      }
      setError(e instanceof Error ? e.message : "La commande n'a pas pu être mise à jour.");
    } finally {
      setOrderBusy(null);
    }
  };

  const handleOpenShift = async () => {
    if (shiftBusy || !token) return;
    setShiftBusy(true);
    try {
      await openServiceShift(token, {
        type: shiftType,
        name: shiftType === "MORNING" ? serviceDict.morning : serviceDict.afternoon,
      });
      await loadShiftData();
    } finally {
      setShiftBusy(false);
    }
  };

  const handleCloseShift = async () => {
    if (closeShiftBusy || !currentShift) return;
    setCloseShiftBusy(true);
    setError(null);
    try {
      await closeCurrentServiceShift(token);
      await loadShiftData();
      setServiceCloseTables(null);
    } catch (e) {
      if (
        e instanceof ApiClientError &&
        e.status === 409 &&
        typeof e.details === "object" &&
        e.details !== null &&
        "code" in e.details &&
        e.details.code === "OPEN_TABLES_REMAIN" &&
        "tables" in e.details &&
        Array.isArray(e.details.tables)
      ) {
        setServiceCloseTables(
          e.details.tables.filter(
            (table): table is OpenServiceTable =>
              typeof table === "object" &&
              table !== null &&
              typeof table.tableNumber === "number" &&
              typeof table.orders === "number" &&
              typeof table.revenue === "number",
          ),
        );
        return;
      }
      setError(e instanceof Error ? e.message : "Le service n'a pas pu être clôturé.");
    } finally {
      setCloseShiftBusy(false);
    }
  };

  const requestCloseShift = () => {
    void handleCloseShift();
  };

  const handlePayment = async () => {
    if (!paymentTarget || paymentBusy) return;
    const paymentTableNumber = tablePayment?.tableNumber ?? null;
    setPaymentBusy(true);
    setError(null);
    try {
      const updated = await markOrderPaid(token, paymentTarget.id);
      setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
      setPaymentTarget(null);
      if (paymentTableNumber !== null) await refreshTablePayment(paymentTableNumber);
      await loadShiftData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'enregistrer le paiement.");
    } finally {
      setPaymentBusy(false);
    }
  };

  /**
   * Fresh view of a table, straight from the server.
   *
   * The settlement of a table is decided by the server, so the admin UI always
   * works on the current state of the table and never on a stale copy.
   */
  const fetchTable = async (tableNumber: number): Promise<AdminTableDto | null> => {
    const list = await listCoffeeTables(token);
    setTables(list.tables);
    return list.tables.find((table) => table.tableNumber === tableNumber) ?? null;
  };

  const refreshTablePayment = async (tableNumber: number) => {
    const table = await fetchTable(tableNumber);
    if (!table) {
      setTablePayment(null);
      return;
    }
    setTablePayment({ tableNumber, orders: table.orders });
  };

  const handleTableOrderStatus = async (order: AdminTableOrderDto, status: OrderStatus) => {
    if (orderBusy) return;
    setOrderBusy(order.id);
    try {
      const updated = await updateOrderStatus(token, order.id, status);
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      await loadShiftData();
      if (tablePayment) await refreshTablePayment(tablePayment.tableNumber);
    } catch (e) {
      if (
        status === "CONFIRMED" &&
        e instanceof ApiClientError &&
        e.status === 409 &&
        typeof e.details === "object" &&
        e.details !== null &&
        "code" in e.details &&
        e.details.code === "NO_ACTIVE_SERVICE"
      ) {
        setNoActiveServiceOrder(order.id);
        return;
      }
      setError(e instanceof Error ? e.message : "La commande n'a pas pu être mise à jour.");
    } finally {
      setOrderBusy(null);
    }
  };

  /**
   * One order of a table: its state, its date, what was ordered and the
   * amount — plus the single action that can be taken right away.
   *
   * Shared by the table cards and by the settlement sheet so the admin reads
   * the same information in the same place.
   */
  const renderOrderRow = (order: AdminTableOrderDto) => {
    const moment = orderMoment(order.createdAt);
    const state =
      order.status === "PENDING"
        ? "pending"
        : order.status === "REJECTED"
          ? "rejected"
          : order.paymentStatus === "PAID"
            ? "paid"
            : "due";
    const busy = orderBusy === order.id || paymentBusy;
    return (
      <li className="admin-table-order" key={order.id}>
        <div className="admin-table-order__top">
          <span className={`admin-table-order__state admin-table-order__state--${state}`}>
            {orderStateLabel(order)}
          </span>
          <time className="admin-table-order__moment" dateTime={order.createdAt}>
            {moment.date} · {moment.time}
          </time>
        </div>
        <div className="admin-table-order__bottom">
          <span className="admin-table-order__items">{orderItemsLabel(order)}</span>
          <strong className="admin-table-order__total">{order.total.toFixed(3)} DT</strong>
        </div>
        {order.status === "PENDING" ? (
          <div className="admin-table-order__actions">
            <button
              type="button"
              className="admin-btn admin-btn--small admin-btn--primary"
              onClick={() => void handleTableOrderStatus(order, "CONFIRMED")}
              disabled={busy}
            >
              {d.confirm}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--small admin-btn--ghost"
              onClick={() => void handleTableOrderStatus(order, "REJECTED")}
              disabled={busy}
            >
              {d.reject}
            </button>
          </div>
        ) : order.status === "CONFIRMED" && order.paymentStatus !== "PAID" ? (
          <div className="admin-table-order__actions">
            <button
              type="button"
              className="admin-btn admin-btn--small admin-btn--primary"
              onClick={() => setPaymentTarget({ id: order.id, tableNumber: order.tableNumber, total: order.total })}
              disabled={busy}
            >
              {d.collect}
            </button>
          </div>
        ) : null}
      </li>
    );
  };

  const handleCloseTable = async (tableNumber: number) => {
    if (!token || closeTableBusy !== null) return;
    setCloseTableBusy(tableNumber);
    setError(null);
    try {
      const table = await fetchTable(tableNumber);
      if (!table) {
        setError("Cette table n'est plus ouverte.");
        return;
      }
      if (pendingTableOrders(table).length > 0 || unpaidTableOrders(table).length > 0) {
        // Something is left to settle: the dialog shows the orders to settle.
        setTablePayment({ tableNumber, orders: table.orders });
        return;
      }
      await closeCoffeeTable(token, tableNumber);
      setTables((current) => current.filter((item) => item.tableNumber !== tableNumber));
      setTablePayment(null);
      await loadShiftData();
      if (returnToServiceClose) {
        // The table is settled: the service may now be closable.
        setReturnToServiceClose(false);
        void handleCloseShift();
      }
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 409) {
        await refreshTablePayment(tableNumber);
      } else {
        setError(e instanceof Error ? e.message : "La table n'a pas pu être clôturée.");
      }
    } finally {
      setCloseTableBusy(null);
    }
  };

  // Bill of the table being settled: the same math as the table cards, so
  // the admin never reads two different numbers for the same table.
  const sheetTotals = totalsFromOrders(tablePayment?.orders ?? []);
  const tableUnpaidOrders = unpaidOrders(tablePayment?.orders ?? []);
  const tablePendingOrders = pendingOrders(tablePayment?.orders ?? []);
  const tablePaid = sheetTotals.paidRevenue;
  const tableDue = sheetTotals.outstandingRevenue;

  const todayKey = new Date().toISOString().slice(0, 10);
  const historicalServices = history.filter((shift) => {
    if (historyRange === "all") return true;
    return shift.openedAt.slice(0, 10) === todayKey;
  });
  const currentSummary = currentShift?.summary;

  return (
    <section className="admin-section">
      {error ? <p className="admin-form__error">{error}</p> : null}
      {section === "service" ? (
        <div className="service-view-toggle" role="tablist" aria-label="Service">
          <button
            type="button"
            role="tab"
            aria-selected={serviceView === "current"}
            className={serviceView === "current" ? "is-active" : ""}
            onClick={() => setServiceView("current")}
          >
            Service actuel
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={serviceView === "history"}
            className={serviceView === "history" ? "is-active" : ""}
            onClick={() => setServiceView("history")}
          >
            Historique
          </button>
        </div>
      ) : null}

      {section === "service" && serviceView === "current" ? (
        <div className="admin-head">
          <div className="admin-head__text">
            <h2 className="admin-head__title">{serviceDict.currentTitle}</h2>
          </div>
        </div>
      ) : null}

      {section === "service" && serviceView === "current" ? (
        <div className="admin-notice" style={{ marginBottom: "1rem" }}>
          {currentShift ? (
            <>
              <strong>{firstShiftLabel(currentShift)}</strong>
              <div className="service-live-label">● Live · {serviceDict.statusOpen}</div>
              <div className="service-current-metrics">
                <span>
                  <strong>{(currentSummary?.paidRevenue ?? 0).toFixed(3)} DT</strong>Chiffre d&apos;affaires
                </span>
                <span>
                  <strong>{currentSummary?.totalOrders ?? 0}</strong>Commandes
                </span>
                <span>
                  <strong>{tables.length}</strong>Tables actives
                </span>
                <span>
                  <strong>{currentSummary?.paidOrders ?? 0}</strong>Commandes payées
                </span>
              </div>
              <div style={{ marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--danger"
                  onClick={requestCloseShift}
                  disabled={closeShiftBusy}
                >
                  {closeShiftBusy ? serviceDict.closing : serviceDict.closeService}
                </button>
              </div>
            </>
          ) : (
            <>
              <strong>{serviceDict.noShift}</strong>
              <div style={{ marginTop: "0.75rem" }}>
                <label className="admin-field" style={{ marginBottom: 0 }}>
                  <span className="admin-field__label">Type</span>
                  <select
                    className="admin-field__input"
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value as "MORNING" | "AFTERNOON" | "CUSTOM")}
                  >
                    <option value="MORNING">{serviceDict.morning}</option>
                    <option value="AFTERNOON">{serviceDict.afternoon}</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  style={{ marginTop: "0.75rem" }}
                  onClick={() => void handleOpenShift()}
                  disabled={shiftBusy}
                >
                  {shiftBusy ? serviceDict.opening : serviceDict.startService}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {section === "tables" ? (
        <div className="admin-head">
          <div className="admin-head__text">
            <h2 className="admin-head__title">{serviceDict.activeTables}</h2>
          </div>
        </div>
      ) : null}
      {section === "tables" ? (
        tables.length === 0 ? (
          <p className="sheet-state__text">{serviceDict.noOpenTable}</p>
        ) : (
          <div className="admin-table-grid">
            {tables.map((table) => {
              const totals = tableTotals(table);
              const opened = orderMoment(table.openedAt);
              return (
                <article className="admin-table-card" key={table.tableNumber}>
                  <header className="admin-table-card__head">
                    <div className="admin-table-card__identity">
                      <span className="admin-table-card__eyebrow">{serviceDict.tableNumber}</span>
                      <strong className="admin-table-card__number">{table.tableNumber}</strong>
                      {totals.pendingOrders > 0 ? (
                        <span className="admin-table-card__alert">
                          {totals.pendingOrders} {serviceDict.tablePending.toLowerCase()}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="admin-btn admin-btn--primary admin-btn--small"
                      onClick={() => void handleCloseTable(table.tableNumber)}
                      disabled={closeTableBusy !== null}
                    >
                      {closeTableBusy === table.tableNumber ? serviceDict.closingTable : serviceDict.closeTableShort}
                    </button>
                  </header>
                  <dl className="admin-table-card__stats">
                    <div className={totals.outstandingRevenue > 0 ? "is-due" : ""}>
                      <dt>{serviceDict.tableDue}</dt>
                      <dd>
                        {totals.outstandingRevenue.toFixed(3)} <span>DT</span>
                      </dd>
                    </div>
                    <div>
                      <dt>{serviceDict.tableCollected}</dt>
                      <dd>
                        {totals.paidRevenue.toFixed(3)} <span>DT</span>
                      </dd>
                    </div>
                    <div className="admin-table-card__stat--opened">
                      <dt>{serviceDict.tableOpenedOn}</dt>
                      <dd>
                        {opened.date} · {opened.time}
                      </dd>
                    </div>
                  </dl>
                  <ul className="admin-table-card__orders">
                    {table.orders.length === 0 ? (
                      <li className="admin-table-card__empty">{serviceDict.tableNoOrder}</li>
                    ) : (
                      table.orders.map((order) => renderOrderRow(order))
                    )}
                  </ul>
                </article>
              );
            })}
          </div>
        )
      ) : null}

      {section === "orders" ? (
        <div className="admin-head" style={{ marginTop: "1.5rem" }}>
          <div className="admin-head__text">
            <h2 className="admin-head__title">{d.title}</h2>
            <span className={`orders-live${live ? " orders-live--on" : ""}`} role="status">
              <span className="orders-live__dot" aria-hidden="true" />
              {live ? d.live : d.offline}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            {newOrdersAvailable > 0 ? (
              <button type="button" className="orders-new-pill" onClick={() => loadOrders()}>
                ↓ {d.newOrders(newOrdersAvailable)}
              </button>
            ) : null}
            <select
              className="admin-field__input"
              value={filter}
              onChange={(e) => {
                const nextFilter = e.target.value as OrderStatus;
                setFilter(nextFilter);
                if (nextFilter !== "CONFIRMED") setPaymentFilter("ALL");
              }}
            >
              <option value="PENDING">{d.pending}</option>
              <option value="CONFIRMED">{d.confirmed}</option>
              <option value="REJECTED">{d.rejected}</option>
            </select>
            {filter === "CONFIRMED" ? (
              <select
                className="admin-field__input"
                value={paymentFilter}
                aria-label="Filtrer par paiement"
                onChange={(e) => setPaymentFilter(e.target.value as "ALL" | "PAID" | "UNPAID")}
              >
                <option value="ALL">Tous</option>
                <option value="PAID">Payées</option>
                <option value="UNPAID">Non payées</option>
              </select>
            ) : null}
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              aria-label={d.refresh}
              title={d.refresh}
              onClick={() => loadOrders()}
              style={{ minWidth: "2.5rem", padding: "0.45rem 0.7rem" }}
            >
              ↻
            </button>
          </div>
        </div>
      ) : null}
      {section === "orders" ? (
        orders.length === 0 ? (
          <p className="sheet-state__text">{d.empty}</p>
        ) : (
          orders.map((order) => (
            <article className="order-admin-card" key={order.id}>
              <div className="order-admin-card__main">
                <div className="order-admin-card__meta">
                  <strong className="order-admin-card__table">
                    <span>{d.tableNumber}</span>
                    {order.tableNumber}
                  </strong>
                  <span className={`admin-status admin-status--${order.status.toLowerCase()}`}>
                    {order.status === "PENDING" ? d.pending : order.status === "CONFIRMED" ? d.confirmed : d.rejected}
                  </span>
                </div>
                <div className="admin-payment-state">
                  <span>
                    {order.status === "CONFIRMED"
                      ? order.paymentStatus === "PAID"
                        ? "✓ Payée"
                        : "○ Non payée"
                      : "○ Non payée"}
                  </span>
                  {order.paidAt ? (
                    <small>
                      Payée à{" "}
                      {new Date(order.paidAt).toLocaleTimeString("fr-TN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  ) : null}
                </div>
                <div className="order-admin-card__items">
                  {order.items.map((item) => (
                    <div className="order-admin-card__item" key={item.itemId}>
                      <strong>{item.quantity}×</strong>
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="order-admin-card__side">
                <strong>{order.total.toFixed(3)} DT</strong>
                {order.status === "PENDING" ? (
                  <div className="admin-form__actions">
                    <button
                      className="admin-btn admin-btn--primary"
                      type="button"
                      onClick={() => void action(order.id, "CONFIRMED")}
                      disabled={orderBusy !== null}
                    >
                      {d.confirm}
                    </button>
                    <button
                      className="admin-btn admin-btn--danger"
                      type="button"
                      onClick={() => void action(order.id, "REJECTED")}
                      disabled={orderBusy !== null}
                    >
                      {d.reject}
                    </button>
                  </div>
                ) : order.status === "CONFIRMED" && order.paymentStatus !== "PAID" ? (
                  <button
                    className="admin-btn admin-btn--primary"
                    type="button"
                    onClick={() => setPaymentTarget(order)}
                    disabled={paymentBusy}
                  >
                    {d.collect}
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )
      ) : null}

      {section === "service" && serviceView === "history" ? (
        <div className="admin-head" style={{ marginTop: "1.5rem" }}>
          <div className="admin-head__text">
            <h2 className="admin-head__title">{serviceDict.history}</h2>
          </div>
          <div className="service-history-toggle" role="tablist" aria-label="Période historique">
            <button
              type="button"
              className={historyRange === "today" ? "is-active" : ""}
              onClick={() => setHistoryRange("today")}
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              className={historyRange === "all" ? "is-active" : ""}
              onClick={() => setHistoryRange("all")}
            >
              Tous les services
            </button>
          </div>
        </div>
      ) : null}
      {section === "service" && serviceView === "history" ? (
        historicalServices.length === 0 ? (
          <p className="sheet-state__text">
            {historyRange === "today" ? "Aucun service précédent aujourd'hui." : "Aucun historique."}
          </p>
        ) : (
          historicalServices.map((shiftItem) => (
            <article key={shiftItem.id} className="service-history-card">
              <div className="service-history-card__header">
                <div>
                  <strong>{firstShiftLabel(shiftItem)}</strong>
                  <span>
                    {serviceDateTime(shiftItem.openedAt)}
                    {" → "}
                    {shiftItem.closedAt ? serviceDateTime(shiftItem.closedAt, false) : serviceDict.statusOpen}
                  </span>
                </div>
                <span className="admin-status admin-status--closed">
                  {shiftItem.status === "OPEN" ? serviceDict.statusOpen : serviceDict.statusClosed}
                </span>
              </div>
              <div className="service-history-card__revenue">
                <strong>{(shiftItem.summary?.paidRevenue ?? 0).toFixed(3)} DT</strong>
                <span>Chiffre d&apos;affaires</span>
              </div>
              <div className="service-history-card__metrics">
                <span>
                  <strong>{shiftItem.summary?.totalOrders ?? 0}</strong>
                  Commandes
                </span>
                <span>
                  <strong>{shiftItem.summary?.tablesServed ?? 0}</strong>
                  Tables
                </span>
                <span>
                  <strong>{shiftItem.summary?.itemsSold ?? 0}</strong>
                  Articles vendus
                </span>
              </div>
              <div className="service-history-card__secondary">
                <span>
                  Panier moyen{" "}
                  <strong>
                    {shiftItem.summary?.paidOrders
                      ? ((shiftItem.summary.paidRevenue ?? 0) / shiftItem.summary.paidOrders).toFixed(3)
                      : "—"}{" "}
                    DT
                  </strong>
                </span>
                <span>
                  Commandes / table{" "}
                  <strong>
                    {shiftItem.summary?.tablesServed
                      ? ((shiftItem.summary.totalOrders ?? 0) / shiftItem.summary.tablesServed).toFixed(1)
                      : "—"}
                  </strong>
                </span>
              </div>
            </article>
          ))
        )
      ) : null}
      {tablePayment ? (
        <div
          className="admin-dialog admin-dialog--settlement"
          role="dialog"
          aria-modal="true"
          aria-labelledby="table-payment-title"
          aria-describedby="table-payment-description"
        >
          <div
            className="admin-dialog__scrim"
            onClick={paymentBusy ? undefined : () => setTablePayment(null)}
            aria-hidden="true"
          />
          <div className="admin-dialog__card admin-table-payment-dialog">
            <h3 id="table-payment-title" className="admin-dialog__title">
              {serviceDict.settleTable(tablePayment.tableNumber)}
            </h3>
            <p id="table-payment-description" className="admin-dialog__text">
              {tablePendingOrders.length > 0
                ? "Confirmez ou refusez les commandes en attente."
                : tableUnpaidOrders.length > 0
                  ? "Encaissez les commandes confirmées avant de clôturer."
                  : "Toutes les commandes confirmées de cette table sont payées."}
            </p>
            <dl className="admin-table-card__stats admin-table-card__stats--compact">
              <div className={tableDue > 0 ? "is-due" : ""}>
                <dt>{serviceDict.tableDue}</dt>
                <dd>
                  {tableDue.toFixed(3)} <span>DT</span>
                </dd>
              </div>
              <div>
                <dt>{serviceDict.tableCollected}</dt>
                <dd>
                  {tablePaid.toFixed(3)} <span>DT</span>
                </dd>
              </div>
            </dl>
            <ul className="admin-table-card__orders">{tablePayment.orders.map((order) => renderOrderRow(order))}</ul>
            <div className="admin-dialog__actions">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => setTablePayment(null)}
                disabled={paymentBusy}
              >
                Fermer
              </button>
              {tablePendingOrders.length === 0 && tableUnpaidOrders.length === 0 ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={() => {
                    void handleCloseTable(tablePayment.tableNumber);
                  }}
                  disabled={closeTableBusy !== null}
                >
                  {closeTableBusy === tablePayment.tableNumber ? serviceDict.closingTable : serviceDict.closeTable}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {paymentTarget ? (
        <AdminConfirmDialog
          title="Confirmer le paiement ?"
          message={`Commande ${paymentTarget.id.slice(-6)} · Table ${paymentTarget.tableNumber} · ${paymentTarget.total.toFixed(3)} DT. Le client a-t-il bien payé ce montant ?`}
          confirmLabel="Confirmer le paiement"
          cancelLabel="Annuler"
          busyLabel="Enregistrement…"
          busy={paymentBusy}
          onConfirm={() => void handlePayment()}
          onCancel={() => setPaymentTarget(null)}
        />
      ) : null}
      {noActiveServiceOrder ? (
        <div
          className="admin-dialog admin-dialog--confirm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="no-active-service-title"
          aria-describedby="no-active-service-description"
        >
          <div className="admin-dialog__scrim" onClick={() => setNoActiveServiceOrder(null)} aria-hidden="true" />
          <div className="admin-dialog__card">
            <h3 id="no-active-service-title" className="admin-dialog__title">
              Aucun service actif
            </h3>
            <p id="no-active-service-description" className="admin-dialog__text">
              Vous devez commencer un service avant de pouvoir confirmer cette commande.
            </p>
            <div className="admin-dialog__actions">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => setNoActiveServiceOrder(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => {
                  setNoActiveServiceOrder(null);
                  onStartService();
                }}
              >
                Commencer un service
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {serviceCloseTables ? (
        <div
          className="admin-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-close-title"
          aria-describedby="service-close-description"
        >
          <div
            className="admin-dialog__scrim"
            onClick={closeTableBusy ? undefined : () => setServiceCloseTables(null)}
            aria-hidden="true"
          />
          <div className="admin-dialog__card admin-service-close-dialog">
            <h3 id="service-close-title" className="admin-dialog__title">
              Impossible de clôturer le service
            </h3>
            <p id="service-close-description" className="admin-dialog__text">
              Certaines tables sont encore ouvertes. Veuillez d&apos;abord les clôturer.
            </p>
            {serviceCloseTables.length === 0 ? (
              <div className="admin-service-close-dialog__ready">
                <strong>Toutes les tables sont clôturées.</strong>
                <span>Le service peut maintenant être clôturé.</span>
              </div>
            ) : (
              <>
                <strong className="admin-service-close-dialog__label">
                  Tables encore ouvertes ({serviceCloseTables.length})
                </strong>
                <div className="admin-service-close-dialog__tables">
                  {serviceCloseTables.map((table) => (
                    <div className="admin-service-close-dialog__table" key={table.tableNumber}>
                      <div>
                        <strong>Table {table.tableNumber}</strong>
                        <span>
                          {table.orders} commande{table.orders > 1 ? "s" : ""} · {table.revenue.toFixed(3)} DT
                        </span>
                      </div>
                      <button
                        type="button"
                        className="admin-btn admin-btn--primary"
                        onClick={() => {
                          setReturnToServiceClose(true);
                          void handleCloseTable(table.tableNumber);
                        }}
                        disabled={closeTableBusy !== null}
                      >
                        {closeTableBusy === table.tableNumber ? "Vérification…" : serviceDict.closeTable}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="admin-dialog__actions">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => setServiceCloseTables(null)}
                disabled={closeTableBusy !== null}
              >
                Fermer
              </button>
              {serviceCloseTables.length === 0 ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={() => {
                    setServiceCloseTables(null);
                    void handleCloseShift();
                  }}
                  disabled={closeShiftBusy}
                >
                  {closeShiftBusy ? "Clôture…" : "Clôturer le service"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
