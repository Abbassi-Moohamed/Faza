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
  image: string | null;
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

function toWindowLabel(value: string): string {
  return new Intl.DateTimeFormat(siteConfig.locale, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: siteConfig.timeZone,
    hourCycle: "h23",
  }).format(new Date(value));
}

const round = (value: number) => Math.round(value * 100) / 100;
const money = (value: number) => formatPrice(value, siteConfig.currency, siteConfig.locale);

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 15V4m0 0L8 8m4-4 4 4M5 15.5v2.7A1.8 1.8 0 0 0 6.8 20h10.4a1.8 1.8 0 0 0 1.8-1.8v-2.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

  const groupedItems = useMemo(() => {
    const groups = new Map<string, OfferFormItem[]>();
    for (const item of items) {
      const entries = groups.get(item.categoryName) ?? [];
      entries.push(item);
      groups.set(item.categoryName, entries);
    }
    return [...groups.entries()];
  }, [items]);

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
  const hasDeal = savings !== null && savings > 0;
  const discountPercent = hasDeal && originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;

  const windowSummary = endAt
    ? startAt
      ? `${toWindowLabel(startAt)} → ${toWindowLabel(endAt)}`
      : t.windowUntil(toWindowLabel(endAt))
    : startAt
      ? t.windowFrom(toWindowLabel(startAt))
      : t.windowAlways;

  const updateLine = (itemId: string, patch: Partial<OfferLineBody>) => {
    setLines((current) => current.map((line) => (line.itemId === itemId ? { ...line, ...patch } : line)));
  };

  const removeLine = (itemId: string) => {
    setLines((current) => current.filter((entry) => entry.itemId !== itemId));
  };

  const openPicker = () => fileInputRef.current?.click();

  const removeImage = () => {
    setFile(null);
    setImage("");
    setPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return "";
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const applyToday = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 0, 0);
    setStartAt(toDateTimeInput(start.toISOString()));
    setEndAt(toDateTimeInput(end.toISOString()));
  };

  const clearWindow = () => {
    setStartAt("");
    setEndAt("");
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
    } catch {
      setFieldError(t.uploadFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const working = busy || submitting;

  return (
    <section className="admin-section admin-form-page">
      <div className="admin-head">
        <div className="admin-head__text">
          <p className="admin-form-page__eyebrow">{t.title}</p>
          <h2 className="admin-head__title">{title}</h2>
          <p className="admin-head__hint">{t.hint}</p>
        </div>
      </div>

      <form
        className="admin-form admin-offer-form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <fieldset className="admin-offer-panel">
          <legend className="admin-offer-panel__legend">{t.sectionOffer}</legend>

          <label className="admin-field">
            <span className="admin-field__label">{t.name}</span>
            <input
              className="admin-field__input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t.namePlaceholder}
              autoComplete="off"
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

          <div className="admin-field">
            <span className="admin-field__label">{t.image}</span>
            <input
              ref={fileInputRef}
              className="admin-offer-media__input"
              type="file"
              accept="image/*"
              aria-label={t.image}
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setFile(nextFile);
                if (nextFile) {
                  if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
                  setPreview(URL.createObjectURL(nextFile));
                }
              }}
            />
            <div className="admin-offer-media">
              {preview ? (
                <div className="admin-offer-media__preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt={t.imagePreview} />
                  <div className="admin-offer-media__actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost"
                      onClick={openPicker}
                      disabled={working}
                    >
                      {t.imageReplace}
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost"
                      onClick={removeImage}
                      disabled={working}
                    >
                      {t.imageRemove}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="admin-offer-media__drop" onClick={openPicker} disabled={working}>
                  <span className="admin-offer-media__icon" aria-hidden="true">
                    <UploadIcon />
                  </span>
                  <strong>{t.imageChoose}</strong>
                  <small>{t.imageHint}</small>
                </button>
              )}
              {preview ? <span className="admin-field__hint">{t.imageHint}</span> : null}
            </div>
          </div>
        </fieldset>

        <fieldset className="admin-offer-panel">
          <legend className="admin-offer-panel__legend">{t.sectionPricing}</legend>

          <div className="admin-form__row">
            <label className="admin-field">
              <span className="admin-field__label">{t.price}</span>
              <input
                className="admin-field__input"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                inputMode="decimal"
                placeholder={t.pricePlaceholder}
                autoComplete="off"
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
                autoComplete="off"
              />
            </label>
          </div>

          <div className={`admin-offer-deal${hasDeal ? "" : " admin-offer-deal--muted"}`}>
            <div className="admin-offer-deal__head">
              <h3 className="admin-offer-deal__title">{t.previewTitle}</h3>
              {discountPercent > 0 ? (
                <span className="admin-offer-deal__pct">{t.discountOff(discountPercent)}</span>
              ) : null}
            </div>
            <div className="admin-offer-deal__row">
              <span>{t.originalPrice}</span>
              <strong>{money(originalPrice)}</strong>
            </div>
            <div className="admin-offer-deal__row admin-offer-deal__row--final">
              <span>{t.price}</span>
              <strong>{isValidPrice(price) ? money(parsedPrice) : "—"}</strong>
            </div>
            {hasDeal ? (
              <div className="admin-offer-deal__save">
                <span>{t.previewClientSaves}</span>
                <strong>{money(savings)}</strong>
              </div>
            ) : (
              <p className="admin-offer-deal__hint">{lines.length === 0 ? t.previewNoDeal : t.dealHint}</p>
            )}
          </div>
        </fieldset>

        <fieldset className="admin-offer-panel">
          <legend className="admin-offer-panel__legend">{t.linesTitle}</legend>

          <div className="admin-offer-lines__head">
            <p className="admin-field__hint">{t.linesHint}</p>
            <button
              type="button"
              className="admin-btn admin-btn--ghost admin-btn--small"
              disabled={!nextAvailable}
              title={!nextAvailable ? t.allItemsUsed : undefined}
              onClick={() => nextAvailable && setLines([...lines, { itemId: nextAvailable.id, quantity: 1 }])}
            >
              <span aria-hidden="true">+</span>
              {t.addLine}
            </button>
          </div>

          {items.length === 0 ? <p className="admin-offer-warning">{t.noItemsMessage}</p> : null}
          {lines.length === 0 ? <p className="admin-offer-lines__empty">{t.noLines}</p> : null}

          <div className="admin-offer-lines">
            {lines.map((line) => {
              const item = itemMap.get(line.itemId);
              const unitPrice = item ? (item.promotion ?? item.price) : 0;
              return (
                <div className="admin-offer-line" key={line.itemId}>
                  <span className="admin-offer-line__art" aria-hidden="true">
                    {item?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" loading="lazy" />
                    ) : (
                      <span>{item?.name.slice(0, 1).toUpperCase() ?? "?"}</span>
                    )}
                  </span>

                  <div className="admin-offer-line__select">
                    <select
                      className="admin-field__input admin-offer-line__input"
                      value={line.itemId}
                      aria-label={t.item}
                      onChange={(event) => updateLine(line.itemId, { itemId: event.target.value })}
                    >
                      {groupedItems.map(([categoryName, entries]) => (
                        <optgroup label={categoryName} key={categoryName}>
                          {entries.map((entry) => (
                            <option
                              key={entry.id}
                              value={entry.id}
                              disabled={entry.id !== line.itemId && usedIds.has(entry.id)}
                            >
                              {entry.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <span className="admin-offer-line__meta">
                      {item ? `${item.categoryName} · ${money(unitPrice)}` : t.chooseItem}
                    </span>
                  </div>

                  <div className="admin-offer-line__side">
                    <div className="admin-offer-stepper">
                      <button
                        type="button"
                        className="admin-offer-stepper__btn"
                        aria-label={t.decreaseQuantity}
                        disabled={line.quantity <= 1}
                        onClick={() => updateLine(line.itemId, { quantity: Math.max(1, line.quantity - 1) })}
                      >
                        <span aria-hidden="true">−</span>
                      </button>
                      <input
                        className="admin-offer-stepper__input"
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
                        className="admin-offer-stepper__btn"
                        aria-label={t.increaseQuantity}
                        disabled={line.quantity >= 99}
                        onClick={() => updateLine(line.itemId, { quantity: Math.min(99, line.quantity + 1) })}
                      >
                        <span aria-hidden="true">+</span>
                      </button>
                    </div>
                    <strong className="admin-offer-line__subtotal">{money(round(unitPrice * line.quantity))}</strong>
                    <button
                      type="button"
                      className="admin-offer-line__remove"
                      aria-label={`${t.removeLine} — ${item?.name ?? ""}`}
                      title={t.removeLine}
                      onClick={() => removeLine(line.itemId)}
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!nextAvailable && items.length > 0 ? <p className="admin-field__hint">{t.allItemsUsed}</p> : null}
        </fieldset>

        <fieldset className="admin-offer-panel">
          <legend className="admin-offer-panel__legend">{t.sectionAvailability}</legend>

          <div className="admin-offer-presets">
            <button type="button" className="admin-offer-preset" onClick={applyToday}>
              {t.windowToday}
            </button>
            <button type="button" className="admin-offer-preset" onClick={clearWindow}>
              {t.windowClear}
            </button>
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
          <p className="admin-offer-window">
            <span aria-hidden="true" className="admin-offer-window__dot" />
            {windowSummary}
          </p>
          <p className="admin-field__hint">{t.windowHint}</p>

          <label className="admin-switch">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            <span className="admin-switch__track" aria-hidden="true" />
            <span className="admin-switch__text">
              <strong>{t.active}</strong>
              <small>{t.activeHint}</small>
            </span>
          </label>
        </fieldset>

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
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onCancel} disabled={working}>
            {t.cancel}
          </button>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={working}>
            {working ? t.saving : t.save}
          </button>
        </div>
      </form>
    </section>
  );
}
