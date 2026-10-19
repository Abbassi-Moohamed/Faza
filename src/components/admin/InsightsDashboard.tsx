"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dictionary } from "@/i18n/dictionary";
import { actionError, isSessionFailure } from "@/lib/admin-errors";
import type { AnalyticsDto, AnalyticsRange, AnalyticsQuery } from "@/types/backend";

type ShiftOption = {
  id: string;
  name: string | null;
  label: string | null;
  type: "MORNING" | "AFTERNOON" | "CUSTOM";
  status: "OPEN" | "CLOSED";
  openedAt: string;
};
type Props = {
  dict: Dictionary;
  fetchAnalytics: (query: AnalyticsQuery) => Promise<AnalyticsDto>;
  fetchShiftOptions?: () => Promise<{ shifts: ShiftOption[] } | ShiftOption[]>;
  onSessionExpired: () => void;
  backHref: string;
};
const ranges: AnalyticsRange[] = ["today", "yesterday", "7d", "30d", "this-month", "previous-month", "custom"];
const date = (value: Date) => value.toISOString().slice(0, 10);
function queryFor(range: AnalyticsRange): AnalyticsQuery {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (range === "today") return { from: date(today), to: date(today) };
  if (range === "yesterday") {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - 1);
    return { from: date(d), to: date(d) };
  }
  if (range === "7d" || range === "30d") {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - (range === "7d" ? 6 : 29));
    return { from: date(d), to: date(today) };
  }
  if (range === "this-month")
    return { from: date(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))), to: date(today) };
  if (range === "previous-month")
    return {
      from: date(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))),
      to: date(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0))),
    };
  return {};
}
const money = (n: number) => `${n.toFixed(2)} DT`;
function change(metric: { changePercent: number | null; trend: string }) {
  return metric.changePercent === null
    ? "—"
    : `${metric.changePercent >= 0 ? "+" : ""}${metric.changePercent.toFixed(1)}%`;
}
function shiftLabel(option: ShiftOption, d: Dictionary["admin"]["service"]) {
  const name =
    option.type === "MORNING"
      ? `☀️ ${d.morning}`
      : option.type === "AFTERNOON"
        ? `🌤 ${d.afternoon}`
        : (option.label ?? option.name ?? "Service personnalisé");
  const openedAt = new Date(option.openedAt);
  const status = option.status === "OPEN" ? "En cours" : "Clôturé";
  if (Number.isNaN(openedAt.getTime())) return `${name} · ${status}`;
  return `${name} · ${openedAt.toLocaleDateString("fr-TN")} à ${openedAt.toLocaleTimeString("fr-TN", {
    hour: "2-digit",
    minute: "2-digit",
  })} · ${status}`;
}

export function InsightsDashboard({ dict, fetchAnalytics, fetchShiftOptions, onSessionExpired, backHref }: Props) {
  const d = dict.admin.insights;
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [serviceShiftId, setServiceShiftId] = useState("");
  const [serviceOptions, setServiceOptions] = useState<ShiftOption[]>([]);
  const [data, setData] = useState<AnalyticsDto | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const query = useMemo(() => {
    const base = range === "custom" ? { from: from || undefined, to: to || undefined } : queryFor(range);
    return { ...base, serviceShiftId: serviceShiftId || undefined };
  }, [range, from, to, serviceShiftId]);
  const load = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      setData(await fetchAnalytics(query));
      setState("ready");
    } catch (e) {
      if (isSessionFailure(e)) {
        onSessionExpired();
        return;
      }
      setError(actionError(dict, e));
      setState("error");
    }
  }, [dict, fetchAnalytics, onSessionExpired, query]);
  useEffect(() => {
    if (range !== "custom") {
      const timer = window.setTimeout(() => void load(), 0);
      return () => window.clearTimeout(timer);
    }
  }, [load, range]);
  useEffect(() => {
    if (!fetchShiftOptions) return;
    void fetchShiftOptions()
      .then((response) => {
        const list = Array.isArray(response) ? response : response.shifts;
        const unique = Array.from(new Map(list.map((option) => [option.id, option])).values());
        setServiceOptions(unique);
      })
      .catch(() => setServiceOptions([]));
  }, [fetchShiftOptions]);
  const labels: Record<AnalyticsRange, string> = {
    today: d.today,
    yesterday: d.yesterday,
    "7d": d.last7,
    "30d": d.last30,
    "this-month": d.thisMonth,
    "previous-month": d.previousMonth,
    custom: d.custom,
  };
  return (
    <section className="insights" aria-labelledby="insights-title">
      <div className="admin-head">
        <Link className="admin-btn admin-btn--ghost insights-back" href={backHref} aria-label={d.back}>
          <span aria-hidden="true">←</span>
          {d.back}
        </Link>
        <div className="admin-head__text">
          <h1 id="insights-title" className="admin-head__title">
            {d.title}
          </h1>
          <p className="admin-head__hint">{d.hint}</p>
        </div>
      </div>
      <div className="insights-filters">
        <label className="admin-field">
          <span className="admin-field__label">{d.range}</span>
          <select
            className="admin-field__input"
            value={range}
            onChange={(e) => setRange(e.target.value as AnalyticsRange)}
          >
            {ranges.map((r) => (
              <option key={r} value={r}>
                {labels[r]}
              </option>
            ))}
          </select>
        </label>
        {fetchShiftOptions ? (
          <label className="admin-field">
            <span className="admin-field__label">Service</span>
            <select
              className="admin-field__input"
              value={serviceShiftId}
              onChange={(e) => setServiceShiftId(e.target.value)}
            >
              <option value="">Tous les services</option>
              {serviceOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {shiftLabel(option, dict.admin.service)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {range === "custom" ? (
          <>
            <label className="admin-field">
              <span className="admin-field__label">{d.from}</span>
              <input
                className="admin-field__input"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="admin-field">
              <span className="admin-field__label">{d.to}</span>
              <input className="admin-field__input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <button
              className="admin-btn admin-btn--primary"
              type="button"
              disabled={!from || !to}
              onClick={() => void load()}
            >
              {d.apply}
            </button>
          </>
        ) : null}
      </div>
      {state === "loading" ? (
        <div className="insights-skeleton" aria-busy="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : null}
      {state === "error" ? (
        <div className="admin-notice">
          <h2 className="admin-notice__title">{d.errorTitle}</h2>
          <p className="admin-notice__text">{error}</p>
          <button className="admin-notice__action" type="button" onClick={() => void load()}>
            {d.retry}
          </button>
        </div>
      ) : null}
      {state === "ready" && data ? <Dashboard data={data} d={d} /> : null}
    </section>
  );
}

function Dashboard({ data, d }: { data: AnalyticsDto; d: Dictionary["admin"]["insights"] }) {
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");
  const hasData = data.kpis.totalOrders.current > 0;
  if (!hasData)
    return (
      <div className="admin-notice">
        <h2 className="admin-notice__title">{d.emptyTitle}</h2>
        <p className="admin-notice__text">{d.emptyMessage}</p>
      </div>
    );
  const cards: Array<[string, string, import("@/types/backend").InsightComparison]> = [
    [d.revenue, money(data.kpis.confirmedRevenue.current), data.kpis.confirmedRevenue],
    [d.paidRevenue, money(data.kpis.paidRevenue.current), data.kpis.paidRevenue],
    [d.outstandingRevenue, money(data.kpis.outstandingRevenue.current), data.kpis.outstandingRevenue],
    [d.paymentRate, `${data.kpis.paymentRate.current.toFixed(1)}%`, data.kpis.paymentRate],
    [d.orders, String(data.kpis.totalOrders.current), data.kpis.totalOrders],
    [d.confirmedOrders, String(data.kpis.confirmedOrders.current), data.kpis.confirmedOrders],
    [d.averageOrder, money(data.kpis.averageConfirmedOrderValue.current), data.kpis.averageConfirmedOrderValue],
    [d.itemsSold, String(data.kpis.itemsSold.current), data.kpis.itemsSold],
  ];
  return (
    <>
      <div className="insights-kpis">
        {cards.map(([label, value, comparison]) => (
          <article className="insights-kpi" key={String(label)}>
            <span>{label}</span>
            <strong>{String(value)}</strong>
            <small className={comparison.trend === "down" ? "is-negative" : "is-positive"}>{change(comparison)}</small>
          </article>
        ))}
      </div>

      <div className="insights-grid">
        <section
          className="insights-card insights-card--wide insights-evolution"
          aria-labelledby="insights-evolution-title"
        >
          <div className="insights-card__header">
            <div>
              <p className="insights-card__eyebrow">Performance</p>
              <h2 id="insights-evolution-title">{d.trend}</h2>
              <p className="insights-card__hint">
                {metric === "revenue" ? "Le chiffre confirmé par période" : "Le volume de commandes par période"}
              </p>
            </div>
            <div className="insights-segmented" role="group" aria-label="Indicateur de l'évolution">
              <button
                className={metric === "revenue" ? "is-active" : ""}
                type="button"
                onClick={() => setMetric("revenue")}
              >
                {d.revenue}
              </button>
              <button
                className={metric === "orders" ? "is-active" : ""}
                type="button"
                onClick={() => setMetric("orders")}
              >
                {d.orders}
              </button>
            </div>
          </div>
          <Chart
            points={data.revenueTrend.map((p) => ({
              label: p.bucket,
              value: metric === "revenue" ? p.revenue : p.orders,
            }))}
            formatValue={metric === "revenue" ? money : (value) => String(value)}
          />
        </section>

        <section className="insights-card insights-availability" aria-labelledby="insights-availability-title">
          <div className="insights-card__header">
            <div>
              <p className="insights-card__eyebrow">Catalogue</p>
              <h2 id="insights-availability-title">{d.availability}</h2>
            </div>
            <strong className="insights-availability__rate">
              {data.availability.availabilityPercentage.toFixed(0)}%
            </strong>
          </div>
          <div
            className="insights-availability__bar"
            role="progressbar"
            aria-valuenow={data.availability.availabilityPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${data.availability.availabilityPercentage.toFixed(0)}% ${d.available}`}
          >
            <span style={{ width: `${data.availability.availabilityPercentage}%` }} />
          </div>
          <div className="insights-availability__legend">
            <span>
              <i className="is-available" />
              {d.available}
              <strong>{data.availability.availableItems}</strong>
            </span>
            <span>
              <i className="is-unavailable" />
              {d.unavailable}
              <strong>{data.availability.unavailableItems}</strong>
            </span>
          </div>
        </section>

        <Rank
          title={d.topItems}
          values={data.topItems.map((i) => ({ name: i.name, value: i.quantitySold, detail: money(i.revenue) }))}
        />
        <Rank
          title={d.peakHours}
          values={data.peakHours.map((i) => ({
            name: `${String(i.hour).padStart(2, "0")}h`,
            value: i.orders,
            detail: `${i.orders}`,
          }))}
        />
        <Rank
          title={d.statuses}
          values={data.statuses.map((i) => ({ name: i.status, value: i.count, detail: `${i.percentage.toFixed(1)}%` }))}
        />
        <article className="insights-card insights-card--wide">
          <h2>{d.actionable}</h2>
          <ul className="insights-actions">
            {data.insights.map((i) => (
              <li key={i.id}>{i.message}</li>
            ))}
          </ul>
        </article>
      </div>
    </>
  );
}
function Chart({
  points,
  formatValue,
}: {
  points: Array<{ label: string; value: number }>;
  formatValue: (value: number) => string;
}) {
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div className="insights-chart" aria-label="Graphique d'évolution">
      <div className="insights-chart__scale">
        <span>{formatValue(max)}</span>
        <span>{formatValue(max / 2)}</span>
        <span>0</span>
      </div>
      <div className="insights-bars">
        {points.length === 0 ? (
          <p className="insights-muted">Aucune donnée sur cette période.</p>
        ) : (
          points.map((p) => (
            <div className="insights-bars__item" key={p.label} title={`${p.label}: ${formatValue(p.value)}`}>
              <span className="insights-bars__value">{formatValue(p.value)}</span>
              <span className="insights-bars__bar" style={{ height: `${Math.max(8, (p.value / max) * 100)}%` }} />
              <span className="insights-bars__label">{p.label.slice(5, 10)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
function Rank({ title, values }: { title: string; values: Array<{ name: string; value: number; detail: string }> }) {
  const max = Math.max(...values.map((v) => v.value), 1);
  return (
    <article className="insights-card">
      <h2>{title}</h2>
      <ol className="insights-ranking">
        {values.slice(0, 5).map((v) => (
          <li key={v.name}>
            <span>{v.name}</span>
            <i>
              <b style={{ width: `${(v.value / max) * 100}%` }} />
            </i>
            <strong>{v.detail}</strong>
          </li>
        ))}
      </ol>
    </article>
  );
}
