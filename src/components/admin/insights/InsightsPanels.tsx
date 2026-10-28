import type { Dictionary } from "@/i18n/dictionary";
import {
  activityMetrics,
  dayKey,
  formatCount,
  formatHour,
  formatMoney,
  formatPercent,
  hourlySeries,
  menuMetrics,
  overviewMetrics,
  revenueMetrics,
  type MetricGroup,
} from "@/lib/insights";
import type { AnalyticsDto, OrderStatus } from "@/types/backend";

import { AvailabilityMeter } from "./AvailabilityMeter";
import { CollectionCard } from "./CollectionCard";
import { DeadStockCard } from "./DeadStockCard";
import { EvolutionCard } from "./EvolutionCard";
import { HighlightList } from "./HighlightList";
import { ItemEngagementCard } from "./ItemEngagementCard";
import { MetricGrid } from "./MetricGrid";
import { PeakSummaryCard } from "./PeakSummaryCard";
import { RankingList } from "./RankingList";
import { SectionCard } from "./SectionCard";
import { StatusBreakdown } from "./StatusBreakdown";
import { TrendChart } from "./TrendChart";

type PanelProps = {
  data: AnalyticsDto;
  d: Dictionary["admin"]["insights"];
  orders: Dictionary["admin"]["orders"];
};

/** The label of an order status, taken from the orders vocabulary. */
function statusLabel(status: OrderStatus, orders: Dictionary["admin"]["orders"]): string {
  if (status === "PENDING") return orders.pending;
  if (status === "CONFIRMED") return orders.confirmed;
  return orders.rejected;
}

/** The families of indicators, each under its own title. */
function Metrics({ groups, d }: { groups: MetricGroup[]; d: Dictionary["admin"]["insights"] }) {
  return (
    <>
      {groups.map((group) => (
        <MetricGrid
          key={group.group}
          title={d.groups[group.group]}
          metrics={group.metrics}
          labels={d.metrics}
          currency={d.currency}
        />
      ))}
    </>
  );
}

/** The executive summary of the period. */
export function OverviewPanel({ data, d }: PanelProps) {
  return (
    <>
      <Metrics groups={overviewMetrics(data)} d={d} />
      <div className="insights-grid">
        <EvolutionCard data={data} d={d} headingId="insights-evolution-overview-title" />
        <HighlightList title={d.sections.highlights} messages={data.insights} emptyMessage={d.noData} />
        <SectionCard wide title={d.sections.limitations} headingId="insights-limitations-title">
          <ul className="insights-list">
            {data.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </>
  );
}

/** The money view: collection, yield and the best slots. */
export function RevenuePanel({ data, d }: PanelProps) {
  const activeHours = hourlySeries(data.hourly).filter((point) => point.orders > 0);
  const tables = [...data.tables].sort((a, b) => b.revenue - a.revenue);
  return (
    <>
      <Metrics groups={revenueMetrics(data)} d={d} />
      <div className="insights-grid">
        <EvolutionCard data={data} d={d} headingId="insights-evolution-revenue-title" />
        <CollectionCard data={data} d={d} />
        <PeakSummaryCard data={data} d={d} />
        <SectionCard eyebrow={d.groups.money} title={d.sections.revenueByHour} headingId="insights-revenue-hour-title">
          <TrendChart
            points={activeHours.map((point) => ({ label: formatHour(point.hour), value: point.revenue }))}
            formatValue={(value) => formatMoney(value, d.currency)}
            formatLabel={(label) => label}
            ariaLabel={d.sections.revenueByHour}
            emptyMessage={d.noData}
          />
        </SectionCard>
        <RankingList
          eyebrow={d.groups.money}
          title={d.sections.revenueByTable}
          entries={tables.map((table) => ({
            key: String(table.tableNumber),
            name: `${d.sections.table} ${table.tableNumber}`,
            value: table.revenue,
            detail: formatMoney(table.revenue, d.currency),
          }))}
          emptyMessage={d.noData}
        />
      </div>
    </>
  );
}

/** The operational view: the flow of orders and the rhythm of the service. */
export function ActivityPanel({ data, d, orders }: PanelProps) {
  const statuses = [...data.statuses].sort((a, b) => b.count - a.count);
  const peakHours = [...data.peakHours].sort((a, b) => b.orders - a.orders);
  const busiestDays = [...data.busiestDays].sort((a, b) => b.orders - a.orders);
  return (
    <>
      <Metrics groups={activityMetrics(data)} d={d} />
      <div className="insights-grid">
        <EvolutionCard data={data} d={d} headingId="insights-evolution-activity-title" initialMetric="orders" />
        <StatusBreakdown
          eyebrow={d.groups.quality}
          title={d.sections.statuses}
          rows={statuses.map((status) => ({
            key: status.status,
            label: statusLabel(status.status, orders),
            count: status.count,
            percentage: status.percentage,
          }))}
          toneOf={(key) => `is-${key.toLowerCase()}`}
          emptyMessage={d.noData}
        />
        <RankingList
          eyebrow={d.groups.volume}
          title={d.sections.peakHours}
          entries={peakHours.map((point) => ({
            key: String(point.hour),
            name: formatHour(point.hour),
            value: point.orders,
            detail: d.sections.ordersCount(point.orders),
          }))}
          emptyMessage={d.noData}
        />
        <RankingList
          eyebrow={d.groups.volume}
          title={d.sections.busiestDays}
          entries={busiestDays.map((day) => ({
            key: String(day.dayOfWeek),
            name: d.days[dayKey(day.dayOfWeek)],
            value: day.orders,
            detail: formatMoney(day.revenue, d.currency),
          }))}
          emptyMessage={d.noData}
        />
      </div>
    </>
  );
}

/** The menu view: the products that sell, those that do not, availability. */
export function MenuPanel({ data, d }: PanelProps) {
  const byRevenue = [...data.topItems].sort((a, b) => b.revenue - a.revenue);
  const byQuantity = [...data.topItems].sort((a, b) => b.quantitySold - a.quantitySold);
  const categories = data.categories.filter((category) => category.revenue > 0);
  return (
    <>
      <Metrics groups={menuMetrics(data)} d={d} />
      <div className="insights-grid">
        <RankingList
          eyebrow={d.groups.catalog}
          title={d.sections.topItemsRevenue}
          entries={byRevenue.map((item) => ({
            key: item.itemId,
            name: item.name,
            value: item.revenue,
            detail: formatMoney(item.revenue, d.currency),
          }))}
          emptyMessage={d.noData}
        />
        <RankingList
          eyebrow={d.groups.catalog}
          title={d.sections.topItemsQuantity}
          entries={byQuantity.map((item) => ({
            key: item.itemId,
            name: item.name,
            value: item.quantitySold,
            detail: formatCount(item.quantitySold),
          }))}
          emptyMessage={d.noData}
        />
        <RankingList
          eyebrow={d.groups.catalog}
          title={d.sections.topCategories}
          entries={categories.map((category) => ({
            key: category.categoryId,
            name: category.categoryName,
            value: category.revenue,
            detail: `${formatMoney(category.revenue, d.currency)} · ${formatPercent(category.percentageOfRevenue, 0)}`,
          }))}
          emptyMessage={d.noData}
        />
        <AvailabilityMeter
          eyebrow={d.groups.catalog}
          title={d.sections.availability}
          available={data.availability.availableItems}
          unavailable={data.availability.unavailableItems}
          percentage={data.availability.availabilityPercentage}
          availableLabel={d.sections.available}
          unavailableLabel={d.sections.unavailable}
        />
        <ItemEngagementCard data={data} d={d} />
        <DeadStockCard data={data} d={d} />
      </div>
    </>
  );
}
