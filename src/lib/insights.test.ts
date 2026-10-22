import { afterEach, describe, expect, it, vi } from "vitest";

import {
  activityMetrics,
  averageItemsPerOrder,
  availabilityRate,
  bestDay,
  bucketLabel,
  buildAnalyticsQuery,
  busiestHour,
  dayKey,
  formatCount,
  formatHour,
  formatMetric,
  formatMoney,
  formatPercent,
  hourlySeries,
  menuMetrics,
  metricTrend,
  overviewMetrics,
  peakWindow,
  rangeBoundaries,
  rejectionRate,
  revenueMetrics,
  revenuePerHour,
  tableStats,
  topItemsShare,
  trendOf,
  unsoldItems,
} from "@/lib/insights";
import type { AnalyticsDto, InsightComparison } from "@/types/backend";

const comparison = (current: number, previous: number, changePercent: number | null): InsightComparison => ({
  current,
  previous,
  change: current - previous,
  changePercent,
  trend: current > previous ? "up" : current < previous ? "down" : "flat",
});

/** A complete payload: each test overrides only what it is about. */
const analytics = (overrides: Partial<AnalyticsDto> = {}): AnalyticsDto => ({
  scope: "coffee",
  timezone: "UTC",
  period: { from: "2026-01-08", to: "2026-01-14", granularity: "day" },
  comparisonPeriod: { from: "2026-01-01", to: "2026-01-07" },
  kpis: {
    confirmedRevenue: comparison(300, 200, 50),
    paidRevenue: comparison(200, 200, 0),
    outstandingRevenue: comparison(100, 50, 100),
    paymentRate: comparison(66.7, 80, -16.6),
    totalOrders: comparison(10, 8, 25),
    confirmedOrders: comparison(8, 6, 33.3),
    pendingOrders: 1,
    rejectedOrders: 1,
    averageConfirmedOrderValue: comparison(37.5, 33.3, 12.6),
    itemsSold: comparison(20, 16, 25),
    averageItemsPerOrder: comparison(2.5, 2.7, -7.4),
    rejectionRate: comparison(10, 20, -50),
  },
  revenueTrend: [
    { bucket: "2026-01-08", revenue: 120, orders: 4 },
    { bucket: "2026-01-09", revenue: 180, orders: 6 },
  ],
  orderTrend: [
    { bucket: "2026-01-08", revenue: 120, orders: 4 },
    { bucket: "2026-01-09", revenue: 180, orders: 6 },
  ],
  topItems: [
    { itemId: "a", name: "Espresso", quantitySold: 10, revenue: 100 },
    { itemId: "b", name: "Cappuccino", quantitySold: 8, revenue: 60 },
    { itemId: "c", name: "Citronnade", quantitySold: 5, revenue: 30 },
    { itemId: "d", name: "Thé", quantitySold: 2, revenue: 10 },
  ],
  categories: [
    { categoryId: "cat-1", categoryName: "Cafés", quantitySold: 18, revenue: 160, percentageOfRevenue: 80 },
    { categoryId: "cat-2", categoryName: "Jus", quantitySold: 5, revenue: 30, percentageOfRevenue: 15 },
  ],
  peakHours: [
    { hour: 10, orders: 2 },
    { hour: 11, orders: 3 },
    { hour: 12, orders: 1 },
  ],
  hourly: [
    { hour: 10, orders: 2, revenue: 30 },
    { hour: 11, orders: 3, revenue: 40 },
    { hour: 12, orders: 1, revenue: 50 },
  ],
  busiestDays: [
    { dayOfWeek: 1, orders: 4, revenue: 100 },
    { dayOfWeek: 5, orders: 6, revenue: 200 },
  ],
  statuses: [
    { status: "CONFIRMED", count: 8, percentage: 80 },
    { status: "PENDING", count: 1, percentage: 10 },
    { status: "REJECTED", count: 1, percentage: 10 },
  ],
  promotions: {
    unitsSoldAtPromotionalPrice: 0,
    promotedSalesRevenue: 0,
    promotedItemsSold: 0,
    discountAmount: null,
    historicalRegularPriceAvailable: false,
  },
  availability: {
    availableItems: 9,
    unavailableItems: 1,
    availabilityPercentage: 90,
    historicalRateAvailable: false,
  },
  deadStock: {
    unsoldItems: 2,
    items: [{ itemId: "d", name: "Thé", categoryName: "Boissons chaudes", price: 2.5 }],
  },
  tables: [
    { tableNumber: 2, orders: 3, revenue: 120 },
    { tableNumber: 5, orders: 2, revenue: 80 },
  ],
  insights: [{ id: "best-day", message: "Vendredi est votre meilleur jour.", kind: "positive" }],
  limitations: ["Les catégories viennent de la carte actuelle."],
  ...overrides,
});

afterEach(() => {
  vi.useRealTimers();
});

describe("analytics periods", () => {
  it("resolves the boundaries of a preset period in UTC", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T23:30:00.000Z"));

    expect(rangeBoundaries("today")).toEqual({ from: "2026-01-15", to: "2026-01-15" });
    expect(rangeBoundaries("yesterday")).toEqual({ from: "2026-01-14", to: "2026-01-14" });
    expect(rangeBoundaries("7d")).toEqual({ from: "2026-01-09", to: "2026-01-15" });
    expect(rangeBoundaries("30d")).toEqual({ from: "2025-12-17", to: "2026-01-15" });
    expect(rangeBoundaries("this-month")).toEqual({ from: "2026-01-01", to: "2026-01-15" });
    expect(rangeBoundaries("previous-month")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
    expect(rangeBoundaries("custom")).toEqual({});
  });

  it("builds the query of a preset or a custom period", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T10:00:00.000Z"));

    expect(buildAnalyticsQuery("7d", "", "", "")).toEqual({ from: "2026-01-09", to: "2026-01-15" });
    expect(buildAnalyticsQuery("custom", "2026-01-01", "2026-01-05", "shift-1")).toEqual({
      from: "2026-01-01",
      to: "2026-01-05",
      serviceShiftId: "shift-1",
    });
    expect(buildAnalyticsQuery("custom", "", "", "")).toEqual({ from: undefined, to: undefined });
  });
});

describe("analytics formatting", () => {
  it("writes money, percentages, counts and hours", () => {
    expect(formatMoney(12.5, "DT")).toBe("12.50 DT");
    expect(formatPercent(12.345)).toBe("12.3%");
    expect(formatPercent(12.345, 0)).toBe("12%");
    expect(formatCount(1234)).toBe("1\u202f234");
    expect(formatHour(8)).toBe("08h");
    expect(bucketLabel("2026-01-15")).toBe("01-15");
    expect(bucketLabel("2026-01-15T08:00:00.000Z")).toBe("08h");
    expect(bucketLabel("2026-01")).toBe("01");
    expect(formatMetric(1200, "count", "DT")).toBe("1\u202f200");
    expect(formatMetric(1200, "money", "DT")).toBe("1200.00 DT");
  });

  it("maps a MongoDB day of the week to its key", () => {
    expect(dayKey(1)).toBe("sunday");
    expect(dayKey(2)).toBe("monday");
    expect(dayKey(6)).toBe("friday");
    expect(dayKey(7)).toBe("saturday");
    expect(dayKey(8)).toBe("sunday");
  });
});

describe("analytics trends", () => {
  it("reads the trend of a comparison", () => {
    expect(trendOf(comparison(120, 100, 20))).toEqual({ text: "+20.0%", direction: "positive" });
    expect(trendOf(comparison(80, 100, -20))).toEqual({ text: "-20.0%", direction: "negative" });
    expect(trendOf(undefined)).toEqual({ text: "—", direction: "neutral" });
    expect(trendOf(comparison(0, 0, null))).toEqual({ text: "—", direction: "neutral" });
  });

  it("keeps a falling bad indicator green", () => {
    const falling = { comparison: comparison(10, 20, -50), inverse: true };
    expect(metricTrend(falling)).toEqual({ text: "-50.0%", direction: "positive" });
    const rising = { comparison: comparison(20, 10, 100), inverse: true };
    expect(metricTrend(rising)).toEqual({ text: "+100.0%", direction: "negative" });
    expect(metricTrend({ comparison: comparison(10, 20, -50) }).direction).toBe("negative");
  });
});

describe("analytics derived indicators", () => {
  it("completes the hourly series and finds the busiest moments", () => {
    const series = hourlySeries(analytics().hourly);
    expect(series).toHaveLength(24);
    expect(series[11]).toEqual({ hour: 11, orders: 3, revenue: 40 });
    expect(series[0]).toEqual({ hour: 0, orders: 0, revenue: 0 });
    expect(busiestHour(analytics().hourly)).toEqual({ hour: 11, orders: 3, revenue: 40 });
    expect(busiestHour([])).toBeNull();
  });

  it("finds the three-hour window with the most revenue", () => {
    expect(peakWindow(analytics().hourly)).toEqual({ fromHour: 10, toHour: 12, orders: 6, revenue: 120 });
    expect(peakWindow([])).toBeNull();
  });

  it("finds the best day and the revenue of an active hour", () => {
    expect(bestDay(analytics().busiestDays)).toEqual({ dayOfWeek: 5, orders: 6, revenue: 200 });
    // A busy day of cheap drinks weighs less than a calm one: revenue wins.
    expect(
      bestDay([
        { dayOfWeek: 2, orders: 10, revenue: 50 },
        { dayOfWeek: 6, orders: 4, revenue: 400 },
      ]),
    ).toEqual({ dayOfWeek: 6, orders: 4, revenue: 400 });
    expect(bestDay([])).toBeNull();
    expect(revenuePerHour(analytics())).toBe(100);
  });

  it("measures the concentration of the revenue", () => {
    // The top three (100 + 60 + 30) against the confirmed revenue (300).
    expect(topItemsShare(analytics())).toBeCloseTo(63.33, 2);
    expect(topItemsShare(analytics(), 2)).toBeCloseTo(53.33, 2);
    expect(topItemsShare(analytics({ topItems: [] }))).toBe(0);
    expect(topItemsShare(analytics({ kpis: { ...analytics().kpis, confirmedRevenue: comparison(0, 0, null) } }))).toBe(
      0,
    );
  });

  it("sums the tables of the period", () => {
    expect(tableStats(analytics().tables)).toEqual({ tables: 2, orders: 5, revenue: 200, averageBill: 40 });
    expect(tableStats([])).toEqual({ tables: 0, orders: 0, revenue: 0, averageBill: 0 });
  });

  it("reads the catalogue indicators of the payload", () => {
    const data = analytics();
    expect(unsoldItems(data)).toBe(2);
    expect(availabilityRate(data)).toBe(90);
    expect(averageItemsPerOrder(data).current).toBe(2.5);
    expect(rejectionRate(data).current).toBe(10);
  });

  it("derives the new indicators when an older backend omits them", () => {
    const data = analytics();
    const legacy = {
      ...data,
      kpis: { ...data.kpis, averageItemsPerOrder: undefined, rejectionRate: undefined },
      deadStock: undefined,
      hourly: undefined,
    } as unknown as AnalyticsDto;

    expect(averageItemsPerOrder(legacy)).toMatchObject({ current: 2.5, changePercent: null });
    expect(rejectionRate(legacy)).toMatchObject({ current: 10, changePercent: null });
    expect(unsoldItems(legacy)).toBe(0);
    expect(hourlySeries(legacy.hourly)).toHaveLength(24);
    expect(revenuePerHour(legacy)).toBe(0);
  });
});

describe("analytics metric groups", () => {
  it("splits the summary into money and volume", () => {
    const groups = overviewMetrics(analytics());
    expect(groups.map((group) => group.group)).toEqual(["money", "volume"]);
    expect(groups[0].metrics.map((metric) => metric.key)).toEqual([
      "confirmedRevenue",
      "paidRevenue",
      "outstandingRevenue",
      "paymentRate",
    ]);
    expect(groups[1].metrics.map((metric) => metric.key)).toContain("rejectionRate");
  });

  it("flags the indicators that are better when they fall", () => {
    const metrics = [
      ...overviewMetrics(analytics()).flatMap((group) => group.metrics),
      ...revenueMetrics(analytics()).flatMap((group) => group.metrics),
      ...activityMetrics(analytics()).flatMap((group) => group.metrics),
      ...menuMetrics(analytics()).flatMap((group) => group.metrics),
    ];
    const inverse = new Set(metrics.filter((metric) => metric.inverse).map((metric) => metric.key));
    expect(inverse).toEqual(new Set(["outstandingRevenue", "rejectionRate"]));
  });

  it("keeps every indicator of a tab in a known group", () => {
    const groups = [...revenueMetrics(analytics()), ...activityMetrics(analytics()), ...menuMetrics(analytics())];
    expect(groups.map((group) => group.group)).toEqual([
      "money",
      "performance",
      "volume",
      "quality",
      "tables",
      "catalog",
    ]);
    for (const group of groups) expect(group.metrics.length).toBeGreaterThan(0);
  });
});
