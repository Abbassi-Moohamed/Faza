"use client";

import { useEffect, useMemo, useState } from "react";

import type { Dictionary } from "@/i18n/dictionary";
import { isHttpUrl } from "@/lib/validators";
import { cn, uniqueSlug } from "@/lib/utils";

export interface CoffeeFormValues {
  name: string;
  logo: string;
  cover?: string;
  slug: string;
}

interface CoffeeFormProps {
  dict: Dictionary;
  mode: "create" | "edit";
  /** Initial values for edit mode. */
  initial?: CoffeeFormValues;
  /** Slugs already taken by other coffees (used to auto-suggest unique slugs on create). */
  reservedSlugs?: string[];
  title: string;
  busy: boolean;
  /** Server-side error (already translated), shown above the action row. */
  error?: string | null;
  /** Hide the cancel button (e.g. when the form fills a whole panel). */
  hideCancel?: boolean;
  /** For coffee admins (edit own profile), the slug is read-only. */
  slugReadOnly?: boolean;
  onSubmit: (values: CoffeeFormValues) => Promise<void>;
  onUpload: (file: File) => Promise<string>;
  onCancel: () => void;
}

/**
 * Create/edit form for a coffee. Creation only asks for the required name and
 * slug; editing exposes every coffee attribute. The slug defaults to the
 * slugified coffee name and is adjusted if that slug is already taken.
 */
export function CoffeeForm({
  dict,
  mode,
  initial,
  reservedSlugs = [],
  title,
  busy,
  error,
  hideCancel,
  slugReadOnly = false,
  onSubmit,
  onUpload,
  onCancel,
}: CoffeeFormProps) {
  const t = dict.admin.coffeeForm;
  const [name, setName] = useState(initial?.name ?? "");
  const [logo, setLogo] = useState(initial?.logo ?? "");
  const [cover, setCover] = useState(initial?.cover ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit" || slugReadOnly);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initial?.logo ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState(initial?.cover ?? "");
  const initialSlug = initial?.slug;

  useEffect(() => {
    const nextName = initial?.name ?? "";
    const nextLogo = initial?.logo ?? "";
    const nextCover = initial?.cover ?? "";
    const nextSlug = initial?.slug ?? "";
    const timer = window.setTimeout(() => {
      setName(nextName);
      setLogo(nextLogo);
      setCover(nextCover);
      setSlug(nextSlug);
      setPreview(nextLogo);
      setCoverPreview(nextCover);
      setFile(null);
      setCoverFile(null);
      setSlugTouched(mode === "edit" || slugReadOnly);
      setFieldError(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initial?.name, initial?.logo, initial?.cover, initial?.slug, mode, slugReadOnly]);

  const takenSlugs = useMemo(() => {
    const set = new Set(reservedSlugs.map((value) => value.toLowerCase()));
    if (initialSlug) {
      set.delete(initialSlug.toLowerCase());
    }
    return set;
  }, [initialSlug, reservedSlugs]);

  useEffect(
    () => () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    },
    [preview, coverPreview],
  );

  const suggestedSlug = useMemo(() => {
    if (mode !== "create") return initialSlug ?? "";
    const trimmedName = name.trim();
    if (trimmedName.length === 0) return "";
    return uniqueSlug(trimmedName, takenSlugs);
  }, [mode, name, takenSlugs, initialSlug]);

  useEffect(() => {
    if (mode !== "create" || slugTouched || slugReadOnly) return;
    const trimmed = slug.trim();
    if (trimmed.length === 0) {
      if (suggestedSlug && suggestedSlug !== slug) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSlug(suggestedSlug);
      }
      return;
    }
    if (takenSlugs.has(trimmed.toLowerCase()) && suggestedSlug && suggestedSlug !== slug) {
      setSlug(suggestedSlug);
    }
  }, [mode, slugTouched, slug, suggestedSlug, takenSlugs, slugReadOnly]);

  const handleSubmit = async () => {
    if (submitting) return;
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();

    if (trimmedName.length === 0) {
      setFieldError(t.nameRequired);
      return;
    }
    if (trimmedSlug.length === 0) {
      setFieldError(t.slugRequired ?? t.slugInvalid);
      return;
    }
    if (!slugReadOnly && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmedSlug)) {
      setFieldError(t.slugInvalid);
      return;
    }
    if (mode === "edit") {
      const currentLogo = file ? preview : logo.trim();
      if (!file && (currentLogo.length === 0 || (!currentLogo.startsWith("blob:") && !isHttpUrl(currentLogo)))) {
        setFieldError(t.logoRequired);
        return;
      }
      const currentCover = coverFile ? coverPreview : cover.trim();
      if (!coverFile && currentCover.length > 0 && !currentCover.startsWith("blob:") && !isHttpUrl(currentCover)) {
        setFieldError(t.urlInvalid);
        return;
      }
    }

    setFieldError(null);
    setSubmitting(true);
    try {
      if (mode === "create") {
        await onSubmit({ name: trimmedName, logo: "", slug: trimmedSlug });
        return;
      }
      const uploadedLogo = file ? await onUpload(file) : logo.trim();
      const uploadedCover = coverFile ? await onUpload(coverFile) : cover.trim();
      await onSubmit({
        name: trimmedName,
        logo: uploadedLogo,
        cover: uploadedCover || undefined,
        slug: slugReadOnly ? (initialSlug ?? trimmedSlug) : trimmedSlug,
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

      {mode === "edit" ? (
        <>
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
            <span className="admin-field__hint">{t.logoHint}</span>
          </label>
        </>
      ) : null}

      <label className="admin-field">
        <span className="admin-field__label">{t.slug}</span>
        <input
          className="admin-field__input"
          type="text"
          value={slug}
          placeholder={t.slugPlaceholder ?? initial?.slug ?? "cafe-el-manzah"}
          disabled={busy || submitting || slugReadOnly}
          readOnly={slugReadOnly}
          onChange={(event) => {
            if (slugReadOnly) return;
            setSlugTouched(true);
            setSlug(event.target.value.toLowerCase());
          }}
        />
        <span className="admin-field__hint">
          {slugReadOnly ? t.slugHint : mode === "create" ? (t.slugCreateHint ?? t.slugHint) : t.slugHint}
        </span>
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
