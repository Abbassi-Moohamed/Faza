"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(siteConfig.locale, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: siteConfig.timeZone,
  }).format(new Date(value));
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
            className="admin-btn admin-btn--primary"
            onClick={() => {
              setFormError(null);
              setForm({ mode: "create" });
            }}
          >
            {t.add}
          </button>
        </div>

        {notice ? (
          <p className="admin-toast" role="status">
            {notice}
          </p>
        ) : null}

        {status === "loading" ? <AdminNotice title={t.title} loading /> : null}

        {status === "error" ? (
          <AdminNotice title={t.loadError} message={error ?? undefined} actionLabel={t.retry} onAction={reload} />
        ) : null}

        {status === "ready" && offers && offers.length === 0 ? (
          <AdminNotice title={t.emptyTitle} message={t.emptyMessage} />
        ) : null}

        {status === "ready" && offers && offers.length > 0 ? (
          <ul className="admin-offer-list">
            {offers.map((offer) => {
              const archived = offer.archivedAt !== null;
              return (
                <li key={offer.id} className="admin-offer-card">
                  <div className="admin-offer-card__main">
                    <div className="admin-offer-card__head">
                      <h3 className="admin-offer-card__name">{offer.name}</h3>
                      <span className={`admin-offer-status admin-offer-status--${offer.status.toLowerCase()}`}>
                        {t[STATUS_LABEL[offer.status]]}
                      </span>
                    </div>
                    {offer.description ? <p className="admin-offer-card__description">{offer.description}</p> : null}
                    <p className="admin-offer-card__summary">
                      <strong>{formatPrice(offer.price, siteConfig.currency, siteConfig.locale)}</strong>
                      <s>{formatPrice(offer.originalPrice, siteConfig.currency, siteConfig.locale)}</s>
                      <span>{offer.stock}</span>
                    </p>
                    <p className="admin-offer-card__lines">
                      {offer.lines
                        .map((line) => `${line.quantity > 1 ? `${line.quantity}x ` : ""}${line.name}`)
                        .join(" + ")}
                    </p>
                    {offer.startAt || offer.endAt ? (
                      <p className="admin-offer-card__window">
                        {offer.startAt ? formatDate(offer.startAt) : ""}
                        {offer.startAt && offer.endAt ? " → " : ""}
                        {offer.endAt ? formatDate(offer.endAt) : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="admin-offer-card__actions">
                    {archived ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn--ghost"
                        onClick={() => void handleRestore(offer)}
                      >
                        {t.restore}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost"
                          onClick={() => {
                            setFormError(null);
                            setForm({ mode: "edit", offer });
                          }}
                        >
                          {dict.admin.items.edit}
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost"
                          onClick={() => setArchiveTarget(offer)}
                        >
                          {t.archive}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
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
