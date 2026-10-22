type Point = { label: string; value: number };

type Props = {
  points: Point[];
  formatValue: (value: number) => string;
  /** The accessible name of the chart. */
  ariaLabel: string;
  /** The message shown when the period holds no point. */
  emptyMessage: string;
  /** How the label of a bucket is shortened under its bar. */
  formatLabel?: (label: string) => string;
};

/**
 * A bar chart of a time series.
 *
 * It stays dependency-free on purpose: the analytics must render on the
 * first paint, without downloading a charting library.
 */
export function TrendChart({ points, formatValue, ariaLabel, emptyMessage, formatLabel }: Props) {
  const max = Math.max(...points.map((point) => point.value), 1);
  const labelOf = formatLabel ?? ((label: string) => label);
  return (
    <div className="insights-chart" role="img" aria-label={ariaLabel}>
      <div className="insights-chart__scale">
        <span>{formatValue(max)}</span>
        <span>{formatValue(max / 2)}</span>
        <span>0</span>
      </div>
      <div className="insights-bars">
        {points.length === 0 ? (
          <p className="insights-muted">{emptyMessage}</p>
        ) : (
          points.map((point) => (
            <div
              className="insights-bars__item"
              key={point.label}
              title={`${point.label}: ${formatValue(point.value)}`}
            >
              <span className="insights-bars__value">{formatValue(point.value)}</span>
              <span className="insights-bars__bar" style={{ height: `${Math.max(8, (point.value / max) * 100)}%` }} />
              <span className="insights-bars__label">{labelOf(point.label)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
