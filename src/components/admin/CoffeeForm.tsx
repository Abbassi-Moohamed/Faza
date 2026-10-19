"use client";

import { useEffect, useState } from "react";

import type { Dictionary } from "@/i18n/dictionary";
import { isHttpUrl } from "@/lib/validators";
import { cn } from "@/lib/utils";

export interface CoffeeFormValues {
  name: string;
  logo: string;
  cover?: string;
  slug?: string;
}

interface CoffeeFormProps {
  dict: Dictionary;
  mode: "create" | "edit";
  /** Initial values for edit mode. */
  initial?: CoffeeFormValues;
  title: string;
  busy: boolean;
  /** Server-side error (already translated), shown above the action row. */
  error?: string | null;
  /** Hide the cancel button (e.g. when the form fills a whole panel). */
  hideCancel?: boolean;
  onSubmit: (values: CoffeeFormValues) => Promise<void>;
  onUpload: (file: File) => Promise<string>;
  onCancel: () => void;
}

/**
 * Create/edit form for a coffee (name, logo and — in edit mode — slug).
 * Slug generation for new coffees is intentionally left to the backend.
 */
export function CoffeeForm({
  dict,
  mode,
  initial,
  title,
  busy,
  error,
  hideCancel,
  onSubmit,
  onUpload,
  onCancel,
}: CoffeeFormProps) {
  const t = dict.admin.coffeeForm;
  const [name, setName] = useState(initial?.name ?? "");
  const [logo, setLogo] = useState(initial?.logo ?? "");
  const [cover, setCover] = useState(initial?.cover ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initial?.logo ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState(initial?.cover ?? "");

  useEffect(
    () => () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    },
    [preview, coverPreview],
  );

  const handleSubmit = async () => {
    if (submitting) return;
    const trimmedName = name.trim();
    const trimmedLogo = logo.trim();
    const trimmedSlug = slug.trim();

    if (trimmedName.length === 0) {
      setFieldError(t.nameRequired);
      return;
    }
    if (!file && (trimmedLogo.length === 0 || !isHttpUrl(trimmedLogo))) {
      setFieldError(t.logoRequired);
      return;
    }
    if (!coverFile && cover.trim().length > 0 && !isHttpUrl(cover.trim())) {
      setFieldError(t.urlInvalid);
      return;
    }
    if (mode === "edit" && trimmedSlug.length > 0 && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmedSlug)) {
      setFieldError(t.slugInvalid);
      return;
    }

    setFieldError(null);
    setSubmitting(true);
    try {
      const uploadedLogo = file ? await onUpload(file) : trimmedLogo;
      const uploadedCover = coverFile ? await onUpload(coverFile) : cover.trim();
      await onSubmit({
        name: trimmedName,
        logo: uploadedLogo,
        cover: uploadedCover || undefined,
        slug: mode === "edit" && trimmedSlug.length > 0 ? trimmedSlug : undefined,
      });
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : t.logoUploadFailed);
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
        <span className="admin-field__label">{t.cover}</span>
        <input
          className="admin-field__input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={busy || submitting}
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            if (!selected) return;
            if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
            setCoverFile(selected);
            setCoverPreview(URL.createObjectURL(selected));
          }}
        />
        {coverPreview ? (
          // Blob previews cannot be passed through next/image's remote loader.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="admin-upload-preview" src={coverPreview} alt={t.coverPreview} />
        ) : null}
        <input
          className="admin-field__input"
          type="url"
          inputMode="url"
          value={cover}
          placeholder={t.coverPlaceholder}
          disabled={busy || submitting}
          onChange={(event) => setCover(event.target.value)}
        />
        <span className="admin-field__hint">{t.coverHint}</span>
      </label>

      <label className="admin-field">
        <span className="admin-field__label">{t.logo}</span>
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
          <img className="admin-upload-preview" src={preview} alt={t.logoPreview} />
        ) : null}
        <input
          className="admin-field__input"
          type="url"
          inputMode="url"
          value={logo}
          placeholder={t.logoPlaceholder}
          disabled={busy || submitting}
          onChange={(event) => setLogo(event.target.value)}
        />
        <span className="admin-field__hint">{t.logoHint}</span>
      </label>

      {mode === "edit" ? (
        <label className="admin-field">
          <span className="admin-field__label">{t.slug}</span>
          <input
            className="admin-field__input"
            type="text"
            value={slug}
            placeholder={initial?.slug ?? ""}
            disabled={busy || submitting}
            onChange={(event) => setSlug(event.target.value)}
          />
          <span className="admin-field__hint">{t.slugHint}</span>
        </label>
      ) : null}

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
        {hideCancel ? null : (
          <button type="button" className="admin-btn admin-btn--ghost" disabled={busy || submitting} onClick={onCancel}>
            {t.cancel}
          </button>
        )}
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={busy || submitting}
          onClick={() => void handleSubmit()}
        >
          {busy || submitting ? t.saving : t.save}
        </button>
      </div>
    </section>
  );
}
