import type { MenuMedia } from "@/types/menu";

export const ITEM_MEDIA_LIMIT = 5;
export const MAX_IMAGE_MB = 25;
export const MAX_VIDEO_MB = 15;
export const MAX_VIDEO_SECONDS = 5;
export const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);

export type MediaValidationError = "count" | "type" | "size";

export function mediaTypeForFile(file: File): "image" | "video" | null {
  if (IMAGE_TYPES.has(file.type)) return "image";
  if (VIDEO_TYPES.has(file.type)) return "video";
  return null;
}

export function validateMediaFile(file: File, currentCount: number): MediaValidationError | null {
  if (currentCount >= ITEM_MEDIA_LIMIT) return "count";
  const type = mediaTypeForFile(file);
  if (!type) return "type";
  const maxBytes = (type === "video" ? MAX_VIDEO_MB : MAX_IMAGE_MB) * 1024 * 1024;
  if (file.size > maxBytes) return "size";
  return null;
}

export function readVideoDurationSeconds(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;

    const finish = (duration: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(duration);
    };

    const timeout = window.setTimeout(() => finish(null), 8_000);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => finish(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => finish(null);
    video.src = url;
  });
}

export function formatMediaDuration(durationMs: number | null | undefined): string {
  if (durationMs == null || !Number.isFinite(durationMs)) return "";
  const seconds = durationMs / 1000;
  return `${seconds.toFixed(seconds < 10 ? 1 : 0).replace(".", ",")} s`;
}

export function mediaKey(media: Pick<MenuMedia, "imageId" | "url">): string {
  return media.imageId ?? media.url;
}
