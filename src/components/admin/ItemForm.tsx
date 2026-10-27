"use client";

import { useEffect, useRef, useState } from "react";

import type { Dictionary } from "@/i18n/dictionary";
import { isValidPrice } from "@/lib/validators";
import { cn } from "@/lib/utils";
import type { AdminImageDto, ItemMediaDto } from "@/types/backend";

import { ItemMediaManager, type ItemMediaDraft } from "./ItemMediaManager";

export interface ItemFormValues {
  name: string;
  description?: string;
  price: number;
  promotion: number | null;
  isAvailable: boolean;
  media: { url: string; alt?: string }[];
}

interface ItemFormProps {
  dict: Dictionary;
  title: string;
  /** Existing values when editing (price is the backend decimal, e.g. `4.5`). */
  initial?: {
    name: string;
    description: string | null;
    price: number;
    promotion: number | null;
    isAvailable: boolean;
    media: ItemMediaDto[];
  };
  busy: boolean;
  /** Server-side error (already translated). */
  error?: string | null;
  onSubmit: (values: ItemFormValues) => Promise<void>;
  onUploadMedia: (file: File) => Promise<AdminImageDto>;
  onDeleteUpload: (imageId: string) => Promise<void>;
  onCancel: () => void;
}

function draftFromDto(media: ItemMediaDto): ItemMediaDraft {
  return {
    key: media.imageId ?? media.url,
    imageId: media.imageId,
    url: media.url,
    type: media.type,
    mimeType: media.mimeType,
    durationMs: media.durationMs,
    alt: media.alt,
    isNew: false,
  };
}

export function ItemForm({
  dict,
  title,
  initial,
  busy,
  error,
  onSubmit,
  onUploadMedia,
  onDeleteUpload,
  onCancel,
}: ItemFormProps) {
  const t = dict.admin.items;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [promotion, setPromotion] = useState(initial?.promotion != null ? String(initial.promotion) : "");
  const [isAvailable, setIsAvailable] = useState(initial?.isAvailable ?? true);
  const [media, setMedia] = useState<ItemMediaDraft[]>(() => (initial?.media ?? []).map(draftFromDto));
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mediaRef = useRef(media);
  const deleteRef = useRef(onDeleteUpload);
  const savedRef = useRef(false);

  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(() => {
    deleteRef.current = onDeleteUpload;
  }, [onDeleteUpload]);

  useEffect(
    () => () => {
      if (savedRef.current) return;
      for (const entry of mediaRef.current) {
        if (entry.isNew && entry.imageId) {
          void deleteRef.current(entry.imageId).catch(() => undefined);
        }
      }
    },
    [],
  );

  const handleSubmit = async () => {
    if (submitting) return;
    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      setFieldError(t.nameRequired);
      return;
    }
    if (!isValidPrice(price)) {
      setFieldError(t.priceInvalid);
      return;
    }
    if (
      promotion.trim().length > 0 &&
      (!isValidPrice(promotion) || Number(promotion) <= 0 || Number(promotion) >= Number(price))
    ) {
      setFieldError(t.promotionInvalid);
      return;
    }

    setFieldError(null);
    setSubmitting(true);
    savedRef.current = true;
    try {
      await onSubmit({
        name: trimmedName,
        description: description.trim().length > 0 ? description.trim() : undefined,
        price: Number(price),
        promotion: promotion.trim().length > 0 ? Number(promotion) : null,
        isAvailable,
        media: media.map((entry) => ({
          url: entry.url,
          alt: entry.alt ?? undefined,
        })),
      });
    } catch (submitError) {
      savedRef.current = false;
      setFieldError(submitError instanceof Error ? submitError.message : t.uploadFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className={cn("admin-form", (busy || submitting) && "admin-form--disabled")}
      aria-busy={busy || submitting}
    >
      <div className="admin-form__head">
        <h3 className="admin-form__title">{title}</h3>
      </div>

      <label className="admin-field">
        <span className="admin-field__label">{t.name}</span>
        <input
          className="admin-field__input"
          type="text"
          value={name}
          placeholder={t.namePlaceholder}
          disabled={busy || submitting}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <label className="admin-field">
        <span className="admin-field__label">{t.promotion}</span>
        <input
          className="admin-field__input"
          type="number"
          inputMode="decimal"
          min="0.001"
          step="0.001"
          value={promotion}
          placeholder={t.promotionPlaceholder}
          disabled={busy || submitting}
          onChange={(event) => setPromotion(event.target.value)}
        />
        <span className="admin-field__hint">{t.promotionHint}</span>
      </label>

      <label className="admin-field admin-field--checkbox">
        <span className="admin-field__label">{t.availability}</span>
        <input
          type="checkbox"
          checked={isAvailable}
          disabled={busy || submitting}
          onChange={(event) => setIsAvailable(event.target.checked)}
        />
        <span>{isAvailable ? t.available : t.unavailable}</span>
      </label>

      <label className="admin-field">
        <span className="admin-field__label">{t.description}</span>
        <textarea
          className="admin-field__input admin-field__textarea"
          rows={3}
          value={description}
          placeholder={t.descriptionPlaceholder}
          disabled={busy || submitting}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      <label className="admin-field">
        <span className="admin-field__label">{t.price}</span>
        <input
          className="admin-field__input"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.001"
          value={price}
          placeholder={t.pricePlaceholder}
          disabled={busy || submitting}
          onChange={(event) => setPrice(event.target.value)}
        />
      </label>

      <ItemMediaManager
        dict={dict}
        media={media}
        onChange={setMedia}
        onUpload={onUploadMedia}
        onDeleteUpload={onDeleteUpload}
        disabled={busy || submitting}
      />

      {fieldError ? (
        <p className="admin-form__error" role="alert">
          {fieldError}
        </p>
      ) : null}
      {error ? (
        <p className="admin-form__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-form__actions">
        <button type="button" className="admin-btn admin-btn--ghost" disabled={busy || submitting} onClick={onCancel}>
          {dict.admin.coffeeForm.cancel}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={busy || submitting}
          onClick={() => void handleSubmit()}
        >
          {busy || submitting ? dict.admin.coffeeForm.saving : dict.admin.coffeeForm.save}
        </button>
      </div>
    </section>
  );
}
