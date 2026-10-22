import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  eyebrow?: string;
  available: number;
  unavailable: number;
  percentage: number;
  availableLabel: string;
  unavailableLabel: string;
};

/** How much of the menu is orderable right now. */
export function AvailabilityMeter({
  title,
  eyebrow,
  available,
  unavailable,
  percentage,
  availableLabel,
  unavailableLabel,
}: Props) {
  return (
    <SectionCard
      title={title}
      eyebrow={eyebrow}
      headingId="insights-availability-title"
      actions={<strong className="insights-card__value">{percentage.toFixed(0)}%</strong>}
    >
      <div
        className="insights-availability__bar"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${percentage.toFixed(0)}% ${availableLabel}`}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
      <div className="insights-availability__legend">
        <span>
          <i className="is-available" />
          {availableLabel}
          <strong>{available}</strong>
        </span>
        <span>
          <i className="is-unavailable" />
          {unavailableLabel}
          <strong>{unavailable}</strong>
        </span>
      </div>
    </SectionCard>
  );
}
