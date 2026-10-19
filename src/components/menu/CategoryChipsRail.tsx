"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

/** Idle drift of the rail, in pixels per second. */
const AUTO_SCROLL_SPEED = 22;
/** Rest at each end before the rail drifts back. */
const EDGE_DWELL_MS = 900;
/** Idle time before the drift resumes after an interaction. */
const RESUME_DELAY_MS = 1600;

interface CategoryChipsRailProps {
  ariaLabel: string;
  children: ReactNode;
}

/**
 * Single-line category rail. When the categories overflow the viewport the
 * rail drifts slowly so the hidden ones stay discoverable, and every form of
 * interaction — touch drag, pointer, wheel, keyboard focus, hidden tab — halts
 * the drift, so the visitor keeps control of the rail. The drift is skipped
 * entirely for visitors who prefer reduced motion.
 */
export function CategoryChipsRail({ ariaLabel, children }: CategoryChipsRailProps) {
  const railRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stalls = new Set<string>();
    const resumeTimers = new Map<string, number>();
    let frame = 0;
    let direction = 1;
    let restingUntil = 0;
    let previous = 0;
    let maxScroll = 0;
    /**
     * Requested offset, kept here rather than read back from the element: the
     * browser snaps `scrollLeft` to device pixels, so a per-frame sub-pixel
     * increment read back from the DOM would round to the value it wrote and
     * the rail would never move.
     */
    let position = 0;

    const measure = () => {
      maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
      position = Math.min(position, maxScroll);
    };

    const centreActiveChip = () => {
      const active = rail.querySelector<HTMLElement>(".category-chip--active");
      if (!active) return;
      const railBox = rail.getBoundingClientRect();
      const activeBox = active.getBoundingClientRect();
      const centred = rail.scrollLeft + activeBox.left - railBox.left - (rail.clientWidth - activeBox.width) / 2;
      rail.scrollLeft = Math.min(maxScroll, Math.max(0, centred));
    };

    const stall = (reason: string) => {
      const timer = resumeTimers.get(reason);
      if (timer) window.clearTimeout(timer);
      resumeTimers.delete(reason);
      stalls.add(reason);
    };

    const resume = (reason: string) => {
      const timer = resumeTimers.get(reason);
      if (timer) window.clearTimeout(timer);
      resumeTimers.delete(reason);
      stalls.delete(reason);
    };

    const resumeWhenIdle = (reason: string) => {
      const timer = resumeTimers.get(reason);
      if (timer) window.clearTimeout(timer);
      resumeTimers.set(
        reason,
        window.setTimeout(() => resume(reason), RESUME_DELAY_MS),
      );
    };

    const isInert = () => stalls.size > 0 || reducedMotion.matches || document.hidden;

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      if (previous === 0) previous = now;
      const elapsed = Math.min(now - previous, 64);
      previous = now;
      if (isInert() || now < restingUntil || maxScroll <= 0) {
        position = rail.scrollLeft;
        return;
      }

      position += (direction * AUTO_SCROLL_SPEED * elapsed) / 1000;
      if (position >= maxScroll) {
        position = maxScroll;
        direction = -1;
        restingUntil = now + EDGE_DWELL_MS;
      } else if (position <= 0) {
        position = 0;
        direction = 1;
        restingUntil = now + EDGE_DWELL_MS;
      }
      rail.scrollLeft = position;
    };

    const handlePointerDown = () => stall("pointer");
    const handlePointerEnd = () => resumeWhenIdle("pointer");
    const handlePointerEnter = (event: PointerEvent) => {
      if (event.pointerType !== "touch") stall("hover");
    };
    const handlePointerLeave = (event: PointerEvent) => {
      if (event.pointerType !== "touch") resumeWhenIdle("hover");
    };
    const handleFocusIn = () => stall("focus");
    const handleFocusOut = () => resumeWhenIdle("focus");
    const handleWheel = () => {
      stall("wheel");
      resumeWhenIdle("wheel");
    };
    const handleVisibility = () => {
      if (document.hidden) stall("hidden");
      else resume("hidden");
    };

    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    for (const chip of Array.from(rail.children)) observer.observe(chip);

    measure();
    centreActiveChip();
    position = rail.scrollLeft;
    frame = window.requestAnimationFrame(tick);

    rail.addEventListener("pointerdown", handlePointerDown);
    rail.addEventListener("pointerenter", handlePointerEnter);
    rail.addEventListener("pointerleave", handlePointerLeave);
    rail.addEventListener("focusin", handleFocusIn);
    rail.addEventListener("focusout", handleFocusOut);
    rail.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.cancelAnimationFrame(frame);
      for (const timer of resumeTimers.values()) window.clearTimeout(timer);
      observer.disconnect();
      rail.removeEventListener("pointerdown", handlePointerDown);
      rail.removeEventListener("pointerenter", handlePointerEnter);
      rail.removeEventListener("pointerleave", handlePointerLeave);
      rail.removeEventListener("focusin", handleFocusIn);
      rail.removeEventListener("focusout", handleFocusOut);
      rail.removeEventListener("wheel", handleWheel);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <nav ref={railRef} className="category-chips" aria-label={ariaLabel}>
      {children}
    </nav>
  );
}
