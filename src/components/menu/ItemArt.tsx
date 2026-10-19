"use client";

import Image from "next/image";
import { useState } from "react";

import type { MenuItem } from "@/types/menu";
import { accentGradientStyle } from "./accentGradient";

interface ItemArtProps {
  item: MenuItem;
  className?: string;
  imagePriority?: boolean;
  /** `sizes` hint passed to `next/image` so it can pick the right source width. */
  sizes?: string;
}

export function ItemArt({ item, className, imagePriority = false, sizes = "64px" }: ItemArtProps) {
  const [useImage, setUseImage] = useState(Boolean(item.image));

  if (item.image && useImage) {
    return (
      <Image
        src={item.image}
        alt=""
        fill
        sizes={sizes}
        className={className}
        priority={imagePriority}
        onError={() => setUseImage(false)}
      />
    );
  }

  return (
    <div
      className={`gradient-art ${className ?? ""}`}
      style={accentGradientStyle(item.accent ?? "#b45309")}
      aria-hidden="true"
    >
      <span className="gradient-art__monogram">{item.name.charAt(0)}</span>
    </div>
  );
}
