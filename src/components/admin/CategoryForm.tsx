"use client";

import { useState } from "react";

import type { Dictionary } from "@/i18n/dictionary";
import { cn } from "@/lib/utils";
import { isHttpUrl } from "@/lib/validators";

interface CategoryFormProps {
  dict: Dictionary;
  title: string;
  /** Existing name when editing. */
  initialName?: string;
  initialImage?: string | null;
  busy: boolean;
  /** Server-side error (already translated). */
  error?: string | null;
  onSubmit: (values: { name: string; image?: string }) => Promise<void>;
  onUpload: (file: File) => Promise<string>;
  onCancel: () => void;
}

export function CategoryForm({
  dict,
  title,
  initialName,
  initialImage,
  busy,
  error,
  onSubmit,
  onUpload,
  onCancel,
}: CategoryFormProps) {
  const t = dict.admin.categories;
  const [name, setName] = useState(initialName ?? "");
  const [image, setImage] = useState(initialImage ?? "");
  const [preview, setPreview] = useState(initialImage ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (submitting) return;
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setFieldError(t.nameRequired);
      return;
    }
    if (!file && image.trim().length > 0 && !isHttpUrl(image.trim())) {
      setFieldError(t.urlInvalid);
      return;
    }
    setFieldError(null);
    setSubmitting(true);
    try {
      const uploadedImage = file ? await onUpload(file) : image.trim();
      await onSubmit({ name: trimmed, image: uploadedImage || undefined });
    } catch (submitError) {
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
        <span className="admin-field__label">{t.image}</span>
        <input
          className="admin-field__input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={busy || submitting}
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            if (!selected) return;
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
