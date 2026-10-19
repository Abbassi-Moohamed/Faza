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
  position?: { x: number; y: number; dx: number; dy: number; width: number; height: number };
  onDragStart: (event: PointerEvent<HTMLAnchorElement>) => void;
  onDragMove: (event: PointerEvent<HTMLAnchorElement>) => void;
  onDragEnd: (event: PointerEvent<HTMLAnchorElement>) => void;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  onContextMenu: (event: MouseEvent<HTMLAnchorElement>) => void;
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
  onContextMenu,
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
      style={
        {
          ...(position
            ? {
                position: "absolute",
                left: position.x,
                top: position.y,
                width: position.width,
                height: position.height,
                // GPU-composited offset: never touches layout while dragging.
                "--drag-x": `${position.dx}px`,
                "--drag-y": `${position.dy}px`,
              }
            : {}),
          zIndex: isLastTouched ? 1003 : 1001,
        } as CSSProperties
      }
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
        onContextMenu={onContextMenu}
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

type GesturePhase = "pending" | "drag" | "aborted";

interface Gesture {
  id: string;
  pointerId: number;
  phase: GesturePhase;
  startX: number;
  startY: number;
  grabX: number;
  grabY: number;
  sceneLeft: number;
  sceneTop: number;
  sceneWidth: number;
  sceneHeight: number;
  bubbleWidth: number;
  bubbleHeight: number;
  moved: boolean;
}

/** How long a finger must rest on a bubble before dragging takes over. */
const DRAG_ARM_DELAY = 220;
/** Movement below this is still a press; above it the visitor is scrolling. */
const MOVE_SLOP = 8;

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
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number; dx: number; dy: number; width: number; height: number }>
  >({});
  const gestureRef = useRef<Gesture | null>(null);
  const armTimerRef = useRef<number | null>(null);
  const touchBlockRef = useRef<(() => void) | null>(null);
  const suppressClickRef = useRef(false);
  const lastPointerTypeRef = useRef("");
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

  const releaseTouchScroll = () => {
    touchBlockRef.current?.();
    touchBlockRef.current = null;
  };

  /**
   * Once a drag is armed, keep the browser from starting a pan so the pointer
   * can drive the bubble. `pointermove.preventDefault()` does not stop touch
   * scrolling; a non-passive `touchmove` listener does. It is only attached
   * after the long-press, so an ordinary swipe keeps native scrolling.
   */
  const blockTouchScroll = () => {
    releaseTouchScroll();
    const onTouchMove = (event: TouchEvent) => event.preventDefault();
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    touchBlockRef.current = () => document.removeEventListener("touchmove", onTouchMove);
  };

  useEffect(
    () => () => {
      if (armTimerRef.current !== null) window.clearTimeout(armTimerRef.current);
      releaseTouchScroll();
    },
    [],
  );

  /** Bounds of the bubble field the dragged bubble is clamped to. */
  const getSceneBounds = (event: PointerEvent<HTMLAnchorElement>) => {
    const scene = event.currentTarget.closest(".bubble-field");
    return scene?.getBoundingClientRect() ?? null;
  };

  const armDrag = (gesture: Gesture) => {
    if (gestureRef.current !== gesture || gesture.phase !== "pending") {
      return;
    }
    gesture.phase = "drag";
    blockTouchScroll();
    setDraggingId(gesture.id);
    setPressedId(null);
    suppressClickRef.current = true;
  };

  const handleDragStart = (id: string, event: PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (gestureRef.current) return;
    const bounds = getSceneBounds(event);
    if (!bounds) return;
    clearArmTimer();
    releaseTouchScroll();
    suppressClickRef.current = false;
    lastPointerTypeRef.current = event.pointerType;
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
      grabX: event.clientX - bubble.left,
      grabY: event.clientY - bubble.top,
      sceneLeft: bounds.left,
      sceneTop: bounds.top,
      sceneWidth: bounds.width,
      sceneHeight: bounds.height,
      bubbleWidth: bubble.width,
      bubbleHeight: bubble.height,
      moved: false,
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
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.phase === "aborted") return;

    const distance = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY);
    if (gesture.phase === "pending") {
      if (distance <= MOVE_SLOP) return;
      // The finger is moving before the long-press completed: this is a scroll.
      // Cancel the press and let the browser pan natively.
      clearArmTimer();
      gesture.phase = "aborted";
      setPressedId(null);
      return;
    }

    if (distance > MOVE_SLOP && !gesture.moved) {
      gesture.moved = true;
      suppressClickRef.current = true;
      setHasDragged(true);
      markDragHintSeen();
    }
    if (!gesture.moved) return;
    // The layer keeps its original placement and moves with a transform, so
    // dragging only invalidates the compositor, never layout.
    const baseX = gesture.startX - gesture.sceneLeft - gesture.grabX;
    const baseY = gesture.startY - gesture.sceneTop - gesture.grabY;
    const maxX = Math.max(0, gesture.sceneWidth - gesture.bubbleWidth);
    const maxY = Math.max(0, gesture.sceneHeight - gesture.bubbleHeight);
    const targetX = Math.max(0, Math.min(maxX, event.clientX - gesture.sceneLeft - gesture.grabX));
    const targetY = Math.max(0, Math.min(maxY, event.clientY - gesture.sceneTop - gesture.grabY));
    setPositions((current) => ({
      ...current,
      [gesture.id]: {
        x: baseX,
        y: baseY,
        dx: targetX - baseX,
        dy: targetY - baseY,
        width: gesture.bubbleWidth,
        height: gesture.bubbleHeight,
      },
    }));
  };

  const handleDragEnd = (event: PointerEvent<HTMLAnchorElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    clearArmTimer();
    releaseTouchScroll();
    gestureRef.current = null;
    setDraggingId(null);
    setPressedId(null);
    if (!gesture.moved) {
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

  /** Android opens the link menu on long-press, which would interrupt a drag. */
  const handleContextMenu = (event: MouseEvent<HTMLAnchorElement>) => {
    if (lastPointerTypeRef.current === "touch") {
      event.preventDefault();
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
              onContextMenu={handleContextMenu}
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
