import type { AnalyticsDto, AnalyticsQuery, AnalyticsRange, InsightComparison } from "@/types/backend";

/**
 * Pure helpers for the admin analytics.
 *
 * The dashboard only renders: every computation (period resolution, derived
 * indicators, formatting) lives here so it stays unit-testable and reusable
 * by the coffee admin and the platform admin.
 */

/** The sections of the analytics, in reading order. */
export const INSIGHT_TABS = ["overview", "revenue", "activity", "menu"] as const;
export type InsightTab = (typeof INSIGHT_TABS)[number];

/** Days of the week, in the MongoDB order (1 = Sunday). */
export const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

/** How a metric is written to the screen. */
export type MetricFormat = "money" | "count" | "percent" | "decimal";

/** Every numeric indicator the analytics can display. */
export const INSIGHT_METRIC_KEYS = [
  "confirmedRevenue",
  "paidRevenue",
  "outstandingRevenue",
  "paymentRate",
  "totalOrders",
  "confirmedOrders",
  "pendingOrders",
  "rejectedOrders",
  "averageConfirmedOrderValue",
  "averageItemsPerOrder",
  "itemsSold",
  "rejectionRate",
  "tablesServed",
  "averageTableBill",
  "revenuePerHour",
  "topItemsShare",
  "unsoldItems",
  "availabilityRate",
] as const;
export type InsightMetricKey = (typeof INSIGHT_METRIC_KEYS)[number];

/** A KPI ready to be rendered: the value, how to write it and its trend. */
export interface MetricCard {
  key: InsightMetricKey;
  value: number;
  format: MetricFormat;
  comparison?: InsightComparison;
  /** The indicator is better when it goes down (outstanding revenue, refusals). */
  inverse?: boolean;
}

const HOURS_IN_DAY = 24;

/** Date boundaries of a preset period, in UTC. */
function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The `from`/`to` boundaries of a preset period. */
export function rangeBoundaries(range: AnalyticsRange): { from?: string; to?: string } {
  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (range === "today") return { from: isoDay(today), to: isoDay(today) };
  if (range === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return { from: isoDay(yesterday), to: isoDay(yesterday) };
  }
  if (range === "7d" || range === "30d") {
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - (range === "7d" ? 6 : 29));
    return { from: isoDay(start), to: isoDay(today) };
  }
  if (range === "this-month")
    return { from: isoDay(utcDate(today.getUTCFullYear(), today.getUTCMonth(), 1)), to: isoDay(today) };
  if (range === "previous-month")
    return {
      from: isoDay(utcDate(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)),
      to: isoDay(utcDate(today.getUTCFullYear(), today.getUTCMonth(), 0)),
    };
  return {};
}

/** The query sent to the API for a period and an optional service filter. */
export function buildAnalyticsQuery(
  range: AnalyticsRange,
  from: string,
  to: string,
  serviceShiftId: string,
): AnalyticsQuery {
  const base = range === "custom" ? { from: from || undefined, to: to || undefined } : rangeBoundaries(range);
  return { ...base, serviceShiftId: serviceShiftId || undefined };
}

/* ---- Formatting --------------------------------------------------------- */

/** "12.50 DT" — the money is always written with two decimals. */
export function formatMoney(value: number, currency: string): string {
  return `${value.toFixed(2)} ${currency}`;
}

/** "12.5%" — percentages keep one decimal by default. */
export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/** "1 234" — thousands separated the French way. */
export function formatCount(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

/** "8.0" — a ratio kept to one decimal. */
export function formatDecimal(value: number, digits = 1): string {
  return value.toFixed(digits);
}

/** Writes a metric with the format it was declared with. */
export function formatMetric(value: number, format: MetricFormat, currency: string): string {
  if (format === "money") return formatMoney(value, currency);
  if (format === "percent") return formatPercent(value);
  if (format === "decimal") return formatDecimal(value);
  return formatCount(value);
}

/** "08h" — an hour of the day. */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}h`;
}

/**
 * A trend bucket shortened for a chart axis.
 *
 * The API sends an ISO day ("2026-01-15"), an ISO hour ("2026-01-15T08:00…")
 * or an ISO month ("2026-01"): each one gets the shortest unambiguous label.
 */
export function bucketLabel(bucket: string): string {
  if (bucket.includes("T")) return `${bucket.slice(11, 13)}h`;
  if (bucket.length === 7) return bucket.slice(5, 7);
  return bucket.slice(5, 10);
}

/** The day of the week, in the MongoDB order (1 = Sunday, 7 = Saturday). */
export function dayKey(dayOfWeek: number): DayKey {
  if (!Number.isFinite(dayOfWeek)) return "sunday";
  const index = Math.round(dayOfWeek) - 1;
  return DAY_KEYS[((index % 7) + 7) % 7];
}

/** The direction a trend is read as, once the semantics of the metric apply. */
export type TrendDirection = "positive" | "negative" | "neutral";

/** The trend of a KPI, ready to be shown as a chip. */
export function trendOf(comparison: InsightComparison | undefined): {
  text: string;
  direction: TrendDirection;
} {
  if (!comparison || comparison.changePercent === null) return { text: "—", direction: "neutral" };
  const value = comparison.changePercent;
  return {
    text: `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`,
    direction: value > 0 ? "positive" : value < 0 ? "negative" : "neutral",
  };
}

/**
 * The trend of a card, flipped when going up is bad news.
 *
 * The outstanding revenue or the refusal rate falling is a good sign: the
 * chip must stay green.
 */
export function metricTrend(card: Pick<MetricCard, "comparison" | "inverse">): {
  text: string;
  direction: TrendDirection;
} {
  const trend = trendOf(card.comparison);
  if (!card.inverse || trend.direction === "neutral") return trend;
  return { text: trend.text, direction: trend.direction === "positive" ? "negative" : "positive" };
}

/* ---- Derived indicators ------------------------------------------------- */

/** The 24 hours of the day, completed with the missing ones. */
export function hourlySeries(hourly: AnalyticsDto["hourly"] | undefined): Array<{
  hour: number;
  orders: number;
  revenue: number;
}> {
  const series = Array.from({ length: HOURS_IN_DAY }, (_, hour) => ({ hour, orders: 0, revenue: 0 }));
  for (const point of hourly ?? []) {
    if (point.hour < 0 || point.hour >= HOURS_IN_DAY) continue;
    series[point.hour] = { hour: point.hour, orders: point.orders, revenue: point.revenue };
  }
  return series;
}

/** The busiest hour of the day. */
export function busiestHour(hourly: AnalyticsDto["hourly"] | undefined): {
  hour: number;
  orders: number;
  revenue: number;
} | null {
  const series = hourlySeries(hourly).filter((point) => point.orders > 0);
  if (series.length === 0) return null;
  return series.reduce((best, point) => (point.orders > best.orders ? point : best));
}

/** The busiest slot of the day: `span` consecutive hours with the most revenue. */
export function peakWindow(
  hourly: AnalyticsDto["hourly"] | undefined,
  span = 3,
): { fromHour: number; toHour: number; orders: number; revenue: number } | null {
  const series = hourlySeries(hourly);
  if (series.every((point) => point.orders === 0)) return null;
  let best: { fromHour: number; toHour: number; orders: number; revenue: number } | null = null;
  for (let start = 0; start + span <= HOURS_IN_DAY; start += 1) {
    const window = series.slice(start, start + span);
    const revenue = window.reduce((total, point) => total + point.revenue, 0);
    const orders = window.reduce((total, point) => total + point.orders, 0);
    if (!best || revenue > best.revenue) {
      best = { fromHour: start, toHour: start + span - 1, orders, revenue };
    }
  }
  return best;
}

/**
 * The best day of the week, by revenue.
 *
 * It is the day that brings the most money, not the one with the most
 * orders: a busy day of cheap drinks can weigh less than a calm one.
 */
export function bestDay(busiestDays: AnalyticsDto["busiestDays"] | undefined): {
  dayOfWeek: number;
  orders: number;
  revenue: number;
} | null {
  const days = (busiestDays ?? []).filter((day) => day.orders > 0);
  if (days.length === 0) return null;
  return days.reduce((best, day) => (day.revenue > best.revenue ? day : best));
}

/**
 * Share of the confirmed revenue carried by the top items.
 *
 * The denominator is the whole revenue of the period, not the sum of the
 * listed items: the API caps the list, and a truncated list must not make
 * the concentration look bigger or smaller than it is.
 */
export function topItemsShare(data: AnalyticsDto, limit = 3): number {
  const total = data.kpis.confirmedRevenue.current;
  if (total <= 0) return 0;
  const top = [...(data.topItems ?? [])].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  const share = top.reduce((sum, item) => sum + item.revenue, 0);
  return Math.min(100, (share / total) * 100);
}

/** What the tables of the period look like. */
export function tableStats(tables: AnalyticsDto["tables"] | undefined): {
  tables: number;
  orders: number;
  revenue: number;
  averageBill: number;
} {
  const list = tables ?? [];
  const orders = list.reduce((sum, table) => sum + table.orders, 0);
  const revenue = list.reduce((sum, table) => sum + table.revenue, 0);
  return {
    tables: list.length,
    orders,
    revenue,
    averageBill: orders === 0 ? 0 : revenue / orders,
  };
}

/** Revenue per hour that saw at least one order — the productivity of a slot. */
export function revenuePerHour(data: AnalyticsDto): number {
  const activeHours = hourlySeries(data.hourly).filter((point) => point.orders > 0).length;
  return activeHours === 0 ? 0 : data.kpis.confirmedRevenue.current / activeHours;
}

/** The items of the menu that were never sold during the period. */
export function unsoldItems(data: AnalyticsDto): number {
  return data.deadStock?.unsoldItems ?? 0;
}

/** The share of the menu that is available right now. */
export function availabilityRate(data: AnalyticsDto): number {
  return data.availability?.availabilityPercentage ?? 0;
}

/** The average number of items per confirmed order, with its comparison. */
export function averageItemsPerOrder(data: AnalyticsDto): InsightComparison {
  const declared = data.kpis?.averageItemsPerOrder;
  if (declared) return declared;
  const orders = data.kpis.confirmedOrders.current;
  return {
    current: orders === 0 ? 0 : data.kpis.itemsSold.current / orders,
    previous: 0,
    change: 0,
    changePercent: null,
    trend: "flat",
  };
}

/** The share of refused orders, with its comparison. */
export function rejectionRate(data: AnalyticsDto): InsightComparison {
  const declared = data.kpis?.rejectionRate;
  if (declared) return declared;
  const total = data.kpis.totalOrders.current;
  return {
    current: total === 0 ? 0 : (data.kpis.rejectedOrders / total) * 100,
    previous: 0,
    change: 0,
    changePercent: null,
    trend: "flat",
  };
}

/* ---- Metric groups ------------------------------------------------------ */

/** The family an indicator belongs to — it drives the group it is shown in. */
export type MetricGroupKey = "money" | "volume" | "quality" | "tables" | "catalog" | "performance";

/** A family of indicators, shown under its own title. */
export interface MetricGroup {
  group: MetricGroupKey;
  metrics: MetricCard[];
}

/** The executive summary: money, volume and service quality. */
export function overviewMetrics(data: AnalyticsDto): MetricGroup[] {
  return [
    {
      group: "money",
      metrics: [
        {
          key: "confirmedRevenue",
          value: data.kpis.confirmedRevenue.current,
          format: "money",
          comparison: data.kpis.confirmedRevenue,
        },
        {
          key: "paidRevenue",
          value: data.kpis.paidRevenue.current,
          format: "money",
          comparison: data.kpis.paidRevenue,
        },
        {
          key: "outstandingRevenue",
          value: data.kpis.outstandingRevenue.current,
          format: "money",
          comparison: data.kpis.outstandingRevenue,
          inverse: true,
        },
        {
          key: "paymentRate",
          value: data.kpis.paymentRate.current,
          format: "percent",
          comparison: data.kpis.paymentRate,
        },
      ],
    },
    {
      group: "volume",
      metrics: [
        {
          key: "totalOrders",
          value: data.kpis.totalOrders.current,
          format: "count",
          comparison: data.kpis.totalOrders,
        },
        {
          key: "averageConfirmedOrderValue",
          value: data.kpis.averageConfirmedOrderValue.current,
          format: "money",
          comparison: data.kpis.averageConfirmedOrderValue,
        },
        { key: "itemsSold", value: data.kpis.itemsSold.current, format: "count", comparison: data.kpis.itemsSold },
        {
          key: "rejectionRate",
          value: rejectionRate(data).current,
          format: "percent",
          comparison: rejectionRate(data),
          inverse: true,
        },
      ],
    },
  ];
}

/** The money view: what came in, what is still due and how fast it turns over. */
export function revenueMetrics(data: AnalyticsDto): MetricGroup[] {
  return [
    {
      group: "money",
      metrics: [
        {
          key: "confirmedRevenue",
          value: data.kpis.confirmedRevenue.current,
          format: "money",
          comparison: data.kpis.confirmedRevenue,
        },
        {
          key: "paidRevenue",
          value: data.kpis.paidRevenue.current,
          format: "money",
          comparison: data.kpis.paidRevenue,
        },
        {
          key: "outstandingRevenue",
          value: data.kpis.outstandingRevenue.current,
          format: "money",
          comparison: data.kpis.outstandingRevenue,
          inverse: true,
        },
        {
          key: "paymentRate",
          value: data.kpis.paymentRate.current,
          format: "percent",
          comparison: data.kpis.paymentRate,
        },
      ],
    },
    {
      group: "performance",
      metrics: [
        {
          key: "averageConfirmedOrderValue",
          value: data.kpis.averageConfirmedOrderValue.current,
          format: "money",
          comparison: data.kpis.averageConfirmedOrderValue,
        },
        { key: "revenuePerHour", value: revenuePerHour(data), format: "money" },
        { key: "topItemsShare", value: topItemsShare(data), format: "percent" },
      ],
    },
  ];
}

/** The operational view: the flow of orders, their status and the tables. */
export function activityMetrics(data: AnalyticsDto): MetricGroup[] {
  const tables = tableStats(data.tables);
  return [
    {
      group: "volume",
      metrics: [
        {
          key: "totalOrders",
          value: data.kpis.totalOrders.current,
          format: "count",
          comparison: data.kpis.totalOrders,
        },
        {
          key: "confirmedOrders",
          value: data.kpis.confirmedOrders.current,
          format: "count",
          comparison: data.kpis.confirmedOrders,
        },
        { key: "pendingOrders", value: data.kpis.pendingOrders, format: "count" },
        { key: "rejectedOrders", value: data.kpis.rejectedOrders, format: "count" },
      ],
    },
    {
      group: "quality",
      metrics: [
        {
          key: "averageItemsPerOrder",
          value: averageItemsPerOrder(data).current,
          format: "decimal",
          comparison: averageItemsPerOrder(data),
        },
        {
          key: "rejectionRate",
          value: rejectionRate(data).current,
          format: "percent",
          comparison: rejectionRate(data),
          inverse: true,
        },
      ],
    },
    {
      group: "tables",
      metrics: [
        { key: "tablesServed", value: tables.tables, format: "count" },
        { key: "averageTableBill", value: tables.averageBill, format: "money" },
      ],
    },
  ];
}

/** The menu view: what sells, what does not and what is available. */
export function menuMetrics(data: AnalyticsDto): MetricGroup[] {
  return [
    {
      group: "catalog",
      metrics: [
        { key: "itemsSold", value: data.kpis.itemsSold.current, format: "count", comparison: data.kpis.itemsSold },
        {
          key: "averageItemsPerOrder",
          value: averageItemsPerOrder(data).current,
          format: "decimal",
          comparison: averageItemsPerOrder(data),
        },
        { key: "topItemsShare", value: topItemsShare(data), format: "percent" },
        { key: "unsoldItems", value: unsoldItems(data), format: "count" },
        { key: "availabilityRate", value: availabilityRate(data), format: "percent" },
      ],
    },
  ];
}
