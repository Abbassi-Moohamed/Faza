import { bestDay, busiestHour, dayKey, formatHour, formatMoney, peakWindow } from "@/lib/insights";
import type { Dictionary } from "@/i18n/dictionary";
import type { AnalyticsDto } from "@/types/backend";

import { SectionCard } from "./SectionCard";

type Props = {
  data: AnalyticsDto;
  d: Dictionary["admin"]["insights"];
};

/** When the coffee works best: the busiest slot, hour and day of the period. */
export function PeakSummaryCard({ data, d }: Props) {
  const window = peakWindow(data.hourly);
  const hour = busiestHour(data.hourly);
  const day = bestDay(data.busiestDays);
  return (
    <SectionCard
      eyebrow={d.groups.volume}
      title={d.sections.peakWindow}
      headingId="insights-peak-title"
      actions={
        <strong className="insights-card__value">
          {window ? `${formatHour(window.fromHour)} – ${formatHour(window.toHour + 1)}` : "—"}
        </strong>
      }
    >
      <dl className="insights-facts">
        <div>
          <dt>{d.metrics.confirmedRevenue}</dt>
          <dd>{window ? formatMoney(window.revenue, d.currency) : "—"}</dd>
        </div>
        <div>
          <dt>{d.sections.busiestHour}</dt>
          <dd>{hour ? `${formatHour(hour.hour)} · ${d.sections.ordersCount(hour.orders)}` : "—"}</dd>
        </div>
        <div>
          <dt>{d.sections.bestDay}</dt>
          <dd>{day ? `${d.days[dayKey(day.dayOfWeek)]} · ${formatMoney(day.revenue, d.currency)}` : "—"}</dd>
        </div>
      </dl>
    </SectionCard>
  );
}
