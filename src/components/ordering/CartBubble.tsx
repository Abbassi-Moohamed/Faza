"use client";

import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const SIDE_STORAGE_KEY = "faza:cart-bubble-side";
const Y_STORAGE_KEY = "faza:cart-bubble-y";
/** Gap kept between the bubble and the screen edges, in pixels. */
const EDGE_INSET = 14;
/** Movement below this is still a tap; above it the gesture becomes a drag. */
const MOVE_SLOP = 8;
/** Keyboard nudges for the docked position, in pixels. */
const KEY_STEP = 64;
/** The default dock: vertically centered until the visitor drops it elsewhere. */
const DEFAULT_Y_RATIO = 0.5;

type Side = "left" | "right";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

const clampX = (value: number, viewportWidth: number, size: number) =>
  clamp(value, EDGE_INSET, viewportWidth - size - EDGE_INSET);

const clampY = (value: number, viewportHeight: number, size: number) =>
  clamp(value, EDGE_INSET, viewportHeight - size - EDGE_INSET);

const clampRatio = (value: number) => clamp(value, 0, 1);

const dockedX = (side: Side, viewportWidth: number, size: number) =>
  side === "right" ? clampX(viewportWidth - size - EDGE_INSET, viewportWidth, size) : EDGE_INSET;

/** Top coordinate for a stored vertical ratio, clamped to the free Y range. */
const dockedY = (yRatio: number, viewportHeight: number, size: number) =>
  clampY(clampRatio(yRatio) * viewportHeight - size / 2, viewportHeight, size);

const readStoredSide = (): Side => {
  try {
    const stored = window.localStorage.getItem(SIDE_STORAGE_KEY);
    if (stored === "left" || stored === "right") return stored;
  } catch {
    // Storage unavailable (private mode) — keep the default dock.
  }
  return "right";
};

const readStoredYRatio = (): number => {
  try {
    const raw = window.localStorage.getItem(Y_STORAGE_KEY);
    if (raw === null) return DEFAULT_Y_RATIO;
    const stored = Number(raw);
    if (Number.isFinite(stored) && stored >= 0 && stored <= 1) return stored;
  } catch {
    // Storage unavailable (private mode) — keep the default dock.
  }
  return DEFAULT_Y_RATIO;
};

const persistDock = (side: Side, yRatio: number) => {
  try {
    window.localStorage.setItem(SIDE_STORAGE_KEY, side);
    window.localStorage.setItem(Y_STORAGE_KEY, String(yRatio));
  } catch {
    // Storage unavailable — the dock simply resets on the next visit.
  }
};

interface CartBubbleProps {
  count: number;
  label: string;
  sheetOpen: boolean;
  onOpen: () => void;
}

interface Gesture {
  pointerId: number;
  startX: number;
  startY: number;
  startDragX: number;
  startDragY: number;
  dragging: boolean;
}

/**
 * Messenger-style chat head for the cart: a circular bubble docked to the
 * left or right edge that can be dragged to any point along the Y axis of
 * either side. On release it snaps horizontally to the nearest edge and keeps
 * the dropped height; side and height persist per visitor.
 */
export function CartBubble({ count, label, sheetOpen, onOpen }: CartBubbleProps) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const suppressClickRef = useRef(false);
  const lastPointerTypeRef = useRef("");
  const [side, setSide] = useState<Side>("right");
  const [yRatio, setYRatio] = useState(DEFAULT_Y_RATIO);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [size, setSize] = useState(0);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [settled, setSettled] = useState(false);

  // Measure before paint so the bubble's first committed transform is already
  // its docked position; transitions only arm a frame later and can never
  // animate that initial placement.
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    setSide(readStoredSide());
    setYRatio(readStoredYRatio());
    setViewportWidth(window.innerWidth);
    setViewportHeight(window.innerHeight);
    setSize(anchor.offsetWidth);
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setSettled(true));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== 0) cancelAnimationFrame(secondFrame);
    };
  }, []);

  useEffect(() => {
    const onViewportChange = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
    };
  }, []);

  const positioned = size > 0 && viewportWidth > 0 && viewportHeight > 0;
  const x = dragPos ? dragPos.x : positioned ? dockedX(side, viewportWidth, size) : null;
  const y = dragPos ? dragPos.y : positioned ? dockedY(yRatio, viewportHeight, size) : null;

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (gestureRef.current || x === null || y === null) return;
    suppressClickRef.current = false;
    lastPointerTypeRef.current = event.pointerType;
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startDragX: x,
      startDragY: y,
      dragging: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is best-effort; touch pointers are implicitly captured anyway.
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (!gesture.dragging) {
      if (Math.hypot(deltaX, deltaY) <= MOVE_SLOP) return;
      gesture.dragging = true;
      suppressClickRef.current = true;
      setDragging(true);
    }
    const width = viewportWidth > 0 ? viewportWidth : window.innerWidth;
    const height = viewportHeight > 0 ? viewportHeight : window.innerHeight;
    setDragPos({
      x: clampX(gesture.startDragX + deltaX, width, size),
      y: clampY(gesture.startDragY + deltaY, height, size),
    });
  };

  const handlePointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Already released (for example the browser cancelled the pointer).
    }
    if (!gesture.dragging) return; // Plain tap — the click event opens the sheet.
    const width = viewportWidth > 0 ? viewportWidth : window.innerWidth;
    const height = viewportHeight > 0 ? viewportHeight : window.innerHeight;
    const finalX = clampX(gesture.startDragX + (event.clientX - gesture.startX), width, size);
    const finalY = clampY(gesture.startDragY + (event.clientY - gesture.startY), height, size);
    const nextSide: Side = finalX + size / 2 < width / 2 ? "left" : "right";
    const nextYRatio = clampRatio((finalY + size / 2) / height);
    setDragging(false);
    setDragPos(null);
    setSide(nextSide);
    setYRatio(nextYRatio);
    persistDock(nextSide, nextYRatio);
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current) {
      event.preventDefault();
      suppressClickRef.current = false;
      return;
    }
    onOpen();
  };

  const nudgeY = (delta: number) => {
    const height = viewportHeight > 0 ? viewportHeight : window.innerHeight;
    const nextYRatio = clampRatio(yRatio + delta / height);
    setYRatio(nextYRatio);
    persistDock(side, nextYRatio);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const nextSide: Side = event.key === "ArrowLeft" ? "left" : "right";
      setSide(nextSide);
      persistDock(nextSide, yRatio);
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      nudgeY(event.key === "ArrowUp" ? -KEY_STEP : KEY_STEP);
    }
  };

  /** Android opens an action menu on long-press, which would interrupt a drag. */
  const handleContextMenu = (event: MouseEvent<HTMLButtonElement>) => {
    if (lastPointerTypeRef.current === "touch") event.preventDefault();
  };

  const classes = [
    "cart-bubble-anchor",
    sheetOpen ? "cart-bubble-anchor--hidden" : "",
    dragging ? "cart-bubble-anchor--dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={anchorRef}
      className={classes}
      style={{
        transform: x === null || y === null ? undefined : `translate3d(${x}px, ${y}px, 0)`,
        transition: settled ? undefined : "none",
      }}
    >
      <button
        className="cart-bubble"
        type="button"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={!sheetOpen}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
          <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0020 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
        <span className="cart-bubble__count" key={count} aria-hidden="true">
          {count}
        </span>
      </button>
    </div>
  );
}
