import type { CSSProperties } from "react";

import { formatCount, formatDecimal, formatPercent } from "@/lib/insights";
import type { Dictionary } from "@/i18n/dictionary";
import type { AnalyticsDto } from "@/types/backend";

import { SectionCard } from "./SectionCard";

type Props = {
  data: AnalyticsDto;
  d: Dictionary["admin"]["insights"];
};

function shareBarStyle(value: number): CSSProperties {
  return { "--engagement-share": `${Math.max(0, Math.min(100, value))}%` } as CSSProperties;
}

export function ItemEngagementCard({ data, d }: Props) {
  const items = data.itemEngagement ?? [];
  const summary = data.itemEngagementSummary ?? {
    views: items.reduce((total, item) => total + item.views, 0),
    itemOrders: items.reduce((total, item) => total + item.confirmedOrders, 0),
    unitsSold: items.reduce((total, item) => total + item.unitsSold, 0),
    ordersPer100Views: null,
  };
  const viewsTotal = summary.views;
  const ordersTotal = summary.itemOrders;
  const ordersPer100Views =
    summary.ordersPer100Views ?? (viewsTotal === 0 ? null : Number(((ordersTotal / viewsTotal) * 100).toFixed(1)));

  return (
    <SectionCard
      wide
      eyebrow={d.groups.catalog}
      title={d.itemEngagementTitle}
      hint={d.itemEngagementHint}
      headingId="insights-item-engagement-title"
    >
      {items.length === 0 ? (
        <p className="insights-muted">{d.itemEngagementEmpty}</p>
      ) : (
        <>
          <dl className="item-engagement-summary">
            <div className="item-engagement-summary__metric">
              <dt>{d.itemEngagementViews}</dt>
              <dd>{formatCount(summary.views)}</dd>
            </div>
            <div className="item-engagement-summary__metric">
              <dt>{d.itemEngagementOrders}</dt>
              <dd>{formatCount(summary.itemOrders)}</dd>
              <small>{d.itemEngagementOrdersHint}</small>
            </div>
            <div className="item-engagement-summary__metric">
              <dt>{d.itemEngagementUnits}</dt>
              <dd>{formatCount(summary.unitsSold)}</dd>
            </div>
            <div className="item-engagement-summary__metric item-engagement-summary__metric--index">
              <dt>{d.itemEngagementRate}</dt>
              <dd>{ordersPer100Views === null ? d.itemNoViews : formatDecimal(ordersPer100Views)}</dd>
              <small>{d.itemEngagementRateHint}</small>
            </div>
          </dl>

          <div className="insights-table-wrap">
            <table className="insights-table item-engagement-table">
              <thead>
                <tr>
                  <th scope="col">{d.sections.item}</th>
                  <th scope="col">{d.itemViewsShare}</th>
                  <th scope="col">{d.itemOrdersShare}</th>
                  <th scope="col">{d.itemInterestGap}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const viewShare =
                    item.viewsSharePercent ??
                    (viewsTotal === 0 ? 0 : Number(((item.views / viewsTotal) * 100).toFixed(1)));
                  const orderShare =
                    item.ordersSharePercent ??
                    (ordersTotal === 0 ? null : Number(((item.confirmedOrders / ordersTotal) * 100).toFixed(1)));
                  const interestGap =
                    item.interestGapPoints ??
                    (orderShare === null ? null : Number((viewShare - orderShare).toFixed(1)));
                  const per100 =
                    item.ordersPer100Views ??
                    (item.views === 0 ? null : Number(((item.confirmedOrders / item.views) * 100).toFixed(1)));

                  return (
                    <tr key={item.itemId}>
                      <th scope="row">
                        <span className="item-engagement-table__name">{item.name}</span>
                        <span className="item-engagement-table__detail">
                          {formatCount(item.views)} {d.itemViews.toLowerCase()} · {formatCount(item.confirmedOrders)}{" "}
                          {d.itemOrders.toLowerCase()} · {formatCount(item.unitsSold)} {d.itemUnitsSold.toLowerCase()}
                          {per100 === null ? "" : ` · ${formatDecimal(per100)} ${d.itemEngagementRate.toLowerCase()}`}
                        </span>
                      </th>
                      <td>
                        <span className="item-engagement-share">
                          <span className="item-engagement-share__track" aria-hidden="true">
                            <span className="item-engagement-share__fill" style={shareBarStyle(viewShare)} />
                          </span>
                          <span>{formatPercent(viewShare)}</span>
                        </span>
                      </td>
                      <td>
                        {orderShare === null ? (
                          <span className="insights-muted">{d.itemNoOrderComparison}</span>
                        ) : (
                          <span className="item-engagement-share">
                            <span className="item-engagement-share__track" aria-hidden="true">
                              <span
                                className="item-engagement-share__fill item-engagement-share__fill--orders"
                                style={shareBarStyle(orderShare)}
                              />
                            </span>
                            <span>{formatPercent(orderShare)}</span>
                          </span>
                        )}
                      </td>
                      <td>
                        {interestGap === null ? (
                          <span className="insights-muted">{d.itemNoOrderComparison}</span>
                        ) : (
                          <span
                            className={`item-engagement-gap${interestGap > 0 ? " item-engagement-gap--review" : ""}`}
                          >
                            {interestGap > 0 ? "+" : ""}
                            {formatDecimal(interestGap)} pts
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="item-engagement-footnote">{d.itemInterestGapHint}</p>
        </>
      )}
    </SectionCard>
  );
}
