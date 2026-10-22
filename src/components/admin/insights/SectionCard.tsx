import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  title: string;
  eyebrow?: string;
  hint?: string;
  actions?: ReactNode;
  /** The card spans the two columns of the insights grid. */
  wide?: boolean;
  headingId?: string;
  children: ReactNode;
};

/**
 * The frame of every analytics card: an optional eyebrow, the title, an
 * optional hint and an optional slot of actions (filters, toggles, values).
 */
export function SectionCard({ title, eyebrow, hint, actions, wide, headingId, children }: Props) {
  return (
    <section className={cn("insights-card", wide && "insights-card--wide")} aria-labelledby={headingId}>
      <div className="insights-card__header">
        <div>
          {eyebrow ? <p className="insights-card__eyebrow">{eyebrow}</p> : null}
          <h2 id={headingId}>{title}</h2>
          {hint ? <p className="insights-card__hint">{hint}</p> : null}
        </div>
        {actions ? <div className="insights-card__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
