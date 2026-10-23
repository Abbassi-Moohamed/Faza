"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Dictionary } from "@/i18n/dictionary";
import { actionError, isSessionFailure } from "@/lib/admin-errors";
import {
  createMyOffer,
  deleteMyOffer,
  listMyCategories,
  listMyCategoryItems,
  listMyOffers,
  updateMyOffer,
  uploadImage,
} from "@/lib/api";
import { formatPrice } from "@/lib/menu";
import { siteConfig } from "@/config/site";
import type { AdminOfferDto, OfferStatus } from "@/types/backend";

import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { AdminNotice } from "./AdminNotice";
import { OfferForm, type OfferFormItem, type OfferFormValues } from "./OfferForm";

type Props = {
  dict: Dictionary;
  token: string;
  onSessionExpired: () => void;
  backHref: string;
};

type AsyncStatus = "loading" | "ready" | "error";
type FormState = { mode: "create" } | { mode: "edit"; offer: AdminOfferDto } | null;

const STATUS_LABEL: Record<
  OfferStatus,
  "statusActive" | "statusScheduled" | "statusExpired" | "statusSoldOut" | "statusPaused" | "statusArchived"
> = {
  ACTIVE: "statusActive",
  SCHEDULED: "statusScheduled",
  EXPIRED: "statusExpired",
  SOLD_OUT: "statusSoldOut",
  PAUSED: "statusPaused",
  ARCHIVED: "statusArchived",
};

const STATUS_PRIORITY: Record<OfferStatus, number> = {
  ACTIVE: 0,
  SCHEDULED: 1,
  PAUSED: 2,
  SOLD_OUT: 3,
  EXPIRED: 4,
  ARCHIVED: 5,
};

const isArchived = (offer: AdminOfferDto) => offer.archivedAt !== null || offer.status === "ARCHIVED";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(siteConfig.locale, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: siteConfig.timeZone,
    hourCycle: "h23",
  }).format(new Date(value));
}

function money(value: number): string {
  return formatPrice(value, siteConfig.currency, siteConfig.locale);
}

function OfferGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4.8 10.2h14.4v9.1a1 1 0 0 1-1 1H5.8a1 1 0 0 1-1-1v-9.1Zm0 0V7.6a1 1 0 0 1 1-1h12.4a1 1 0 0 1 1 1v2.6M12 6.6v13.7M12 6.6c-1.2 0-3.6-.5-3.6-2.2 0-1.4 1-2.1 2.2-2.1 1.9 0 3.4 2.6 3.4 4.3Zm0 0c1.2 0 3.6-.5 3.6-2.2 0-1.4-1-2.1-2.2-2.1-1.9 0-3.4 2.6-3.4 4.3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.6V12l3 1.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Management of the daily offers of the authenticated coffee: list, compose,
 * pause, archive and restore. The public menu only ever sees purchasable ones.
 */
export function OffersDashboard({ dict, token, onSessionExpired, backHref }: Props) {
  const t = dict.admin.offers;
  const [offers, setOffers] = useState<AdminOfferDto[] | null>(null);
  const [status, setStatus] = useState<AsyncStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<OfferFormItem[]>([]);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AdminOfferDto | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listMyOffers(token);
        if (cancelled) return;
        setOffers(data);
        setError(null);
        setStatus("ready");
      } catch (loadError) {
        if (cancelled) return;
        if (isSessionFailure(loadError)) {
          onSessionExpired();
          return;
        }
        setError(actionError(dict, loadError));
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey, dict, onSessionExpired]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const categories = await listMyCategories(token);
        const grouped = await Promise.all(
          categories.map(async (category) => {
            const entries = await listMyCategoryItems(token, category.id);
            return entries.map((item) => ({
              id: item.id,
              name: item.name,
              price: item.price,
              promotion: item.promotion,
              categoryName: category.name,
              image: item.image,
            }));
          }),
        );
        if (cancelled) return;
        setItems(grouped.flat());
        setItemsError(null);
      } catch (loadError) {
        if (cancelled) return;
        if (isSessionFailure(loadError)) {
          onSessionExpired();
          return;
        }
        setItemsError(actionError(dict, loadError));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, dict, onSessionExpired]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const orderedOffers = useMemo(() => {
    return [...(offers ?? [])].sort((a, b) => {
      const archivedA = isArchived(a);
      const archivedB = isArchived(b);
      if (archivedA !== archivedB) return archivedA ? 1 : -1;
      return STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] || b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [offers]);

  const currentOffers = useMemo(() => orderedOffers.filter((offer) => !isArchived(offer)), [orderedOffers]);
  const archivedOffers = useMemo(() => orderedOffers.filter(isArchived), [orderedOffers]);

  const stats = useMemo(() => {
    const live = currentOffers.filter((offer) => offer.status === "ACTIVE");
    const stock = currentOffers
      .filter((offer) => offer.status === "ACTIVE" || offer.status === "SCHEDULED" || offer.status === "PAUSED")
      .reduce((sum, offer) => sum + offer.stock, 0);
    const attention = currentOffers.filter(
      (offer) => offer.status === "SOLD_OUT" || (offer.status === "ACTIVE" && offer.stock > 0 && offer.stock <= 3),
    ).length;
    return { live: live.length, stock, attention };
  }, [currentOffers]);

  const upload = (file: File) => uploadImage(token, file).then((image) => image.url);

  const handleSave = async (values: OfferFormValues) => {
    setBusy(true);
    setFormError(null);
    try {
      if (form?.mode === "edit") {
        const updated = await updateMyOffer(token, form.offer.id, {
          name: values.name,
          description: values.description ?? "",
          price: values.price,
          stock: values.stock,
          lines: values.lines,
          image: values.image && values.image.length > 0 ? values.image : null,
          startAt: values.startAt ?? null,
          endAt: values.endAt ?? null,
          isActive: values.isActive,
          archived: false,
        });
        setNotice(t.saved(updated.name));
      } else {
        const created = await createMyOffer(token, {
          name: values.name,
          description: values.description,
          price: values.price,
          stock: values.stock,
          lines: values.lines,
          image: values.image && values.image.length > 0 ? values.image : undefined,
          startAt: values.startAt ?? null,
          endAt: values.endAt ?? null,
          isActive: values.isActive,
        });
        setNotice(t.saved(created.name));
      }
      setForm(null);
      reload();
    } catch (saveError) {
      if (isSessionFailure(saveError)) {
        setForm(null);
        onSessionExpired();
        return;
      }
      setFormError(actionError(dict, saveError));
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiveBusy(true);
    try {
      await deleteMyOffer(token, archiveTarget.id);
      setNotice(t.saved(archiveTarget.name));
      setArchiveTarget(null);
      reload();
    } catch (archiveError) {
      if (isSessionFailure(archiveError)) {
        setArchiveTarget(null);
        onSessionExpired();
        return;
      }
      setNotice(actionError(dict, archiveError));
    } finally {
      setArchiveBusy(false);
    }
  };

  const handleRestore = async (offer: AdminOfferDto) => {
    try {
      await updateMyOffer(token, offer.id, { archived: false });
      setNotice(t.restored(offer.name));
      reload();
    } catch (restoreError) {
      if (isSessionFailure(restoreError)) {
        onSessionExpired();
        return;
      }
      setNotice(actionError(dict, restoreError));
    }
  };

  if (form) {
    return (
      <OfferForm
        dict={dict}
        title={form.mode === "create" ? t.createTitle : t.editTitle}
        items={items}
        initial={form.mode === "edit" ? form.offer : undefined}
        busy={busy}
        error={formError ?? itemsError}
        onSubmit={handleSave}
        onUpload={upload}
        onCancel={() => {
          setForm(null);
          setFormError(null);
        }}
      />
    );
  }

  const renderOfferCard = (offer: AdminOfferDto) => {
    const archived = isArchived(offer);
    const discount =
      offer.originalPrice > 0 ? Math.round(((offer.originalPrice - offer.price) / offer.originalPrice) * 100) : 0;
    const media = offer.image ?? offer.lines.find((line) => line.image)?.image ?? null;
    const windowLabel = offer.endAt
      ? offer.startAt
        ? `${formatDate(offer.startAt)} → ${formatDate(offer.endAt)}`
        : t.windowUntil(formatDate(offer.endAt))
      : offer.startAt
        ? t.windowFrom(formatDate(offer.startAt))
        : t.windowAlways;
    const stockLabel =
      offer.stock <= 0 ? t.stockNone : offer.stock <= 3 ? t.stockLow(offer.stock) : t.stockLeft(offer.stock);
    const stockTone = offer.stock <= 0 ? "out" : offer.stock <= 3 ? "low" : "ok";

    return (
      <li className={`admin-offer-card${archived ? " admin-offer-card--archived" : ""}`} key={offer.id}>
        <div className={`admin-offer-card__media${offer.stock <= 0 ? " admin-offer-card__media--muted" : ""}`}>
          {media ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media} alt="" loading="lazy" />
          ) : (
            <span className="admin-offer-card__media-fallback">
              <OfferGlyph />
            </span>
          )}
          {discount > 0 && !archived ? (
            <span className="admin-offer-card__discount">{t.discountOff(discount)}</span>
          ) : null}
        </div>

        <div className="admin-offer-card__body">
          <div className="admin-offer-card__head">
            <h3 className="admin-offer-card__name">{offer.name}</h3>
            <span className={`admin-offer-status admin-offer-status--${offer.status.toLowerCase()}`}>
              <span className="admin-offer-status__dot" aria-hidden="true" />
              {t[STATUS_LABEL[offer.status]]}
            </span>
          </div>

          {offer.description ? <p className="admin-offer-card__description">{offer.description}</p> : null}

          <ul className="admin-offer-card__chips" aria-label={t.linesTitle}>
            {offer.lines.map((line) => (
              <li className="admin-offer-chip" key={line.itemId}>
                <span className="admin-offer-chip__qty">{line.quantity}×</span>
                {line.name}
              </li>
            ))}
          </ul>

          <div className="admin-offer-card__meta">
            <div className="admin-offer-card__prices">
              <strong>{money(offer.price)}</strong>
              <s>{money(offer.originalPrice)}</s>
              {offer.savings > 0 && !archived ? (
                <span className="admin-offer-card__save">−{money(offer.savings)}</span>
              ) : null}
            </div>
            <span
              className={`admin-offer-card__stock admin-offer-card__stock--${stockTone}`}
              aria-label={`${t.stock} : ${stockLabel}`}
            >
              {stockLabel}
            </span>
          </div>

          <p className="admin-offer-card__window">
            <ClockIcon />
            {windowLabel}
          </p>

          <div className="admin-offer-card__actions">
            {archived ? (
              <button
                type="button"
                className="admin-btn admin-btn--primary admin-btn--small"
                onClick={() => void handleRestore(offer)}
              >
                {t.restore}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary admin-btn--small"
                  onClick={() => {
                    setFormError(null);
                    setForm({ mode: "edit", offer });
                  }}
                >
                  {dict.admin.items.edit}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost admin-btn--small admin-offer-card__archive"
                  onClick={() => setArchiveTarget(offer)}
                >
                  {t.archive}
                </button>
              </>
            )}
          </div>
        </div>
      </li>
    );
  };

  return (
    <>
      <section className="admin-section">
        <Link className="admin-btn admin-btn--ghost admin-settings-back" href={backHref}>
          <span aria-hidden="true">←</span>
          {t.back}
        </Link>
        <div className="admin-head">
          <div className="admin-head__text">
            <h2 className="admin-head__title">{t.title}</h2>
            <p className="admin-head__hint">{t.hint}</p>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn--primary admin-offer-add"
            onClick={() => {
              setFormError(null);
              setForm({ mode: "create" });
            }}
          >
            <span className="admin-offer-add__icon" aria-hidden="true">
              <PlusIcon />
            </span>
            {t.add}
          </button>
        </div>

        {notice ? (
          <p className="admin-toast" role="status" aria-live="polite">
            {notice}
          </p>
        ) : null}

        {status === "loading" ? <AdminNotice title={t.title} loading /> : null}

        {status === "error" ? (
          <AdminNotice title={t.loadError} message={error ?? undefined} actionLabel={t.retry} onAction={reload} />
        ) : null}

        {status === "ready" && offers && offers.length === 0 ? (
          <div className="admin-offer-empty">
            <span className="admin-offer-empty__icon" aria-hidden="true">
              <OfferGlyph />
            </span>
            <h3 className="admin-offer-empty__title">{t.emptyTitle}</h3>
            <p className="admin-offer-empty__text">{t.emptyMessage}</p>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => {
                setFormError(null);
                setForm({ mode: "create" });
              }}
            >
              {t.emptyCta}
            </button>
          </div>
        ) : null}

        {status === "ready" && offers && offers.length > 0 ? (
          <>
            <div className="admin-offer-stats" role="group" aria-label={t.title}>
              <div className="admin-offer-stat admin-offer-stat--live">
                <span className="admin-offer-stat__value">{stats.live}</span>
                <span className="admin-offer-stat__label">{t.statsLive}</span>
              </div>
              <div className="admin-offer-stat">
                <span className="admin-offer-stat__value">{stats.stock}</span>
                <span className="admin-offer-stat__label">{t.statsStock}</span>
              </div>
              <div className={`admin-offer-stat${stats.attention > 0 ? " admin-offer-stat--alert" : ""}`}>
                <span className="admin-offer-stat__value">{stats.attention}</span>
                <span className="admin-offer-stat__label">{t.statsAttention}</span>
              </div>
            </div>

            {currentOffers.length > 0 ? (
              <ul className="admin-offer-list">{currentOffers.map(renderOfferCard)}</ul>
            ) : (
              <div className="admin-offer-empty admin-offer-empty--compact">
                <p className="admin-offer-empty__text">{t.emptyMessage}</p>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={() => {
                    setFormError(null);
                    setForm({ mode: "create" });
                  }}
                >
                  {t.add}
                </button>
              </div>
            )}

            {archivedOffers.length > 0 ? (
              <details className="admin-offer-archive">
                <summary className="admin-offer-archive__summary">
                  <span>{t.archivedTitle(archivedOffers.length)}</span>
                  <span className="admin-offer-archive__chevron" aria-hidden="true">
                    <ChevronIcon />
                  </span>
                </summary>
                <ul className="admin-offer-list admin-offer-list--archived">{archivedOffers.map(renderOfferCard)}</ul>
              </details>
            ) : null}
          </>
        ) : null}
      </section>

      {archiveTarget ? (
        <AdminConfirmDialog
          title={t.archiveTitle(archiveTarget.name)}
          message={t.archiveMessage}
          confirmLabel={t.archiveConfirm}
          cancelLabel={t.cancel}
          busyLabel={t.saving}
          busy={archiveBusy}
          onConfirm={() => void handleArchive()}
          onCancel={() => setArchiveTarget(null)}
        />
      ) : null}
    </>
  );
}
