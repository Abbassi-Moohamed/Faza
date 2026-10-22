import { formatMoney } from "@/lib/insights";
import type { Dictionary } from "@/i18n/dictionary";
import type { AnalyticsDto } from "@/types/backend";

import { SectionCard } from "./SectionCard";

type Props = {
  data: AnalyticsDto;
  d: Dictionary["admin"]["insights"];
};

/** What was collected, and what is still to be collected. */
export function CollectionCard({ data, d }: Props) {
  const paid = data.kpis.paidRevenue.current;
  const outstanding = data.kpis.outstandingRevenue.current;
  const total = paid + outstanding;
  const paidShare = total === 0 ? 0 : (paid / total) * 100;
  return (
    <SectionCard eyebrow={d.groups.money} title={d.sections.collection} headingId="insights-collection-title">
      <div className="insights-collection">
        <div className="insights-collection__bar" aria-hidden="true">
          <span className="is-paid" style={{ width: `${paidShare}%` }} />
          <span className="is-due" style={{ width: `${100 - paidShare}%` }} />
        </div>
        <dl className="insights-facts">
          <div>
            <dt>{d.sections.collectionPaid}</dt>
            <dd>{formatMoney(paid, d.currency)}</dd>
          </div>
          <div>
            <dt>{d.sections.collectionOutstanding}</dt>
            <dd>{formatMoney(outstanding, d.currency)}</dd>
          </div>
        </dl>
      </div>
    </SectionCard>
  );
}
