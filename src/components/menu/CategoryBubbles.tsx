"use client";

import type { CSSProperties, MouseEvent, PointerEvent } from "react";
import { useSyncExternalStore, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { getDictionary } from "@/i18n";
import { bubbleGeometry, CATEGORY_ASPECT, CATEGORY_WEIGHT, layoutBubbleRows } from "@/lib/blob";
import { categoryAccentAt, categoryIcon } from "@/lib/adapters";
import { categoryHref } from "@/lib/utils";
import type { MenuCategory } from "@/types/menu";

import { accentGradientStyle } from "./accentGradient";

interface CategoryLinkProps {
  coffeeSlug: string;
  category: MenuCategory;
  visualIndex: number;
  position?: { x: number; y: number; width: number; height: number };
  onDragStart: (event: PointerEvent<HTMLAnchorElement>) => void;
  onDragMove: (event: PointerEvent<HTMLAnchorElement>) => void;
  onDragEnd: (event: PointerEvent<HTMLAnchorElement>) => void;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  dragging: boolean;
  isLastTouched: boolean;
  pressed: boolean;
}

/**
 * One organic bubble, now a real `<a>` — the whole coffee menu is server
 * rendered and every bubble deep-links to `/faza/:slug/:categName`.
 */
function CategoryLink({
  coffeeSlug,
  category,
  visualIndex,
  position,
  onDragStart,
  onDragMove,
  onDragEnd,
  onClick,
  dragging,
  isLastTouched,
  pressed,
}: CategoryLinkProps) {
  const dict = getDictionary();
  const geometry = bubbleGeometry(category.id);
  const style = {
    flexGrow: CATEGORY_WEIGHT,
    aspectRatio: CATEGORY_ASPECT.toFixed(3),
    borderRadius: geometry.borderRadius,
    "--bubble-tilt": `${geometry.tilt}deg`,
    "--bubble-swim-x1": `${geometry.swimX1}px`,
    "--bubble-swim-y1": `${geometry.swimY1}px`,
    "--bubble-swim-x2": `${geometry.swimX2}px`,
    "--bubble-swim-y2": `${geometry.swimY2}px`,
    "--bubble-swim-x3": `${geometry.swimX3}px`,
    "--bubble-swim-y3": `${geometry.swimY3}px`,
    "--bubble-duration": "6.8s",
    "--bubble-delay": `${visualIndex * -320}ms`,
    "--bubble-overlay": categoryAccentAt(visualIndex + 5),
    "--bubble-border": categoryAccentAt(visualIndex + 9),
    ...accentGradientStyle(categoryAccentAt(visualIndex)),
    ...(category.image
      ? {
          backgroundImage: `linear-gradient(180deg, rgb(24 16 10 / 0.08), rgb(24 16 10 / 0.72)), url("${category.image}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : {}),
  } as CSSProperties;

  return (
    <div
      className={`bubble-drag-layer${dragging ? " bubble-drag-layer--active" : ""}`}
      style={{
        ...(position
          ? {
              position: "absolute",
              left: position.x,
              top: position.y,
              width: position.width,
              height: position.height,
            }
          : {}),
        zIndex: isLastTouched ? 1003 : 1001,
      }}
    >
      <Link
        href={categoryHref(coffeeSlug, category.name)}
        className={`bubble${pressed ? " bubble--pressed" : ""}`}
        style={style}
        aria-label={`${category.name}, ${dict.sheet.itemsCountLabel(category.itemCount)} — ${dict.explore.openCategory}`}
        title={dict.explore.dragHint}
        draggable={false}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        onClick={onClick}
      >
        <span className="bubble__icon" aria-hidden="true">
          {category.image ? (
            // Remote category images are decorative; the category name remains the accessible label.
            // eslint-disable-next-line @next/next/no-img-element
            <img className="bubble__image" src={category.image} alt="" draggable={false} />
          ) : (
            categoryIcon(category.id, category.name)
          )}
        </span>
        <span className="bubble__name">{category.name}</span>
        <span className="bubble__count" aria-hidden="true">
          {dict.sheet.itemsCountLabel(category.itemCount)}
        </span>
      </Link>
    </div>
  );
}

const DRAG_HINT_KEY = "faza:drag-hint-seen";

/** No subscriptions: the snapshot is re-read whenever the component re-renders. */
const subscribeToDragHint = () => () => {};

const dragHintSnapshot = () => {
  try {
    return window.localStorage.getItem(DRAG_HINT_KEY) === "1";
  } catch {
    // Storage unavailable (private mode) — never show the hint.
    return true;
  }
};

const markDragHintSeen = () => {
  try {
    window.localStorage.setItem(DRAG_HINT_KEY, "1");
  } catch {
    // Storage unavailable — nothing to persist.
  }
};

type GesturePhase = "pending" | "scroll" | "drag";

interface Gesture {
  id: string;
  pointerId: number;
  phase: GesturePhase;
  startX: number;
  startY: number;
  lastY: number;
  lastT: number;
  grabX: number;
  grabY: number;
  sceneLeft: number;
  sceneTop: number;
  sceneWidth: number;
  sceneHeight: number;
  bubbleWidth: number;
  bubbleHeight: number;
  moved: boolean;
  scrollTarget: HTMLElement | null;
}

const DRAG_ARM_DELAY = 220;
const MOVE_SLOP = 6;
const SCROLL_SLOP = 8;

/**
 * Nearest ancestor that actually scrolls vertically. Returns `null` when the
 * document itself scrolls, so callers fall back to the window.
 */
function findScrollTarget(start: Element | null): HTMLElement | null {
  let node = start?.parentElement ?? null;
  while (node && node !== document.body && node !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/** Scroll the document or a container without triggering smooth-scroll. */
function scrollByY(target: HTMLElement | null, delta: number) {
  if (target) {
    target.scrollTop += delta;
    return;
  }
  const scroller = document.scrollingElement ?? document.documentElement;
  scroller.scrollTop += delta;
}

function currentScrollTop(target: HTMLElement | null) {
  if (target) {
    return target.scrollTop;
  }
  return (document.scrollingElement ?? document.documentElement).scrollTop;
}

interface CategoryBubblesProps {
  /** Public slug of the coffee the categories belong to. */
  coffeeSlug: string;
  categories: MenuCategory[];
}

/**
 * Server-rendered bubble field for a coffee menu. Categories are resolved
 * within the coffee (backend data), each bubble linking to its own items page.
 */
export function CategoryBubbles({ coffeeSlug, categories }: CategoryBubblesProps) {
  const dict = getDictionary();
  const rows = layoutBubbleRows(categories);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number; width: number; height: number }>>(
    {},
  );
  const gestureRef = useRef<Gesture | null>(null);
  const armTimerRef = useRef<number | null>(null);
  const inertiaRef = useRef<number | null>(null);
  const velocityRef = useRef(0);
  const suppressClickRef = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  // One-time drag hint: shown until the visitor drags a bubble for the first time.
  const hintSeen = useSyncExternalStore(subscribeToDragHint, dragHintSnapshot, () => false);
  const [lastTouchedId, setLastTouchedId] = useState<string | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);

  const clearArmTimer = () => {
    if (armTimerRef.current !== null) {
      window.clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
  };

  const stopInertia = () => {
    if (inertiaRef.current !== null) {
      window.cancelAnimationFrame(inertiaRef.current);
      inertiaRef.current = null;
    }
  };

  useEffect(
    () => () => {
      if (armTimerRef.current !== null) window.clearTimeout(armTimerRef.current);
      if (inertiaRef.current !== null) window.cancelAnimationFrame(inertiaRef.current);
    },
    [],
  );

  /** Momentum scroll so a swipe that starts on a bubble still feels native. */
  const startInertia = (target: HTMLElement | null) => {
    stopInertia();
    if (Math.abs(velocityRef.current) < 0.02) {
      return;
    }
    let last: number | null = null;
    const step = (now: number) => {
      if (last === null) {
        last = now;
        inertiaRef.current = window.requestAnimationFrame(step);
        return;
      }
      const dt = Math.min(now - last, 50);
      last = now;
      const before = currentScrollTop(target);
      scrollByY(target, velocityRef.current * dt);
      const after = currentScrollTop(target);
      velocityRef.current *= Math.pow(0.94, dt / 16.67);
      const hitBoundary = after === before;
      if (Math.abs(velocityRef.current) < 0.02 || hitBoundary) {
        inertiaRef.current = null;
        return;
      }
      inertiaRef.current = window.requestAnimationFrame(step);
    };
    inertiaRef.current = window.requestAnimationFrame(step);
  };

  const getScene = (event: PointerEvent<HTMLAnchorElement>) => {
    const scene = event.currentTarget.closest(".bubble-field");
    if (!scene || typeof window === "undefined") {
      return null;
    }

    const bounds = scene.getBoundingClientRect();
    return { element: scene, bounds };
  };

  const armDrag = (gesture: Gesture) => {
    if (gestureRef.current !== gesture || gesture.phase !== "pending") {
      return;
    }
    gesture.phase = "drag";
    setDraggingId(gesture.id);
    setPressedId(null);
    suppressClickRef.current = true;
  };

  const handleDragStart = (id: string, event: PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (gestureRef.current) return;
    const scene = getScene(event);
    if (!scene) return;
    stopInertia();
    clearArmTimer();
    suppressClickRef.current = false;
    setLastTouchedId(id);
    setPressedId(id);
    const bubble = event.currentTarget.getBoundingClientRect();
    const isTouch = event.pointerType === "touch";
    const gesture: Gesture = {
      id,
      pointerId: event.pointerId,
      phase: isTouch ? "pending" : "drag",
      startX: event.clientX,
      startY: event.clientY,
      lastY: event.clientY,
      lastT: event.timeStamp,
      grabX: event.clientX - bubble.left,
      grabY: event.clientY - bubble.top,
      sceneLeft: scene.bounds.left,
      sceneTop: scene.bounds.top,
      sceneWidth: scene.bounds.width,
      sceneHeight: scene.bounds.height,
      bubbleWidth: bubble.width,
      bubbleHeight: bubble.height,
      moved: false,
      scrollTarget: null,
    };
    gestureRef.current = gesture;
    if (isTouch) {
      armTimerRef.current = window.setTimeout(() => armDrag(gesture), DRAG_ARM_DELAY);
    } else {
      setDraggingId(id);
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is best-effort; touch pointers are implicitly captured anyway.
    }
  };

  const handleDragMove = (event: PointerEvent<HTMLAnchorElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    if (gesture.phase === "pending") {
      const distance = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY);
      if (distance <= SCROLL_SLOP) {
        gesture.lastY = event.clientY;
        gesture.lastT = event.timeStamp;
        return;
      }
      // Intent is a scroll: take over panning manually so the gesture keeps
      // working even though the bubble layer blocks native touch-action.
      clearArmTimer();
      gesture.phase = "scroll";
      gesture.scrollTarget = findScrollTarget(event.currentTarget);
      gesture.lastY = event.clientY;
      gesture.lastT = event.timeStamp;
      setPressedId(null);
    }

    if (gesture.phase === "scroll") {
      const now = event.timeStamp;
      const dy = event.clientY - gesture.lastY;
      const dt = now - gesture.lastT;
      scrollByY(gesture.scrollTarget, -dy);
      if (dt > 0) {
        const instantaneous = -dy / dt;
        velocityRef.current = velocityRef.current * 0.7 + instantaneous * 0.3;
      }
      gesture.lastY = event.clientY;
      gesture.lastT = now;
      return;
    }

    const nextX = event.clientX - gesture.sceneLeft - gesture.grabX;
    const nextY = event.clientY - gesture.sceneTop - gesture.grabY;
    if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > MOVE_SLOP) {
      if (!gesture.moved) {
        setPositions((current) => ({
          ...current,
          [gesture.id]: {
            x: gesture.startX - gesture.sceneLeft - gesture.grabX,
            y: gesture.startY - gesture.sceneTop - gesture.grabY,
            width: gesture.bubbleWidth,
            height: gesture.bubbleHeight,
          },
        }));
        setHasDragged(true);
        markDragHintSeen();
      }
      gesture.moved = true;
      suppressClickRef.current = true;
    }
    if (!gesture.moved) return;
    const maxX = Math.max(0, gesture.sceneWidth - gesture.bubbleWidth);
    const maxY = Math.max(0, gesture.sceneHeight - gesture.bubbleHeight);
    setPositions((current) => ({
      ...current,
      [gesture.id]: {
        x: Math.max(0, Math.min(maxX, nextX)),
        y: Math.max(0, Math.min(maxY, nextY)),
        width: gesture.bubbleWidth,
        height: gesture.bubbleHeight,
      },
    }));
  };

  const handleDragEnd = (event: PointerEvent<HTMLAnchorElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    clearArmTimer();
    const wasScrolling = gesture.phase === "scroll";
    gestureRef.current = null;
    setDraggingId(null);
    setPressedId(null);
    if (wasScrolling) {
      startInertia(gesture.scrollTarget);
    } else if (!gesture.moved) {
      // A press that never turned into a drag still behaves as a tap.
      suppressClickRef.current = false;
    }
  };

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (suppressClickRef.current) {
      event.preventDefault();
      suppressClickRef.current = false;
    }
  };

  if (categories.length === 0) {
    return (
      <div className="bubble-field">
        <div className="sheet-state">
          <p className="sheet-state__title">{dict.explore.emptyTitle}</p>
          <p className="sheet-state__text">{dict.explore.emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <nav
      className={`bubble-field bubble-field--rows-${Math.min(rows.length, 4)}${hasDragged ? " bubble-field--paused" : ""}`}
      aria-label={dict.explore.categoriesAriaLabel}
    >
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className={`bubble-row bubble-row--${row.length}`}>
          {row.map((category, categoryIndex) => (
            <CategoryLink
              key={category.id}
              coffeeSlug={coffeeSlug}
              category={category}
              visualIndex={rowIndex * 3 + categoryIndex}
              position={positions[category.id]}
              onDragStart={(event) => handleDragStart(category.id, event)}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
              onClick={handleClick}
              dragging={draggingId === category.id}
              isLastTouched={lastTouchedId === category.id}
              pressed={pressedId === category.id}
            />
          ))}
        </div>
      ))}
      {!hintSeen ? (
        <p className="bubble-hint" role="note">
          {dict.explore.dragHint}
        </p>
      ) : null}
    </nav>
  );
}
