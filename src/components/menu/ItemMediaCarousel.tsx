"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { getDictionary } from "@/i18n";
import { formatMediaDuration } from "@/lib/media";
import type { MenuItem, MenuMedia } from "@/types/menu";

import { accentGradientStyle } from "./accentGradient";

interface ItemMediaCarouselProps {
  item: MenuItem;
  sizes?: string;
  imagePriority?: boolean;
}

function mediaOf(item: MenuItem): MenuMedia[] {
  if (item.media && item.media.length > 0) return item.media;
  if (item.image) return [{ url: item.image, type: "image" }];
  return [];
}

export function ItemMediaCarousel({
  item,
  sizes = "(min-width: 42rem) 19rem, 92vw",
  imagePriority = false,
}: ItemMediaCarouselProps) {
  const dict = getDictionary();
  const media = mediaOf(item);
  const [index, setIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartX = useRef<number | null>(null);

  const activeIndex = media.length > 0 && index < media.length ? index : 0;
  const current = media[activeIndex];
  const currentType = current?.type;
  const currentDuration = current?.durationMs;
  const isGif = current?.mimeType === "image/gif" || (current ? /\.gif(?:$|\?)/i.test(current.url) : false);
  const hasControls = media.length > 1;

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setInView(true), 0);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pauseForReducedMotion = () => {
      if (query.matches) setPaused(true);
    };
    pauseForReducedMotion();
    query.addEventListener("change", pauseForReducedMotion);
    return () => query.removeEventListener("change", pauseForReducedMotion);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (inView && !paused) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [activeIndex, inView, paused, currentType]);

  useEffect(() => {
    if (!inView || paused || media.length < 2) return;
    const delay = currentType === "video" ? Math.min(5_000, Math.max(2_500, currentDuration ?? 5_000)) : 4_200;
    const timer = window.setTimeout(() => {
      setIndex((activeIndex + 1) % media.length);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [inView, paused, activeIndex, media.length, currentType, currentDuration]);

  const select = (nextIndex: number) => {
    setPaused(true);
    setIndex(nextIndex);
  };

  const go = (delta: number) => {
    if (media.length < 2) return;
    select((activeIndex + delta + media.length) % media.length);
  };

  const failed = !current || failedUrl === current.url;

  return (
    <div
      ref={rootRef}
      className={`item-media${failed ? " item-media--fallback" : ""}`}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start === null) return;
        const end = event.changedTouches[0]?.clientX ?? start;
        if (Math.abs(end - start) < 40) return;
        go(end < start ? 1 : -1);
      }}
    >
      {failed ? (
        <div
          className="gradient-art item-media__fallback"
          style={accentGradientStyle(item.accent ?? "#b45309")}
          aria-hidden="true"
        >
          <span className="gradient-art__monogram">{item.name.charAt(0)}</span>
        </div>
      ) : current.type === "video" ? (
        <video
          key={current.url}
          ref={videoRef}
          className="item-media__asset"
          src={current.url}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={current.alt ?? undefined}
        />
      ) : isGif ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={current.url}
          className="item-media__asset"
          src={current.url}
          alt={current.alt ?? ""}
          loading={imagePriority && activeIndex === 0 ? "eager" : "lazy"}
          onError={() => setFailedUrl(current.url)}
        />
      ) : (
        <Image
          key={current.url}
          src={current.url}
          alt={current.alt ?? ""}
          fill
          sizes={sizes}
          className="item-media__asset"
          priority={imagePriority && activeIndex === 0}
          onError={() => setFailedUrl(current.url)}
        />
      )}

      {!failed && current.type === "video" ? (
        <span className="item-media__video">
          {dict.menuItem.video}
          {current.durationMs ? ` · ${formatMediaDuration(current.durationMs)}` : ""}
        </span>
      ) : null}

      {!failed && current && (hasControls || current.type === "video") ? (
        <button
          type="button"
          className="item-media__toggle"
          aria-label={paused ? dict.menuItem.mediaPlay : dict.menuItem.mediaPause}
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          <span aria-hidden="true">{paused ? "▶" : "II"}</span>
        </button>
      ) : null}

      {hasControls ? (
        <>
          <button
            type="button"
            className="item-media__nav item-media__nav--prev"
            aria-label={dict.menuItem.mediaPrevious}
            onClick={() => go(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="item-media__nav item-media__nav--next"
            aria-label={dict.menuItem.mediaNext}
            onClick={() => go(1)}
          >
            ›
          </button>
          <span className="item-media__count" aria-hidden="true">
            {activeIndex + 1}/{media.length}
          </span>
          <div className="item-media__dots">
            {media.map((entry, dotIndex) => (
              <button
                key={`${entry.url}-${dotIndex}`}
                type="button"
                className={`item-media__dot${dotIndex === activeIndex ? " item-media__dot--active" : ""}`}
                aria-label={dict.menuItem.mediaCount(dotIndex + 1, media.length)}
                aria-current={dotIndex === activeIndex ? "true" : undefined}
                onClick={() => select(dotIndex)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
