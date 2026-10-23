"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Dictionary } from "@/i18n/dictionary";
import { formatPrice } from "@/lib/menu";
import { isHttpUrl, isValidPrice } from "@/lib/validators";
import { siteConfig } from "@/config/site";
import type { AdminOfferDto, OfferLineBody } from "@/types/backend";

export interface OfferFormItem {
  id: string;
  name: string;
  price: number;
  promotion: number | null;
  categoryName: string;
}

export interface OfferFormValues {
  name: string;
  description?: string;
  price: number;
  stock: number;
  lines: OfferLineBody[];
  image?: string;
  startAt?: string | null;
  endAt?: string | null;
  isActive: boolean;
}

interface OfferFormProps {
  dict: Dictionary;
  title: string;
  items: OfferFormItem[];
  /** Existing offer when editing. */
  initial?: AdminOfferDto;
  busy: boolean;
  error?: string | null;
  onSubmit: (values: OfferFormValues) => Promise<void>;
  onUpload: (file: File) => Promise<string>;
  onCancel: () => void;
}

function toDateTimeInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

const round = (value: number) => Math.round(value * 100) / 100;

export function OfferForm({ dict, title, items, initial, busy, error, onSubmit, onUpload, onCancel }: OfferFormProps) {
  const t = dict.admin.offers;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [stock, setStock] = useState(initial ? String(initial.stock) : "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [startAt, setStartAt] = useState(toDateTimeInput(initial?.startAt));
  const [endAt, setEndAt] = useState(toDateTimeInput(initial?.endAt));
  const [image, setImage] = useState(initial?.image ?? "");
  const [lines, setLines] = useState<OfferLineBody[]>(
    initial?.lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity })) ?? [],
  );
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initial?.image ?? "");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(
    () => () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const originalPrice = useMemo(
    () =>
      round(
        lines.reduce((sum, line) => {
          const item = itemMap.get(line.itemId);
          if (!item) return sum;
          return sum + (item.promotion ?? item.price) * line.quantity;
        }, 0),
      ),
    [lines, itemMap],
  );

  const usedIds = new Set(lines.map((line) => line.itemId));
  const nextAvailable = items.find((item) => !usedIds.has(item.id));
  const parsedPrice = Number(price);
  const savings = isValidPrice(price) ? round(originalPrice - parsedPrice) : null;

  const updateLine = (itemId: string, patch: Partial<OfferLineBody>) => {
    setLines((current) => current.map((line) => (line.itemId === itemId ? { ...line, ...patch } : line)));
  };

  const removeImage = () => {
    setFile(null);
    setImage("");
    setPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return "";
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const trimmedName = name.trim();
    const trimmedImage = image.trim();

    if (trimmedName.length === 0) {
      setFieldError(t.nameRequired);
      return;
    }
    if (!isValidPrice(price) || parsedPrice <= 0) {
      setFieldError(t.priceInvalid);
      return;
    }
    if (!/^\d+$/.test(stock.trim()) || Number(stock) > 9999) {
      setFieldError(t.stockInvalid);
      return;
    }
    if (lines.length === 0) {
      setFieldError(t.linesRequired);
      return;
    }
    if (lines.some((line) => !itemMap.has(line.itemId) || line.quantity < 1 || line.quantity > 99)) {
      setFieldError(t.linesRequired);
      return;
    }
    if (round(parsedPrice) >= round(originalPrice)) {
      setFieldError(t.dealInvalid);
      return;
    }
    if (startAt && endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      setFieldError(t.windowInvalid);
      return;
    }
    if (!file && trimmedImage.length > 0 && !isHttpUrl(trimmedImage)) {
      setFieldError(t.imageInvalid);
      return;
    }

    setFieldError(null);
    setSubmitting(true);
    try {
      const uploadedImage = file ? await onUpload(file) : trimmedImage;
      await onSubmit({
        name: trimmedName,
        description: description.trim().length > 0 ? description.trim() : undefined,
        price: parsedPrice,
        stock: Number(stock),
        lines,
        image: uploadedImage.length > 0 ? uploadedImage : undefined,
        startAt: startAt ? new Date(startAt).toISOString() : null,
        endAt: endAt ? new Date(endAt).toISOString() : null,
        isActive,
      });
    } catch (uploadError) {
      setFieldError(uploadError instanceof Error ? uploadError.message : t.uploadFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const working = busy || submitting;

  return (
    <section className="admin-section admin-form-page">
      <div className="admin-head">
        <div className="admin-head__text">
          <h2 className="admin-head__title">{title}</h2>
          <p className="admin-head__hint">{t.hint}</p>
        </div>
      </div>

      <div className="admin-form">
        <label className="admin-field">
          <span className="admin-field__label">{t.name}</span>
          <input
            className="admin-field__input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t.namePlaceholder}
          />
        </label>

        <label className="admin-field">
          <span className="admin-field__label">{t.description}</span>
          <textarea
            className="admin-field__input admin-field__textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t.descriptionPlaceholder}
            rows={2}
          />
        </label>

        <div className="admin-form__row">
          <label className="admin-field">
            <span className="admin-field__label">{t.price}</span>
            <input
              className="admin-field__input"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              inputMode="decimal"
              placeholder={t.pricePlaceholder}
            />
          </label>
          <label className="admin-field">
            <span className="admin-field__label">{t.stock}</span>
            <input
              className="admin-field__input"
              value={stock}
              onChange={(event) => setStock(event.target.value)}
              inputMode="numeric"
              placeholder={t.stockPlaceholder}
            />
          </label>
        </div>

        <div className="admin-offer-totals">
          <span>
            {t.originalPrice} : <strong>{formatPrice(originalPrice, siteConfig.currency, siteConfig.locale)}</strong>
          </span>
          {savings !== null && savings > 0 ? (
            <span>
              {t.savings} : <strong>{formatPrice(savings, siteConfig.currency, siteConfig.locale)}</strong>
            </span>
          ) : null}
        </div>
        <p className="admin-field__hint">{t.dealHint}</p>

        <div className="admin-offer-lines">
          <div className="admin-offer-lines__head">
            <div>
              <h3 className="admin-offer-lines__title">{t.linesTitle}</h3>
              <p className="admin-field__hint">{t.linesHint}</p>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              disabled={!nextAvailable}
              onClick={() => nextAvailable && setLines([...lines, { itemId: nextAvailable.id, quantity: 1 }])}
            >
              {t.addLine}
            </button>
          </div>

          {lines.length === 0 ? <p className="admin-field__hint">{t.noLines}</p> : null}

          {lines.map((line) => (
            <div className="admin-offer-line" key={line.itemId}>
              <select
                className="admin-field__input"
                value={line.itemId}
                aria-label={t.item}
                onChange={(event) => updateLine(line.itemId, { itemId: event.target.value })}
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id} disabled={item.id !== line.itemId && usedIds.has(item.id)}>
                    {item.name} — {item.categoryName}
                  </option>
                ))}
              </select>
              <input
                className="admin-field__input admin-offer-line__qty"
                value={line.quantity}
                aria-label={t.quantity}
                inputMode="numeric"
                onChange={(event) => {
                  const value = Number(event.target.value.replace(/\D/g, ""));
                  updateLine(line.itemId, {
                    quantity: Number.isFinite(value) ? Math.min(99, Math.max(1, value || 1)) : 1,
                  });
                }}
              />
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => setLines((current) => current.filter((entry) => entry.itemId !== line.itemId))}
              >
                {t.removeLine}
              </button>
            </div>
          ))}
        </div>

        <div className="admin-form__row">
          <label className="admin-field">
            <span className="admin-field__label">{t.startAt}</span>
            <input
              type="datetime-local"
              className="admin-field__input"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span className="admin-field__label">{t.endAt}</span>
            <input
              type="datetime-local"
              className="admin-field__input"
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
            />
          </label>
        </div>
        <p className="admin-field__hint">{t.windowHint}</p>

        <label className="admin-checkbox">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          <span>
            <strong>{t.active}</strong>
            <small>{t.activeHint}</small>
          </span>
        </label>

        <div className="admin-field">
          <span className="admin-field__label">{t.image}</span>
          <div className="admin-image-field">
            <input
              ref={fileInputRef}
              className="admin-field__input"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setFile(nextFile);
                if (nextFile) {
                  if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
                  setPreview(URL.createObjectURL(nextFile));
                }
              }}
            />
            <span className="admin-field__hint">{t.imageHint}</span>
          </div>
          {preview ? (
            <div className="admin-image-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt={t.imagePreview} />
              <button type="button" className="admin-btn admin-btn--ghost" onClick={removeImage} disabled={working}>
                {t.imageRemove}
              </button>
            </div>
          ) : null}
        </div>

        {fieldError ? <p className="admin-form__error">{fieldError}</p> : null}
        {error ? <p className="admin-form__error">{error}</p> : null}

        <div className="admin-form__actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onCancel} disabled={working}>
            {t.cancel}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => void handleSubmit()}
            disabled={working}
          >
            {working ? t.saving : t.save}
          </button>
        </div>
      </div>
    </section>
  );
}
