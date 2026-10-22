import { formatMoney } from "@/lib/insights";
import type { Dictionary } from "@/i18n/dictionary";
import type { AnalyticsDto } from "@/types/backend";

import { SectionCard } from "./SectionCard";

type Props = {
  data: AnalyticsDto;
  d: Dictionary["admin"]["insights"];
};

/**
 * The menu items nobody ordered.
 *
 * They are not necessarily bad news — a seasonal drink sells in its season —
 * but a menu full of them hides the products that do sell.
 */
export function DeadStockCard({ data, d }: Props) {
  const items = data.deadStock?.items ?? [];
  return (
    <SectionCard
      wide
      eyebrow={d.groups.catalog}
      title={d.sections.deadStock}
      hint={d.sections.deadStockHint}
      headingId="insights-dead-stock-title"
    >
      {items.length === 0 ? (
        <p className="insights-muted">{d.noData}</p>
      ) : (
        <div className="insights-table-wrap">
          <table className="insights-table">
            <thead>
              <tr>
                <th scope="col">{d.sections.item}</th>
                <th scope="col">{d.sections.category}</th>
                <th scope="col">{d.sections.price}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.itemId}>
                  <th scope="row">{item.name}</th>
                  <td>{item.categoryName}</td>
                  <td>{formatMoney(item.price, d.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
