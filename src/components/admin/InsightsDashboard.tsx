"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import type { Dictionary } from "@/i18n/dictionary";
import { actionError, isSessionFailure } from "@/lib/admin-errors";
import { buildAnalyticsQuery, INSIGHT_TABS, rangeBoundaries, type InsightTab } from "@/lib/insights";
import type { AnalyticsDto, AnalyticsRange, AnalyticsQuery } from "@/types/backend";

import { InsightsTabBar } from "./insights/InsightsTabBar";
import { ActivityPanel, MenuPanel, OverviewPanel, RevenuePanel } from "./insights/InsightsPanels";

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

const RANGES: AnalyticsRange[] = ["today", "yesterday", "7d", "30d", "this-month", "previous-month", "custom"];

/** The label of a service shift, built from the tracks it belongs to. */
function shiftLabel(option: ShiftOption, d: Dictionary): string {
  const name =
    option.type === "MORNING"
      ? `☀️ ${d.admin.service.morning}`
      : option.type === "AFTERNOON"
        ? `🌤 ${d.admin.service.afternoon}`
        : (option.label ?? option.name ?? d.admin.insights.customService);
  const openedAt = new Date(option.openedAt);
  const status = option.status === "OPEN" ? d.admin.service.statusOpen : d.admin.service.statusClosed;
  if (Number.isNaN(openedAt.getTime())) return `${name} · ${status}`;
  return `${name} · ${openedAt.toLocaleDateString("fr-TN")} à ${openedAt.toLocaleTimeString("fr-TN", {
    hour: "2-digit",
    minute: "2-digit",
  })} · ${status}`;
}

/** A tab panel: only the active one is shown, all of them stay mountable. */
function Panel({ id, active, children }: { id: InsightTab; active: InsightTab; children: ReactNode }) {
  return (
    <div
      className="insights-panel"
      id={`insights-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`insights-tab-${id}`}
      tabIndex={0}
      hidden={active !== id}
    >
      {children}
    </div>
  );
}

/**
 * The analytics of a coffee: the summary, the money, the activity and the menu.
 *
 * Every number comes from the API; every label from the dictionary. The tab
 * state only drives what is shown, never what is fetched: one request feeds
 * the four tabs.
 */
export function InsightsDashboard({ dict, fetchAnalytics, fetchShiftOptions, onSessionExpired, backHref }: Props) {
  const d = dict.admin.insights;
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [draft, setDraft] = useState({ from: "", to: "" });
  const [applied, setApplied] = useState({ from: "", to: "" });
  const [serviceShiftId, setServiceShiftId] = useState("");
  const [serviceOptions, setServiceOptions] = useState<ShiftOption[]>([]);
  const [data, setData] = useState<AnalyticsDto | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<InsightTab>("overview");

  const isCustomRangeReady = range !== "custom" || (applied.from !== "" && applied.to !== "");
  const query = useMemo(
    () => buildAnalyticsQuery(range, applied.from, applied.to, serviceShiftId),
    [range, applied, serviceShiftId],
  );

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
    if (!isCustomRangeReady) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, isCustomRangeReady]);

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

  const rangeLabels: Record<AnalyticsRange, string> = {
    today: d.today,
    yesterday: d.yesterday,
    "7d": d.last7,
    "30d": d.last30,
    "this-month": d.thisMonth,
    "previous-month": d.previousMonth,
    custom: d.custom,
  };
  const tabs = INSIGHT_TABS.map((id) => ({ id, label: d.tabs[id] }));
  const isCustomInvalid = draft.from !== "" && draft.to !== "" && draft.from > draft.to;

  /**
   * A custom period always opens on two dates: the one already typed, or
   * the last seven days. The admin then refines them.
   */
  const changeRange = (value: AnalyticsRange) => {
    setRange(value);
    if (value !== "custom" || (draft.from !== "" && draft.to !== "")) return;
    const bounds = rangeBoundaries("7d");
    const next = { from: bounds.from ?? "", to: bounds.to ?? "" };
    setDraft(next);
    setApplied(next);
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
            onChange={(e) => changeRange(e.target.value as AnalyticsRange)}
          >
            {RANGES.map((value) => (
              <option key={value} value={value}>
                {rangeLabels[value]}
              </option>
            ))}
          </select>
        </label>
        {fetchShiftOptions ? (
          <label className="admin-field">
            <span className="admin-field__label">{d.service}</span>
            <select
              className="admin-field__input"
              value={serviceShiftId}
              onChange={(e) => setServiceShiftId(e.target.value)}
            >
              <option value="">{d.allServices}</option>
              {serviceOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {shiftLabel(option, dict)}
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
                value={draft.from}
                max={draft.to || undefined}
                onChange={(e) => setDraft((current) => ({ ...current, from: e.target.value }))}
              />
            </label>
            <label className="admin-field">
              <span className="admin-field__label">{d.to}</span>
              <input
                className="admin-field__input"
                type="date"
                value={draft.to}
                min={draft.from || undefined}
                onChange={(e) => setDraft((current) => ({ ...current, to: e.target.value }))}
              />
            </label>
            <button
              className="admin-btn admin-btn--primary"
              type="button"
              disabled={!draft.from || !draft.to || isCustomInvalid}
              onClick={() => setApplied({ ...draft })}
            >
              {d.apply}
            </button>
          </>
        ) : null}
      </div>

      <InsightsTabBar tabs={tabs} active={tab} onChange={setTab} label={d.tabs.label} />
      <p className="insights-hint">{d.tabs[`${tab}Hint`]}</p>

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

      {state === "ready" && data ? (
        <>
          {data.kpis.totalOrders.current === 0 ? (
            <div className="admin-notice">
              <h2 className="admin-notice__title">{d.emptyTitle}</h2>
              <p className="admin-notice__text">{d.emptyMessage}</p>
            </div>
          ) : null}
          <Panel id="overview" active={tab}>
            <OverviewPanel data={data} d={d} orders={dict.admin.orders} />
          </Panel>
          <Panel id="revenue" active={tab}>
            <RevenuePanel data={data} d={d} orders={dict.admin.orders} />
          </Panel>
          <Panel id="activity" active={tab}>
            <ActivityPanel data={data} d={d} orders={dict.admin.orders} />
          </Panel>
          <Panel id="menu" active={tab}>
            <MenuPanel data={data} d={d} orders={dict.admin.orders} />
          </Panel>
        </>
      ) : null}
    </section>
  );
}
