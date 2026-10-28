"use client";

import { useEffect, useState } from "react";

import { getDictionary } from "@/i18n";

interface OfferCountdownProps {
  startAt: string | null;
  endAt: string | null;
  compact?: boolean;
}

function countdownDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days} j ${String(hours).padStart(2, "0")} h`;
  if (hours > 0) return `${hours} h ${String(minutes).padStart(2, "0")} min`;
  if (minutes > 0) return `${minutes} min ${String(seconds).padStart(2, "0")} s`;
  return `${seconds} s`;
}

export function OfferCountdown({ startAt, endAt, compact = false }: OfferCountdownProps) {
  const d = getDictionary();
  const [nowMs, setNowMs] = useState<number | null>(null);
  const startsAtMs = startAt ? new Date(startAt).getTime() : null;
  const endsAtMs = endAt ? new Date(endAt).getTime() : null;

  useEffect(() => {
    const initializeTimer = window.setTimeout(() => setNowMs(Date.now()), 0);
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      window.clearTimeout(initializeTimer);
      window.clearInterval(timer);
    };
  }, []);

  if (nowMs === null) {
    return <p className="offer-countdown offer-countdown--loading" aria-hidden="true" />;
  }

  if (startsAtMs !== null && nowMs < startsAtMs) {
    return (
      <p className={`offer-countdown offer-countdown--starts${compact ? " offer-countdown--compact" : ""}`}>
        <span className="offer-countdown__icon" aria-hidden="true">
          ◷
        </span>
        <span className="offer-countdown__label">{d.offer.startsIn(countdownDuration(startsAtMs - nowMs))}</span>
      </p>
    );
  }

  if (endsAtMs !== null && nowMs >= endsAtMs) {
    return (
      <p className={`offer-countdown offer-countdown--ended${compact ? " offer-countdown--compact" : ""}`}>
        <span className="offer-countdown__label">{d.offer.ended}</span>
      </p>
    );
  }

  if (endsAtMs !== null) {
    const remaining = endsAtMs - nowMs;
    return (
      <p
        className={`offer-countdown offer-countdown--ends${remaining < 3_600_000 ? " offer-countdown--urgent" : ""}${compact ? " offer-countdown--compact" : ""}`}
        role="timer"
        aria-live="off"
      >
        <span className="offer-countdown__icon" aria-hidden="true">
          ◷
        </span>
        <span className="offer-countdown__label">{d.offer.endsIn(countdownDuration(remaining))}</span>
      </p>
    );
  }

  if (startsAtMs !== null) {
    return (
      <p className={`offer-countdown offer-countdown--available${compact ? " offer-countdown--compact" : ""}`}>
        <span className="offer-countdown__label">{d.offer.availableNow}</span>
      </p>
    );
  }

  return startAt === null && endAt === null && !compact ? (
    <p className="offer-countdown offer-countdown--available">
      <span className="offer-countdown__label">{d.offer.whileStock}</span>
    </p>
  ) : null;
}
