"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getDictionary } from "@/i18n";
import {
  ApiClientError,
  closeCurrentServiceShift,
  closeTableSession,
  getCurrentServiceShift,
  getTableSession,
  listServiceShifts,
  listTableSessions,
  openServiceShift,
} from "@/lib/api";
import { listOrders, markOrderPaid, updateOrderStatus } from "@/lib/orders";
import type { OrderDto, OrderStatus, ServiceShiftDto, TablePaymentOrderDto, TableSessionDto } from "@/types/backend";
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
  id: string;
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
  const [sessions, setSessions] = useState<TableSessionDto[]>([]);
  const [shiftType, setShiftType] = useState<"MORNING" | "AFTERNOON" | "CUSTOM">("MORNING");
  const [shiftBusy, setShiftBusy] = useState(false);
  const [closeShiftBusy, setCloseShiftBusy] = useState(false);
  const [closeTableBusy, setCloseTableBusy] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Pick<OrderDto, "id" | "tableNumber" | "total"> | null>(null);
  const [tablePayment, setTablePayment] = useState<{
    sessionId: string;
    tableNumber: number;
    orders: TablePaymentOrderDto[];
  } | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [serviceCloseTables, setServiceCloseTables] = useState<OpenServiceTable[] | null>(null);
  const [returnToServiceClose, setReturnToServiceClose] = useState(false);
  const [noActiveServiceOrder, setNoActiveServiceOrder] = useState<string | null>(null);
  const loadOrders = useCallback(() => {
    const status = section === "orders" ? filter : undefined;
    const paymentStatus = section === "orders" && paymentFilter !== "ALL" ? paymentFilter : undefined;
    void listOrders(token, status, paymentStatus)
      .then((result) => setOrders(result.orders))
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, [token, filter, paymentFilter, section]);

  const loadShiftData = useCallback(async () => {
    const generation = ++serviceRefreshSequence;
    try {
      const [shift, list, historyResult] = await Promise.all([
        getCurrentServiceShift(token),
        listTableSessions(token, { status: "ACTIVE" }),
        serviceView === "history"
          ? listServiceShifts(token, "CLOSED", 1, historyRange === "all" ? 50 : 50)
          : Promise.resolve({ shifts: [], total: 0, page: 1, limit: 50 }),
      ]);
      if (generation !== serviceRefreshSequence) return;
      setCurrentShift(shift);
      setSessions(list.sessions.filter((session) => session.status === "ACTIVE"));
      setHistory(historyResult.shifts.filter((item) => item.id !== shift?.id));
    } catch {
      if (generation !== serviceRefreshSequence) return;
      setCurrentShift(null);
      setSessions([]);
      setHistory([]);
    }
  }, [token, serviceView, historyRange]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);
  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadShiftData();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [loadShiftData]);

  const action = async (id: string, status: OrderStatus) => {
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
              typeof table.id === "string" &&
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
    const paymentSessionId = tablePayment?.sessionId ?? null;
    setPaymentBusy(true);
    setError(null);
    try {
      const updated = await markOrderPaid(token, paymentTarget.id);
      setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
      setPaymentTarget(null);
      if (paymentSessionId) {
        const refreshed = await getTableSession(token, paymentSessionId);
        setTablePayment({
          sessionId: refreshed.id,
          tableNumber: refreshed.tableNumber,
          orders: refreshed.summary?.orders ?? [],
        });
      }
      await loadShiftData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'enregistrer le paiement.");
    } finally {
      setPaymentBusy(false);
    }
  };

  const openTablePayment = async (sessionId: string) => {
    const detail = await getTableSession(token, sessionId);
    const tableOrders = detail.summary?.orders ?? [];
    const pending = tableOrders.filter((order) => order.status === "PENDING");
    const unpaid = tableOrders.filter((order) => order.status === "CONFIRMED" && order.paymentStatus === "UNPAID");
    if (pending.length > 0 || unpaid.length > 0) {
      setTablePayment({
        sessionId,
        tableNumber: detail.tableNumber,
        orders: tableOrders,
      });
      return false;
    }
    return true;
  };

  const refreshTablePayment = async (sessionId: string) => {
    const detail = await getTableSession(token, sessionId);
    setTablePayment({
      sessionId: detail.id,
      tableNumber: detail.tableNumber,
      orders: detail.summary?.orders ?? [],
    });
  };

  const handleTableOrderStatus = async (order: TablePaymentOrderDto, status: OrderStatus) => {
    try {
      const updated = await updateOrderStatus(token, order.id, status);
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (tablePayment) await refreshTablePayment(tablePayment.sessionId);
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
        setNoActiveServiceOrder(order.id);
        return;
      }
      setError(e instanceof Error ? e.message : "La commande n'a pas pu être mise à jour.");
    }
  };

  const handleCloseTable = async (sessionId: string) => {
    if (!token || closeTableBusy) return;
    setCloseTableBusy(sessionId);
    try {
      const canClose = await openTablePayment(sessionId);
      if (!canClose) return;
      await closeTableSession(token, sessionId);
      setSessions((current) => current.filter((session) => session.id !== sessionId));
      await loadShiftData();
      if (returnToServiceClose && currentShift?.id) {
        const refreshed = await listTableSessions(token, {
          serviceShiftId: currentShift.id,
          status: "ACTIVE",
        });
        setServiceCloseTables(
          refreshed.sessions.map((table) => ({
            id: table.id,
            tableNumber: table.tableNumber,
            orders: table.orderCount,
            revenue: 0,
          })),
        );
        setReturnToServiceClose(false);
      }
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 409) {
        try {
          await openTablePayment(sessionId);
        } catch {
          setError("La table n'a pas pu être vérifiée. Actualisez les données et réessayez.");
        }
      } else {
        setError(e instanceof Error ? e.message : "La table n'a pas pu être clôturée.");
      }
    } finally {
      setCloseTableBusy(null);
    }
  };

  const tableUnpaidOrders =
    tablePayment?.orders.filter((order) => order.status === "CONFIRMED" && order.paymentStatus === "UNPAID") ?? [];
  const tablePendingOrders = tablePayment?.orders.filter((order) => order.status === "PENDING") ?? [];
  const tableTotal =
    tablePayment?.orders.filter((order) => order.status === "CONFIRMED").reduce((sum, order) => sum + order.total, 0) ??
    0;
  const tablePaid =
    tablePayment?.orders
      .filter((order) => order.status === "CONFIRMED" && order.paymentStatus === "PAID")
      .reduce((sum, order) => sum + order.total, 0) ?? 0;
  const tableRemaining = tableTotal - tablePaid;

  const groupedTables = useMemo(() => {
    const map = new Map<string, { session: TableSessionDto; orders: OrderDto[] }>();
    for (const session of sessions) {
      if (session.status !== "ACTIVE") continue;
      map.set(session.id, { session, orders: [] });
    }
    for (const order of orders) {
      const key = order.tableSessionId ?? `table:${order.tableNumber}`;
      const current = map.get(key);
      if (current) current.orders.push(order);
    }
    return Array.from(map.values()).filter((entry) => entry.orders.length > 0 || entry.session.status === "ACTIVE");
  }, [orders, sessions]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const historicalServices = history.filter((shift) => {
    if (historyRange === "all") return true;
    return shift.openedAt.slice(0, 10) === todayKey;
  });
  const currentSummary = currentShift?.summary;

  return (
    <section className="admin-section">
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
                  <strong>{sessions.length}</strong>Tables actives
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
        groupedTables.length === 0 ? (
          <p className="sheet-state__text">Aucune table active.</p>
        ) : (
          groupedTables.map((entry) => {
            const totalConfirmed = entry.orders
              .filter((order) => order.status === "CONFIRMED")
              .reduce((sum, order) => sum + order.total, 0);
            const totalPaid = entry.orders
              .filter((order) => order.status === "CONFIRMED" && order.paymentStatus === "PAID")
              .reduce((sum, order) => sum + order.total, 0);
            const totalOutstanding = totalConfirmed - totalPaid;
            const totalPending = entry.orders
              .filter((order) => order.status === "PENDING")
              .reduce((sum, order) => sum + order.total, 0);
            return (
              <article className="order-admin-card" key={entry.session.id}>
                <div className="order-admin-card__main">
                  <div className="order-admin-card__meta">
                    <strong className="order-admin-card__table">
                      <span>{serviceDict.tableNumber}</span>
                      {entry.session.tableNumber}
                    </strong>
                    <span className="admin-status admin-status--pending">
                      {entry.orders.length} {serviceDict.tableSummary}
                    </span>
                  </div>
                  <div className="order-admin-card__items">
                    <div className="admin-payment-summary">
                      <span>
                        Confirmé <strong>{totalConfirmed.toFixed(2)} DT</strong>
                      </span>
                      <span>
                        Payé <strong>{totalPaid.toFixed(2)} DT</strong>
                      </span>
                      <span>
                        À payer <strong>{totalOutstanding.toFixed(2)} DT</strong>
                      </span>
                    </div>
                    {entry.orders.map((order) => (
                      <div className="order-admin-card__item" key={order.id}>
                        <strong>{order.status === "CONFIRMED" ? "✓" : order.status === "PENDING" ? "⏳" : "✕"}</strong>
                        <span>{order.total.toFixed(3)} DT</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="order-admin-card__side">
                  <strong>{serviceDict.revenue(totalConfirmed + totalPending)}</strong>
                  <div className="admin-form__actions">
                    {entry.session.id.startsWith("table:") ? null : (
                      <button
                        type="button"
                        className="admin-btn admin-btn--ghost"
                        onClick={() => void handleCloseTable(entry.session.id)}
                        disabled={closeTableBusy === entry.session.id}
                      >
                        {closeTableBusy === entry.session.id ? serviceDict.tableClosed : "Clôturer la table"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )
      ) : null}

      {section === "orders" ? (
        <div className="admin-head" style={{ marginTop: "1.5rem" }}>
          <div className="admin-head__text">
            <h2 className="admin-head__title">{d.title}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
        error ? (
          <p className="admin-form__error">{error}</p>
        ) : orders.length === 0 ? (
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
                    >
                      {d.confirm}
                    </button>
                    <button
                      className="admin-btn admin-btn--danger"
                      type="button"
                      onClick={() => void action(order.id, "REJECTED")}
                    >
                      {d.reject}
                    </button>
                  </div>
                ) : order.status === "CONFIRMED" && order.paymentStatus === "UNPAID" ? (
                  <button
                    className="admin-btn admin-btn--primary"
                    type="button"
                    onClick={() => setPaymentTarget(order)}
                  >
                    Marquer comme payée
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
          className="admin-dialog"
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
              Paiement de la table {tablePayment.tableNumber}
            </h3>
            <p id="table-payment-description" className="admin-dialog__text">
              {tablePendingOrders.length > 0
                ? "Cette table contient des commandes en attente. Refusez-les ou confirmez-les, puis enregistrez leur paiement avant de la clôturer."
                : tableUnpaidOrders.length > 0
                  ? "Cette table contient des commandes non payées. Finalisez les paiements avant de la clôturer."
                  : "Toutes les commandes confirmées de cette table sont payées."}
            </p>
            <div className="admin-table-payment-summary">
              <span>
                Total commandes <strong>{tableTotal.toFixed(3)} DT</strong>
              </span>
              <span>
                Déjà payé <strong>{tablePaid.toFixed(3)} DT</strong>
              </span>
              <span>
                Reste à payer <strong>{tableRemaining.toFixed(3)} DT</strong>
              </span>
            </div>
            <div className="admin-table-payment-list">
              {tablePendingOrders.map((order) => (
                <div className="admin-table-payment-row" key={order.id}>
                  <div>
                    <strong>Commande #{order.id.slice(-6)}</strong>
                    <span>{order.total.toFixed(3)} DT · En attente</span>
                  </div>
                  <div className="admin-form__actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost"
                      onClick={() => void handleTableOrderStatus(order, "REJECTED")}
                      disabled={paymentBusy}
                    >
                      Refuser
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--primary"
                      onClick={() => void handleTableOrderStatus(order, "CONFIRMED")}
                      disabled={paymentBusy}
                    >
                      Confirmer
                    </button>
                  </div>
                </div>
              ))}
              {tablePayment.orders
                .filter((order) => order.status === "CONFIRMED")
                .map((order) => (
                  <div className="admin-table-payment-row" key={order.id}>
                    <div>
                      <strong>Commande #{order.id.slice(-6)}</strong>
                      <span>{order.total.toFixed(3)} DT</span>
                    </div>
                    {order.paymentStatus === "PAID" ? (
                      <span className="admin-payment-state admin-payment-state--paid">✓ Payée</span>
                    ) : (
                      <button
                        type="button"
                        className="admin-btn admin-btn--primary"
                        onClick={() =>
                          setPaymentTarget({
                            id: order.id,
                            tableNumber: order.tableNumber,
                            total: order.total,
                          })
                        }
                        disabled={paymentBusy}
                      >
                        Marquer comme payée
                      </button>
                    )}
                  </div>
                ))}
            </div>
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
                    setTablePayment(null);
                    void handleCloseTable(tablePayment.sessionId);
                  }}
                  disabled={closeTableBusy === tablePayment.sessionId}
                >
                  {closeTableBusy === tablePayment.sessionId ? "Clôture…" : "Clôturer la table"}
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
          className="admin-dialog"
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
                    <div className="admin-service-close-dialog__table" key={table.id}>
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
                          setServiceCloseTables(null);
                          setReturnToServiceClose(true);
                          void handleCloseTable(table.id);
                        }}
                        disabled={closeTableBusy !== null}
                      >
                        {closeTableBusy === table.id ? "Vérification…" : "Clôturer la table"}
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
