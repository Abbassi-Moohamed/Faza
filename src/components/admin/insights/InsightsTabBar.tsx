"use client";

import { useRef } from "react";

import type { InsightTab } from "@/lib/insights";
import { cn } from "@/lib/utils";

type Props = {
  tabs: Array<{ id: InsightTab; label: string; hint?: string }>;
  active: InsightTab;
  onChange: (tab: InsightTab) => void;
  /** The accessible name of the tab list. */
  label: string;
};

/**
 * The tab bar of the analytics.
 *
 * It follows the WAI-ARIA tabs pattern: the arrow keys move the focus and
 * the selection, `Home` and `End` jump to the first and the last tab.
 */
export function InsightsTabBar({ tabs, active, onChange, label }: Props) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const focus = (index: number) => {
    const target = buttons.current[index];
    if (!target) return;
    target.focus();
    onChange(tabs[index].id);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focus(index === last ? 0 : index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focus(index === 0 ? last : index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focus(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focus(last);
    }
  };

  return (
    <div className="insights-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          id={`insights-tab-${tab.id}`}
          ref={(node) => {
            buttons.current[index] = node;
          }}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          aria-controls={`insights-panel-${tab.id}`}
          tabIndex={active === tab.id ? 0 : -1}
          className={cn("insights-tabs__tab", active === tab.id && "insights-tabs__tab--active")}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
