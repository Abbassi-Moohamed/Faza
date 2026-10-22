import { metricTrend } from "@/lib/insights";
import type { InsightComparison } from "@/types/backend";

import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  /** The period over the current one, when the indicator can be compared. */
  comparison?: InsightComparison;
  /** The indicator is better when it goes down. */
  inverse?: boolean;
  hint?: string;
};

/** A single indicator: its value, and how it evolved since the previous period. */
export function StatCard({ label, value, comparison, inverse, hint }: Props) {
  const trend = metricTrend({ comparison, inverse });
  return (
    <article className="insights-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      <small
        className={cn(
          "insights-kpi__trend",
          trend.direction === "positive" && "is-positive",
          trend.direction === "negative" && "is-negative",
        )}
      >
        {trend.text}
      </small>
      {hint ? <small className="insights-kpi__hint">{hint}</small> : null}
    </article>
  );
}
