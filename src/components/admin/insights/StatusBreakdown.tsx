import { formatCount } from "@/lib/insights";

import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  eyebrow?: string;
  /** The rows of the breakdown: a label, a count and its share. */
  rows: Array<{ key: string; label: string; count: number; percentage: number }>;
  /** The modifier applied to the dot and the bar of each row. */
  toneOf: (key: string) => string;
  emptyMessage: string;
};

/** How the orders of the period were distributed between their statuses. */
export function StatusBreakdown({ title, eyebrow, rows, toneOf, emptyMessage }: Props) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <SectionCard title={title} eyebrow={eyebrow}>
      {total === 0 ? (
        <p className="insights-muted">{emptyMessage}</p>
      ) : (
        <ul className="insights-statuses">
          {rows.map((row) => (
            <li key={row.key}>
              <span className="insights-statuses__label">
                <i className={toneOf(row.key)} aria-hidden="true" />
                {row.label}
              </span>
              <span className="insights-statuses__bar" aria-hidden="true">
                <b className={toneOf(row.key)} style={{ width: `${row.percentage}%` }} />
              </span>
              <strong>
                {formatCount(row.count)} · {row.percentage.toFixed(1)}%
              </strong>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
