"use client";

import { useRef, useState } from "react";

import type { Dictionary } from "@/i18n/dictionary";
import {
  formatMediaDuration,
  ITEM_MEDIA_LIMIT,
  MEDIA_ACCEPT,
  mediaTypeForFile,
  readVideoDurationSeconds,
  validateMediaFile,
} from "@/lib/media";
import { isHttpUrl } from "@/lib/validators";
import type { AdminImageDto } from "@/types/backend";

export interface ItemMediaDraft {
  key: string;
  imageId: string | null;
  url: string;
  type: "image" | "video";
  mimeType: string | null;
  durationMs: number | null;
  alt: string | null;
  isNew?: boolean;
}

interface ItemMediaManagerProps {
  dict: Dictionary;
  media: ItemMediaDraft[];
  onChange: (media: ItemMediaDraft[]) => void;
  onUpload: (file: File) => Promise<AdminImageDto>;
  onDeleteUpload: (imageId: string) => Promise<void>;
  disabled?: boolean;
}

export function ItemMediaManager({
  dict,
  media,
  onChange,
  onUpload,
  onDeleteUpload,
  disabled = false,
}: ItemMediaManagerProps) {
  const t = dict.admin.items;
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = disabled || uploading || removing;

  const handleFiles = async (files: File[]) => {
    if (busy || files.length === 0) return;

    setError(null);
    setUploading(true);
    let next = [...media];
    let firstError: string | null = null;

    for (const file of files) {
      const validation = validateMediaFile(file, next.length);
      if (validation === "count") {
        firstError ??= t.mediaLimit;
        break;
      }
      if (validation === "type") {
        firstError ??= t.mediaTypeInvalid;
        continue;
      }
      if (validation === "size") {
        firstError ??= t.mediaSizeInvalid;
        continue;
      }

      const type = mediaTypeForFile(file);
      if (type === "video") {
        const duration = await readVideoDurationSeconds(file);
        if (duration === null) {
          firstError ??= t.mediaDurationInvalid;
          continue;
        }
      }

      try {
        const uploaded = await onUpload(file);
        next = [
          ...next,
          {
            key: uploaded.imageId,
            imageId: uploaded.imageId,
            url: uploaded.url,
            type: uploaded.mediaType,
            mimeType: uploaded.mimeType,
            durationMs: uploaded.durationMs,
            alt: null,
            isNew: true,
          },
        ];
        onChange(next);
      } catch {
        firstError ??= t.mediaUploadFailed;
      }
    }

    setUploading(false);
    if (firstError) setError(firstError);
  };

  const removeAt = async (index: number) => {
    if (busy) return;
    const target = media[index];
    if (!target) return;

    setError(null);
    if (target.isNew && target.imageId) {
      setRemoving(true);
      try {
        await onDeleteUpload(target.imageId);
      } catch {
        setError(t.mediaDeleteFailed);
      } finally {
        setRemoving(false);
      }
    }
    onChange(media.filter((_, candidate) => candidate !== index));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (busy || target < 0 || target >= media.length) return;
    const next = [...media];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addUrl = () => {
    if (busy) return;
    const url = urlInput.trim();
    if (url.length === 0) return;
    if (media.length >= ITEM_MEDIA_LIMIT) {
      setError(t.mediaLimit);
      return;
    }
    if (!isHttpUrl(url)) {
      setError(t.mediaUrlInvalid);
      return;
    }
    if (media.some((entry) => entry.url === url)) {
      setError(t.mediaDuplicate);
      return;
    }
    setError(null);
    onChange([
      ...media,
      {
        key: url,
        imageId: null,
        url,
        type: "image",
        mimeType: null,
        durationMs: null,
        alt: null,
        isNew: false,
      },
    ]);
    setUrlInput("");
  };

  return (
    <div className="media-manager" aria-busy={busy}>
      <div className="media-manager__head">
        <span className="admin-field__label">{t.media}</span>
        <span className="media-manager__count">{t.mediaCount(media.length, ITEM_MEDIA_LIMIT)}</span>
      </div>

      <div className="media-manager__grid">
        {media.map((entry, index) => (
          <figure key={entry.key} className={`media-tile${index === 0 ? " media-tile--cover" : ""}`}>
            <div className="media-tile__preview">
              {entry.type === "video" ? (
                <video
                  src={entry.url}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onMouseEnter={(event) => void event.currentTarget.play().catch(() => undefined)}
                  onMouseLeave={(event) => event.currentTarget.pause()}
                  onClick={(event) => {
                    if (event.currentTarget.paused) {
                      void event.currentTarget.play().catch(() => undefined);
                    } else {
                      event.currentTarget.pause();
                    }
                  }}
                />
              ) : (
                // GIFs must stay animated, so they cannot go through next/image.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.url} alt="" loading="lazy" />
              )}
              <span className="media-tile__badge">
                {index === 0
                  ? t.mediaCover
                  : entry.type === "video"
                    ? `${t.mediaVideo}${entry.durationMs ? ` ${formatMediaDuration(entry.durationMs)}` : ""}`
                    : String(index + 1)}
              </span>
            </div>
            <div className="media-tile__actions">
              <button
                type="button"
                className="media-tile__action"
                aria-label={t.mediaMoveLeft}
                title={t.mediaMoveLeft}
                disabled={busy || index === 0}
                onClick={() => move(index, -1)}
              >
                ←
              </button>
              <button
                type="button"
                className="media-tile__action"
                aria-label={t.mediaMoveRight}
                title={t.mediaMoveRight}
                disabled={busy || index === media.length - 1}
                onClick={() => move(index, 1)}
              >
                →
              </button>
              <button
                type="button"
                className="media-tile__action media-tile__action--danger"
                aria-label={t.mediaRemove}
                title={t.mediaRemove}
                disabled={busy}
                onClick={() => void removeAt(index)}
              >
                ×
              </button>
            </div>
          </figure>
        ))}

        {media.length < ITEM_MEDIA_LIMIT ? (
          <label
            className={`media-manager__add${dragActive ? " media-manager__add--dragging" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              if (!busy) setDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!busy) setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              void handleFiles(Array.from(event.dataTransfer.files));
            }}
            aria-disabled={busy}
          >
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept={MEDIA_ACCEPT}
              multiple
              disabled={busy}
              onChange={(event) => {
                const files = event.target.files ? Array.from(event.target.files) : [];
                event.target.value = "";
                void handleFiles(files);
              }}
            />
            <span className="media-manager__plus" aria-hidden="true">
              +
            </span>
            <span className="media-manager__add-label">{uploading ? t.mediaUploading : t.mediaAdd}</span>
            <small>{t.mediaDrop}</small>
          </label>
        ) : null}
      </div>

      <div className="media-manager__url">
        <input
          className="admin-field__input"
          type="url"
          inputMode="url"
          value={urlInput}
          placeholder={t.mediaUrlPlaceholder}
          aria-label={t.mediaUrlPlaceholder}
          disabled={busy}
          onChange={(event) => setUrlInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addUrl();
            }
          }}
        />
        <button type="button" className="admin-btn admin-btn--ghost" disabled={busy} onClick={addUrl}>
          {t.mediaAddUrl}
        </button>
      </div>

      <span className="admin-field__hint">{t.mediaHint}</span>
      {error ? (
        <p className="admin-form__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
