import type { CSSProperties } from "react";

type ItemArtStyle = CSSProperties & { "--art-from"?: string; "--art-to"?: string };

export function accentGradientStyle(accent: string): ItemArtStyle {
  return {
    "--art-from": `color-mix(in srgb, ${accent} 82%, white)`,
    "--art-to": accent,
  } as ItemArtStyle;
}
