import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDictionary } from "@/i18n";

import { OfferCountdown } from "./OfferCountdown";

describe("OfferCountdown", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-28T12:00:00.000Z"));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it("counts down to the end without showing the configured dates", () => {
    act(() => {
      root.render(<OfferCountdown startAt="2026-10-28T10:00:00.000Z" endAt="2026-10-28T12:01:05.000Z" />);
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(container.textContent).toContain(getDictionary().offer.endsIn("1 min 05 s"));
    expect(container.textContent).not.toContain("2026");

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(container.textContent).toContain(getDictionary().offer.endsIn("1 min 00 s"));
  });

  it("shows a countdown before an offer begins", () => {
    act(() => {
      root.render(<OfferCountdown startAt="2026-10-28T12:00:20.000Z" endAt="2026-10-28T13:00:00.000Z" />);
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(container.textContent).toContain(getDictionary().offer.startsIn("20 s"));
    expect(container.querySelector(".offer-countdown--starts")).not.toBeNull();
  });

  it("does not display countdown UI on compact cards when no dates are configured", () => {
    act(() => {
      root.render(<OfferCountdown startAt={null} endAt={null} compact />);
    });

    expect(container.textContent).toBe("");
  });
});
