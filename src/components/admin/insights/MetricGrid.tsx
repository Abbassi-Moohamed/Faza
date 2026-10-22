import { formatMetric, type InsightMetricKey, type MetricCard } from "@/lib/insights";

import { StatCard } from "./StatCard";

type Props = {
  metrics: MetricCard[];
  /** The label of every indicator, resolved from the dictionary. */
  labels: Record<InsightMetricKey, string>;
  currency: string;
  /** The title of the group the indicators belong to. */
  title?: string;
};

/** A group of indicators, labelled by the family they belong to. */
export function MetricGrid({ metrics, labels, currency, title }: Props) {
  return (
    <div className="insights-metric-group">
      {title ? <h2 className="insights-metric-group__title">{title}</h2> : null}
      <div className="insights-kpis">
        {metrics.map((metric) => (
          <StatCard
            key={metric.key}
            label={labels[metric.key]}
            value={formatMetric(metric.value, metric.format, currency)}
            comparison={metric.comparison}
            inverse={metric.inverse}
          />
        ))}
      </div>
    </div>
  );
}
