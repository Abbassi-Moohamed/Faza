"use client";

import { useState } from "react";

import { bucketLabel, formatMoney } from "@/lib/insights";
import type { Dictionary } from "@/i18n/dictionary";
import type { AnalyticsDto } from "@/types/backend";

import { SectionCard } from "./SectionCard";
import { TrendChart } from "./TrendChart";

type Props = {
  data: AnalyticsDto;
  d: Dictionary["admin"]["insights"];
  /** The identifier of the title — the card is shown on several tabs. */
  headingId: string;
  /** The indicator the chart opens with. */
  initialMetric?: "revenue" | "orders";
};

/**
 * The evolution of the period: the revenue or the volume of orders.
 *
 * The two indicators share the same series, so they share the same card.
 */
export function EvolutionCard({ data, d, headingId, initialMetric = "revenue" }: Props) {
  const [metric, setMetric] = useState<"revenue" | "orders">(initialMetric);
  const isRevenue = metric === "revenue";
  return (
    <SectionCard
      wide
      headingId={headingId}
      eyebrow={d.groups.money}
      title={d.sections.evolution}
      hint={isRevenue ? d.sections.evolutionRevenueHint : d.sections.evolutionOrdersHint}
      actions={
        <div className="insights-segmented" role="group" aria-label={d.sections.evolutionMetric}>
          <button
            className={isRevenue ? "is-active" : ""}
            type="button"
            aria-pressed={isRevenue}
            onClick={() => setMetric("revenue")}
          >
            {d.metrics.confirmedRevenue}
          </button>
          <button
            className={metric === "orders" ? "is-active" : ""}
            type="button"
            aria-pressed={!isRevenue}
            onClick={() => setMetric("orders")}
          >
            {d.metrics.totalOrders}
          </button>
        </div>
      }
    >
      <TrendChart
        points={data.revenueTrend.map((point) => ({
          label: point.bucket,
          value: isRevenue ? point.revenue : point.orders,
        }))}
        formatValue={isRevenue ? (value: number) => formatMoney(value, d.currency) : (value: number) => String(value)}
        formatLabel={bucketLabel}
        ariaLabel={d.sections.evolution}
        emptyMessage={d.noData}
      />
    </SectionCard>
  );
}
