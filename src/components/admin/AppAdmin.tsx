"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { getDictionary } from "@/i18n";
import { actionError, isSessionFailure } from "@/lib/admin-errors";
import { clearSession, readSession, writeSession, type AdminSession } from "@/lib/admin-session";
import {
  createCoffee,
  deleteCoffee,
  listCoffees,
  loginAppAdmin,
  resetCoffeePin,
  getAppAnalytics,
  updateCoffee,
  uploadImage,
} from "@/lib/api";
import type { AdminCoffeeDto } from "@/types/backend";

import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { AdminLayout } from "./AdminLayout";
import { AdminPinGate } from "./AdminPinGate";
import { CoffeeForm, type CoffeeFormValues } from "./CoffeeForm";
import { CoffeeList } from "./CoffeeList";
import { InsightsDashboard } from "./InsightsDashboard";

type FormState = { mode: "create" } | { mode: "edit"; coffee: AdminCoffeeDto } | null;

/**
 * Faza application admin. Only an APP_ADMIN session may get past the
 * PIN gate; the app admin can create, edit, delete and reset the PIN of any
 * coffee.
 */
export function AppAdmin({ initialView = "coffees" }: { initialView?: "coffees" | "insights" }) {
  const dict = getDictionary();
  const d = dict.admin;

  const [session, setSession] = useState<AdminSession | null>(null);
  const authed = session !== null;
  const token = session?.token ?? null;
  const fetchAnalytics = useCallback(
    (query: import("@/types/backend").AnalyticsQuery) => getAppAnalytics(token ?? "", query),
    [token],
  );

  const handleExpired = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  // A stored session is restored only after hydration, so the server-rendered
  // gate always matches the first client render (no hydration mismatch).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = readSession();
      if (stored !== null && stored.role !== "APP_ADMIN") {
        clearSession();
        return;
      }
      if (stored?.role === "APP_ADMIN") {
        setSession(stored);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const [coffees, setCoffees] = useState<AdminCoffeeDto[] | null>(null);
  const [listStatus, setListStatus] = useState<"idle" | "ready" | "error">("idle");
  const [listError, setListError] = useState<string | null>(null);
  const [listKey, setListKey] = useState(0);
  const [form, setForm] = useState<FormState>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCoffeeDto | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminCoffeeDto | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadCoffees = useCallback(() => {
    setListStatus("idle");
    setListError(null);
    setListKey((key) => key + 1);
  }, []);

  // Fetches the coffee list whenever the session token or a (re)load request
  // changes. State updates only happen after the awaited fetch, so no render
  // is triggered synchronously from within the effect.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await listCoffees(token);
        if (cancelled) return;
        setCoffees(data);
        setListError(null);
        setListStatus("ready");
      } catch (error) {
        if (cancelled) return;
        if (isSessionFailure(error)) {
          handleExpired();
          return;
        }
        setListError(actionError(dict, error));
        setListStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, listKey, dict, handleExpired]);

  if (!authed || !token) {
    return (
      <AdminPinGate
        dict={dict}
        title={dict.admin.gate.title}
        subtitle={dict.admin.gate.appSubtitle}
        onSubmit={async (pin) => {
          const auth = await loginAppAdmin(pin);
          setSession(writeSession(auth));
        }}
      />
    );
  }

  const handleCreate = async (values: CoffeeFormValues) => {
    if (!token) return;
    setFormBusy(true);
    setFormError(null);
    try {
      const created = await createCoffee(token, {
        name: values.name,
        slug: values.slug,
      });
      loadCoffees();
      setForm(null);
      setNotice(d.coffeeForm.created(created.name));
    } catch (error) {
      if (isSessionFailure(error)) {
        setForm(null);
        handleExpired();
        return;
      }
      setFormError(actionError(dict, error));
    } finally {
      setFormBusy(false);
    }
  };

  const handleUpdate = async (values: CoffeeFormValues) => {
    if (!token || form?.mode !== "edit") return;
    const coffee = form.coffee;
    setFormBusy(true);
    setFormError(null);
    try {
      const updated = await updateCoffee(token, coffee.id, {
        name: values.name,
        logo: values.logo,
        cover: values.cover,
        tableCount: values.tableCount,
        slug: values.slug,
      });
      loadCoffees();
      setForm(null);
      setNotice(d.coffeeForm.updated(updated.name));
    } catch (error) {
      if (isSessionFailure(error)) {
        setForm(null);
        handleExpired();
        return;
      }
      setFormError(actionError(dict, error));
    } finally {
      setFormBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget) return;
    setDeleteBusy(true);
    try {
      const target = deleteTarget;
      await deleteCoffee(token, target.id);
      setDeleteTarget(null);
      loadCoffees();
      setNotice(d.delete.deleted(target.name));
    } catch (error) {
      if (isSessionFailure(error)) {
        setDeleteTarget(null);
        handleExpired();
        return;
      }
      setNotice(actionError(dict, error));
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleResetPin = async () => {
    if (!token || !resetTarget) return;
    setResetBusy(true);
    try {
      await resetCoffeePin(token, resetTarget.id);
      setResetTarget(null);
      setNotice(d.app.resetPinDone);
    } catch (error) {
      if (isSessionFailure(error)) {
        setResetTarget(null);
        handleExpired();
        return;
      }
      setNotice(actionError(dict, error));
    } finally {
      setResetBusy(false);
    }
  };

  const formInitial =
    form?.mode === "edit"
      ? {
          name: form.coffee.name,
          logo: form.coffee.logo,
          cover: form.coffee.cover ?? undefined,
          tableCount: form.coffee.tableCount,
          slug: form.coffee.slug,
        }
      : undefined;

  return (
    <AdminLayout
      dict={dict}
      title={d.chrome.appTitle}
      subtitle={d.chrome.roleApp}
      headerActions={
        <Link className="admin-bar__link" href="/faza/admin/insights">
          {d.navigation.insights}
        </Link>
      }
      onLogout={() => {
        clearSession();
        setSession(null);
      }}
    >
      {initialView === "insights" ? (
        <InsightsDashboard
          dict={dict}
          fetchAnalytics={fetchAnalytics}
          onSessionExpired={handleExpired}
          backHref="/faza/admin"
        />
      ) : null}
      {initialView !== "insights" && notice ? (
        <p className="admin-toast" role="status">
          {notice}
        </p>
      ) : null}

      {initialView !== "insights" ? (
        <div className="admin-head">
          <div className="admin-head__text">
            <h1 className="admin-head__title">{d.app.coffeesTitle}</h1>
            <p className="admin-head__hint">{d.app.coffeesHint}</p>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => {
              setFormError(null);
              setForm({ mode: "create" });
            }}
          >
            {d.app.createCoffee}
          </button>
        </div>
      ) : null}

      {initialView !== "insights" && form ? (
        <CoffeeForm
          dict={dict}
          mode={form.mode}
          initial={formInitial}
          reservedSlugs={(coffees ?? []).map((coffee) => coffee.slug)}
          title={form.mode === "create" ? d.coffeeForm.createTitle : d.coffeeForm.editTitle}
          busy={formBusy}
          error={formError}
          onSubmit={form.mode === "create" ? handleCreate : handleUpdate}
          onUpload={(file) => uploadImage(token, file).then((image) => image.url)}
          onCancel={() => {
            setForm(null);
            setFormError(null);
          }}
        />
      ) : null}

      {initialView !== "insights" ? (
        <CoffeeList
          dict={dict}
          coffees={coffees ?? []}
          loading={listStatus === "idle"}
          error={listStatus === "error" ? listError : null}
          onRetry={loadCoffees}
          onEdit={(coffee) => {
            setFormError(null);
            setForm({ mode: "edit", coffee });
          }}
          onResetPin={(coffee) => setResetTarget(coffee)}
          onDelete={(coffee) => setDeleteTarget(coffee)}
        />
      ) : null}

      {initialView !== "insights" && deleteTarget ? (
        <AdminConfirmDialog
          title={d.delete.coffeeTitle(deleteTarget.name)}
          message={d.delete.coffeeMessage}
          confirmLabel={d.delete.confirm}
          cancelLabel={d.delete.cancel}
          busyLabel={d.delete.deleting}
          busy={deleteBusy}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}

      {initialView !== "insights" && resetTarget ? (
        <AdminConfirmDialog
          title={d.app.resetPinDialogTitle}
          message={d.app.resetPinDialogText}
          confirmLabel={d.app.resetPin}
          cancelLabel={d.delete.cancel}
          busyLabel={d.app.resetPin}
          busy={resetBusy}
          onConfirm={() => void handleResetPin()}
          onCancel={() => setResetTarget(null)}
        />
      ) : null}
    </AdminLayout>
  );
}
