"use client";

import { useEffect, useState } from "react";

import type { Dictionary } from "@/i18n/dictionary";
import { isHttpUrl, isValidPrice } from "@/lib/validators";
import { cn } from "@/lib/utils";

export interface ItemFormValues {
  name: string;
  description?: string;
  price: number;
  promotion: number | null;
  isAvailable: boolean;
  image?: string;
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
    image: string | null;
  };
  busy: boolean;
  /** Server-side error (already translated). */
  error?: string | null;
  onSubmit: (values: ItemFormValues) => Promise<void>;
  onUpload: (file: File) => Promise<string>;
  onCancel: () => void;
}

export function ItemForm({ dict, title, initial, busy, error, onSubmit, onUpload, onCancel }: ItemFormProps) {
  const t = dict.admin.items;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [promotion, setPromotion] = useState(initial?.promotion != null ? String(initial.promotion) : "");
  const [isAvailable, setIsAvailable] = useState(initial?.isAvailable ?? true);
  const [image, setImage] = useState(initial?.image ?? "");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initial?.image ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(
    () => () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const handleSubmit = async () => {
    if (submitting) return;
    const trimmedName = name.trim();
    const trimmedImage = image.trim();

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
    if (!file && trimmedImage.length > 0 && !isHttpUrl(trimmedImage)) {
      setFieldError(t.urlInvalid);
      return;
    }

    setFieldError(null);
    setSubmitting(true);
    try {
      const uploadedImage = file ? await onUpload(file) : trimmedImage;
      await onSubmit({
        name: trimmedName,
        description: description.trim().length > 0 ? description.trim() : undefined,
        price: Number(price),
        promotion: promotion.trim().length > 0 ? Number(promotion) : null,
        isAvailable,
        image: uploadedImage.length > 0 ? uploadedImage : undefined,
      });
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : t.uploadFailed);
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

      <label className="admin-field">
        <span className="admin-field__label">{t.image}</span>
        <input
          className="admin-field__input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={busy || submitting}
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            if (!selected) return;
            if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
          }}
        />
        {preview ? (
          // Blob previews cannot be passed through next/image's remote loader.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="admin-upload-preview" src={preview} alt={t.imagePreview} />
        ) : null}
        <input
          className="admin-field__input"
          type="url"
          inputMode="url"
          value={image}
          placeholder={t.imagePlaceholder}
          disabled={busy || submitting}
          onChange={(event) => setImage(event.target.value)}
        />
        <span className="admin-field__hint">{t.imageHint}</span>
      </label>

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
