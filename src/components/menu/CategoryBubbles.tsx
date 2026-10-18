"use client";

import type { CSSProperties, MouseEvent, PointerEvent } from "react";
import { useRef, useState } from "react";
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
        aria-label={`${category.name}. Faites glisser pour déplacer.`}
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
          <img className="bubble__image" src={category.image} alt="" />
        ) : (
          categoryIcon(category.id, category.name)
        )}
      </span>
      <span className="bubble__name">{category.name}</span>
      </Link>
    </div>
  );
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
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number; width: number; height: number }>
  >({});
  const dragRef = useRef<{
    id: string;
    pointerId: number;
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
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const [lastTouchedId, setLastTouchedId] = useState<string | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);
  const getScene = (event: PointerEvent<HTMLAnchorElement>) => {
    const scene = event.currentTarget.closest(".bubble-field");
    if (!scene || typeof window === "undefined") {
      return null;
    }

    const bounds = scene.getBoundingClientRect();
    return { element: scene, bounds };
  };

  const handleDragStart = (id: string, event: PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const scene = getScene(event);
    if (!scene) return;
    suppressClickRef.current = false;
    setLastTouchedId(id);
    setPressedId(id);
    const bubble = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      grabX: event.clientX - bubble.left,
      grabY: event.clientY - bubble.top,
      sceneLeft: scene.bounds.left,
      sceneTop: scene.bounds.top,
      sceneWidth: scene.bounds.width,
      sceneHeight: scene.bounds.height,
      bubbleWidth: bubble.width,
      bubbleHeight: bubble.height,
      moved: false,
    };
    setDraggingId(id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragMove = (event: PointerEvent<HTMLAnchorElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextX = event.clientX - drag.sceneLeft - drag.grabX;
    const nextY = event.clientY - drag.sceneTop - drag.grabY;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6) {
      if (!drag.moved) {
        setPositions((current) => ({
          ...current,
          [drag.id]: {
            x: drag.startX - drag.sceneLeft - drag.grabX,
            y: drag.startY - drag.sceneTop - drag.grabY,
            width: drag.bubbleWidth,
            height: drag.bubbleHeight,
          },
        }));
        setHasDragged(true);
      }
      drag.moved = true;
      suppressClickRef.current = true;
    }
    if (!drag.moved) return;
    const maxX = Math.max(0, drag.sceneWidth - drag.bubbleWidth);
    const maxY = Math.max(0, drag.sceneHeight - drag.bubbleHeight);
    setPositions((current) => ({
      ...current,
      [drag.id]: {
        x: Math.max(0, Math.min(maxX, nextX)),
        y: Math.max(0, Math.min(maxY, nextY)),
        width: drag.bubbleWidth,
        height: drag.bubbleHeight,
      },
    }));
  };

  const handleDragEnd = (event: PointerEvent<HTMLAnchorElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setDraggingId(null);
      setPressedId(null);
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
    </nav>
  );
}