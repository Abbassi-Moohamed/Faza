"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { getDictionary } from "@/i18n";
import { actionError, isSessionFailure } from "@/lib/admin-errors";
import { clearSession, readSession, writeSession, type AdminSession } from "@/lib/admin-session";
import {
  changeMyPin,
  createMyCategory,
  createMyItem,
  deleteMyCategory,
  deleteMyItem,
  getMyCoffee,
  listMyCategories,
  listMyCategoryItems,
  loginCoffeeAdmin,
  updateMyCategory,
  updateMyItem,
  updateMyCoffee,
  uploadImage,
  getCoffeeAnalytics,
  listServiceShifts,
} from "@/lib/api";
import type { AdminCategoryDto, AdminCoffeeDto, AdminItemDto } from "@/types/backend";
import { cn } from "@/lib/utils";

import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { AdminLayout } from "./AdminLayout";
import { AdminNotice } from "./AdminNotice";
import { AdminPinGate } from "./AdminPinGate";
import { CategoryForm } from "./CategoryForm";
import { CategoryList } from "./CategoryList";
import { ChangePinForm } from "./ChangePinForm";
import { CoffeeForm, type CoffeeFormValues } from "./CoffeeForm";
import { ItemForm, type ItemFormValues } from "./ItemForm";
import { ItemList } from "./ItemList";
import { OrdersSection } from "./OrdersSection";
import { InsightsDashboard } from "./InsightsDashboard";

type AsyncStatus = "idle" | "loading" | "ready" | "error";
type View = "service" | "tables" | "orders" | "menu" | "profile" | "security";
type CategoryFormState = { mode: "create" } | { mode: "edit"; category: AdminCategoryDto } | null;
type ItemFormState = { mode: "create" } | { mode: "edit"; item: AdminItemDto } | null;

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M10.5 3.5h3l.7 2.3a6.7 6.7 0 0 1 1.8.9l2.2-1.1 2.1 2.1-1.1 2.2c.4.6.7 1.2.9 1.8l2.3.7v3l-2.3.7c-.2.6-.5 1.2-.9 1.8l1.1 2.2-2.1 2.1-2.2-1.1c-.6.4-1.2.7-1.8.9l-.7 2.3h-3l-.7-2.3a6.7 6.7 0 0 1-1.8-.9l-2.2 1.1-2.1-2.1 1.1-2.2a6.7 6.7 0 0 1-.9-1.8L3.5 13.5v-3l2.3-.7c.2-.6.5-1.2.9-1.8L5.6 5.8l2.1-2.1 2.2 1.1c.6-.4 1.2-.7 1.8-.9l.7-2.3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h6.4A1.8 1.8 0 0 1 19 5.8v12.4a1.8 1.8 0 0 1-1.8 1.8h-6.4A1.8 1.8 0 0 1 9 18.2V17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 12h-8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m7.5 8.5 3.5 3.5-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

interface CoffeeAdminProps {
  /** The slug from the route (`/:coffeeSlug/admin`). */
  coffeeSlug: string;
  initialView?: "menu" | "insights";
}

/**
 * Coffee backoffice for `/:coffeeSlug/admin`. The owning coffee is bound to
 * the session token, never to anything the frontend sends — the route slug is
 * only cross-checked against the authenticated coffee.
 */
export function CoffeeAdmin({ coffeeSlug, initialView = "menu" }: CoffeeAdminProps) {
  const dict = getDictionary();
  const d = dict.admin;

  const [session, setSession] = useState<AdminSession | null>(null);
  const authed = session !== null;
  const token = session?.token ?? null;
  const fetchAnalytics = useCallback(
    (query: import("@/types/backend").AnalyticsQuery) => getCoffeeAnalytics(token ?? "", query),
    [token],
  );
  const fetchShiftOptions = useCallback(() => listServiceShifts(token ?? "", undefined, 1, 50), [token]);

  const handleExpired = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  // A stored session is restored only after hydration, so the server-rendered
  // gate always matches the first client render (no hydration mismatch).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = readSession();
      if (stored !== null && stored.role !== "COFFEE_ADMIN") {
        clearSession();
        return;
      }
      if (stored?.role === "COFFEE_ADMIN") {
        setSession(stored);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const [coffee, setCoffee] = useState<AdminCoffeeDto | null>(null);
  const [coffeeStatus, setCoffeeStatus] = useState<AsyncStatus>("idle");
  const [coffeeError, setCoffeeError] = useState<string | null>(null);
  const [wrongCoffee, setWrongCoffee] = useState(false);

  const [view, setView] = useState<View>("service");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const isSettingsView = view === "menu" || view === "profile" || view === "security";

  const [categories, setCategories] = useState<AdminCategoryDto[] | null>(null);
  const [catStatus, setCatStatus] = useState<AsyncStatus>("idle");
  const [catError, setCatError] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(null);
  const [categoryFormBusy, setCategoryFormBusy] = useState(false);
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);
  const [categoryDelete, setCategoryDelete] = useState<AdminCategoryDto | null>(null);
  const [categoryDeleteBusy, setCategoryDeleteBusy] = useState(false);

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [items, setItems] = useState<AdminItemDto[] | null>(null);
  const [itemsStatus, setItemsStatus] = useState<AsyncStatus>("idle");
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>(null);
  const [itemFormBusy, setItemFormBusy] = useState(false);
  const [itemAvailabilityBusy, setItemAvailabilityBusy] = useState<string | null>(null);
  const [itemFormError, setItemFormError] = useState<string | null>(null);
  const [itemDelete, setItemDelete] = useState<AdminItemDto | null>(null);
  const [itemDeleteBusy, setItemDeleteBusy] = useState(false);

  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinBusy, setPinBusy] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const [coffeeKey, setCoffeeKey] = useState(0);
  const [categoriesKey, setCategoriesKey] = useState(0);

  const reloadCoffee = useCallback(() => {
    setCoffeeStatus("idle");
    setCoffeeError(null);
    setCoffeeKey((key) => key + 1);
  }, []);

  const reloadCategories = useCallback(() => {
    setCatStatus("idle");
    setCatError(null);
    setCategoriesKey((key) => key + 1);
  }, []);

  // The owning coffee is loaded once the session token is available (or when
  // a reload is requested). The route slug is cross-checked against the token.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await getMyCoffee(token);
        if (cancelled) return;
        if (data.slug !== coffeeSlug) {
          setWrongCoffee(true);
          return;
        }
        setWrongCoffee(false);
        setCoffee(data);
        setCoffeeError(null);
        setCoffeeStatus("ready");
      } catch (error) {
        if (cancelled) return;
        if (isSessionFailure(error)) {
          handleExpired();
          return;
        }
        setCoffeeError(actionError(dict, error));
        setCoffeeStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, coffeeKey, coffeeSlug, dict, handleExpired]);

  // Categories are fetched once the coffee is ready and the menu tab is open.
  useEffect(() => {
    if (!token || view !== "menu" || coffeeStatus !== "ready") return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await listMyCategories(token);
        if (cancelled) return;
        setCategories(data);
        setCatError(null);
        setCatStatus("ready");
      } catch (error) {
        if (cancelled) return;
        if (isSessionFailure(error)) {
          handleExpired();
          return;
        }
        setCatError(actionError(dict, error));
        setCatStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, view, coffeeStatus, categoriesKey, dict, handleExpired]);

  const loadItems = async (categoryId: string) => {
    if (!token) return;
    setItemsStatus("loading");
    setItemsError(null);
    setItems(null);
    try {
      const data = await listMyCategoryItems(token, categoryId);
      setItems(data);
      setItemsStatus("ready");
    } catch (error) {
      if (isSessionFailure(error)) {
        handleExpired();
        return;
      }
      setItemsError(actionError(dict, error));
      setItemsStatus("error");
    }
  };

  if (!authed || !token) {
    return (
      <AdminPinGate
        dict={dict}
        title={dict.admin.gate.title}
        subtitle={dict.admin.gate.coffeeSubtitle}
        onSubmit={async (pin) => {
          const auth = await loginCoffeeAdmin(coffeeSlug, pin);
          setWrongCoffee(false);
          setSession(writeSession(auth));
        }}
      />
    );
  }

  if (wrongCoffee) {
    return (
      <div className="admin">
        <main id="main" className="admin-main">
          <div className="admin-container">
            <AdminNotice
              title={d.errors.wrongCoffee}
              message={d.errors.wrongCoffeeMessage}
              actionLabel={d.chrome.logout}
              onAction={() => {
                clearSession();
                setSession(null);
              }}
            />
          </div>
        </main>
      </div>
    );
  }

  const activeCategory =
    activeCategoryId !== null
      ? (categories?.find((category) => category.id === activeCategoryId) ?? null)
      : null;

  /* ---- Menu tab: categories + items ------------------------------------- */

  const handleCategorySave = async (values: { name: string; image?: string }) => {
    if (!token) return;
    setCategoryFormBusy(true);
    setCategoryFormError(null);
    try {
      if (categoryForm?.mode === "edit") {
        const updated = await updateMyCategory(token, categoryForm.category.id, values);
        reloadCategories();
        setNotice(d.categories.saved(updated.name));
      } else {
        const created = await createMyCategory(token, values);
        reloadCategories();
        setNotice(d.categories.saved(created.name));
      }
      setCategoryForm(null);
    } catch (error) {
      if (isSessionFailure(error)) {
        setCategoryForm(null);
        handleExpired();
        return;
      }
      setCategoryFormError(actionError(dict, error));
    } finally {
      setCategoryFormBusy(false);
    }
  };

  const handleCategoryDelete = async () => {
    if (!token || !categoryDelete) return;
    setCategoryDeleteBusy(true);
    try {
      const target = categoryDelete;
      await deleteMyCategory(token, target.id);
      if (activeCategoryId === target.id) {
        setActiveCategoryId(null);
        setItems(null);
      }
      setCategoryDelete(null);
      reloadCategories();
      setNotice(d.delete.deleted(target.name));
    } catch (error) {
      if (isSessionFailure(error)) {
        setCategoryDelete(null);
        handleExpired();
        return;
      }
      setNotice(actionError(dict, error));
    } finally {
      setCategoryDeleteBusy(false);
    }
  };

  const handleItemSave = async (values: ItemFormValues) => {
    if (!token || !activeCategoryId) return;
    setItemFormBusy(true);
    setItemFormError(null);
    try {
      if (itemForm?.mode === "edit") {
        const updated = await updateMyItem(token, itemForm.item.id, values);
        await loadItems(activeCategoryId);
        setNotice(d.items.saved(updated.name));
      } else {
        const created = await createMyItem(token, activeCategoryId, values);
        await loadItems(activeCategoryId);
        setNotice(d.items.saved(created.name));
      }
      setItemForm(null);
    } catch (error) {
      if (isSessionFailure(error)) {
        setItemForm(null);
        handleExpired();
        return;
      }
      setItemFormError(actionError(dict, error));
    } finally {
      setItemFormBusy(false);
    }
  };

  const uploadForSession = (file: File) => uploadImage(token!, file).then((image) => image.url);

  const handleItemDelete = async () => {
    if (!token || !itemDelete) return;
    setItemDeleteBusy(true);
    try {
      const target = itemDelete;
      await deleteMyItem(token, target.id);
      setItemDelete(null);
      if (activeCategoryId) await loadItems(activeCategoryId);
      setNotice(d.delete.deleted(target.name));
    } catch (error) {
      if (isSessionFailure(error)) {
        setItemDelete(null);
        handleExpired();
        return;
      }
      setNotice(actionError(dict, error));
    } finally {
      setItemDeleteBusy(false);
    }
  };

  const handleItemAvailability = async (item: AdminItemDto) => {
    if (!token) return;
    if (itemAvailabilityBusy === item.id) return;
    setItemAvailabilityBusy(item.id);
    try {
      const updated = await updateMyItem(token, item.id, { isAvailable: !item.isAvailable });
      setItems((current) => current?.map((entry) => (entry.id === updated.id ? updated : entry)) ?? current);
      setNotice(d.items.saved(updated.name));
    } catch (error) {
      if (isSessionFailure(error)) {
        handleExpired();
        return;
      }
      setNotice(actionError(dict, error));
    } finally {
      setItemAvailabilityBusy(null);
    }
  };

  /* ---- Settings tab ------------------------------------------------------ */

  const handleSettingsSave = async (values: CoffeeFormValues) => {
    if (!token) return;
    setSettingsBusy(true);
    setSettingsError(null);
    try {
      const updated = await updateMyCoffee(token, {
        name: values.name,
        logo: values.logo,
        cover: values.cover,
        slug: values.slug,
      });
      setCoffee(updated);
      setNotice(d.coffeeForm.updated(updated.name));
    } catch (error) {
      if (isSessionFailure(error)) {
        handleExpired();
        return;
      }
      setSettingsError(actionError(dict, error));
    } finally {
      setSettingsBusy(false);
    }
  };

  /* ---- Security tab ------------------------------------------------------ */

  const handlePinChange = async (currentPin: string, newPin: string) => {
    if (!token) return;
    setPinBusy(true);
    setPinError(null);
    try {
      await changeMyPin(token, currentPin, newPin);
      setNotice(d.pin.changed);
    } catch (error) {
      if (isSessionFailure(error)) {
        handleExpired();
        return;
      }
      setPinError(actionError(dict, error));
    } finally {
      setPinBusy(false);
    }
  };

  return (
    <AdminLayout
      dict={dict}
      title={coffee?.name ?? coffeeSlug}
      subtitle={d.chrome.roleCoffee}
      logo={coffee?.logo}
      publicMenuHref={`/faza/${coffeeSlug}`}
      hideHeader={initialView === "insights" || isSettingsView}
      headerActions={
        <div className="admin-header-settings">
          <button
            type="button"
            className={cn(
              "admin-bar__link admin-settings-button",
              (view === "menu" || view === "profile" || view === "security") && "admin-settings-button--active",
            )}
            aria-label={d.navigation.settings}
            title={d.navigation.settings}
            aria-expanded={settingsOpen}
            aria-haspopup="menu"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <span aria-hidden="true" className="admin-settings-button__icon">
              <SettingsIcon />
            </span>
          </button>
          {settingsOpen ? (
            <div className="admin-tabs__dropdown admin-header-settings__dropdown" role="menu">
              {(["profile", "menu", "insights", "security"] as const).map((id) =>
                id === "insights" ? (
                  <Link
                    key={id}
                    className="admin-tabs__option"
                    href={`/faza/${coffeeSlug}/admin/insights`}
                    role="menuitem"
                    onClick={() => setSettingsOpen(false)}
                  >
                    <span className="admin-tabs__option__label">{d.navigation.insights}</span>
                  </Link>
                ) : (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  className={cn("admin-tabs__option", view === id && "admin-tabs__option--active")}
                  onClick={() => {
                    setView(id);
                    setSettingsOpen(false);
                    setCategoryForm(null);
                    setItemForm(null);
                  }}
                >
                  <span className="admin-tabs__option__label">{d.navigation[id]}</span>
                </button>
                ),
              )}
              <button
                type="button"
                role="menuitem"
                className="admin-tabs__option admin-tabs__option--logout"
                onClick={() => {
                  setSettingsOpen(false);
                  clearSession();
                  setSession(null);
                }}
              >
                <span className="admin-tabs__option__icon" aria-hidden="true"><LogoutIcon /></span>
                <span className="admin-tabs__option__label">{d.chrome.logout}</span>
              </button>
            </div>
          ) : null}
        </div>
      }
      onLogout={() => {
        clearSession();
        setSession(null);
      }}
    >
      {notice ? (
        <p className="admin-toast" role="status">
          {notice}
        </p>
      ) : null}

      {initialView !== "insights" && isSettingsView && !categoryForm && !itemForm && !activeCategoryId ? (
        <button
          type="button"
          className="admin-btn admin-btn--ghost admin-settings-back"
          onClick={() => {
            setView("service");
            setCategoryForm(null);
            setItemForm(null);
          }}
        >
          <span aria-hidden="true">←</span>
          {d.insights.back}
        </button>
      ) : null}

      {initialView === "insights" ? (
        <InsightsDashboard dict={dict} fetchAnalytics={fetchAnalytics} fetchShiftOptions={fetchShiftOptions} onSessionExpired={handleExpired} backHref={`/faza/${coffeeSlug}/admin`} />
      ) : null}

      {initialView !== "insights" && !isSettingsView ? <nav className="admin-tabs" role="tablist" aria-label={d.chrome.roleCoffee}>
        {(["service", "tables", "orders"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            className={cn("admin-tabs__tab", view === id && "admin-tabs__tab--active")}
            onClick={() => {
              setView(id);
              setSettingsOpen(false);
              setCategoryForm(null);
              setItemForm(null);
            }}
          >
            {d.navigation[id]}
          </button>
        ))}
      </nav> : null}

      {initialView !== "insights" && coffeeStatus === "error" ? (
        <AdminNotice
          title={d.errors.loadFailed}
          message={coffeeError ?? undefined}
          actionLabel={d.errors.retry}
          onAction={reloadCoffee}
        />
      ) : initialView !== "insights" && coffeeStatus === "ready" ? (
        view === "service" || view === "tables" || view === "orders" ? (
        <OrdersSection
          token={token}
          section={view}
          onStartService={() => setView("service")}
        />
      ) : view === "menu" ? (
        categoryForm || itemForm ? (
          <section className="admin-section admin-form-page">
            <button
              type="button"
              className="admin-btn admin-btn--ghost admin-settings-back"
              onClick={() => {
                setCategoryForm(null);
                setItemForm(null);
                setCategoryFormError(null);
                setItemFormError(null);
              }}
            >
              <span aria-hidden="true">←</span>
              {d.insights.back}
            </button>
            {categoryForm ? (
              <CategoryForm
                dict={dict}
                title={categoryForm.mode === "create" ? d.categories.createTitle : d.categories.editTitle}
                initialName={categoryForm.mode === "edit" ? categoryForm.category.name : undefined}
                initialImage={categoryForm.mode === "edit" ? categoryForm.category.image : undefined}
                busy={categoryFormBusy}
                error={categoryFormError}
                onSubmit={handleCategorySave}
                onUpload={uploadForSession}
                onCancel={() => {
                  setCategoryForm(null);
                  setCategoryFormError(null);
                }}
              />
            ) : itemForm && activeCategory ? (
              <ItemForm
                dict={dict}
                title={itemForm.mode === "create" ? d.items.createTitle : d.items.editTitle}
                initial={
                  itemForm.mode === "edit"
                    ? {
                        name: itemForm.item.name,
                        description: itemForm.item.description,
                        price: itemForm.item.price,
                        promotion: itemForm.item.promotion,
                        isAvailable: itemForm.item.isAvailable,
                        image: itemForm.item.image,
                      }
                    : undefined
                }
                busy={itemFormBusy}
                error={itemFormError}
                onSubmit={handleItemSave}
                onUpload={uploadForSession}
                onCancel={() => {
                  setItemForm(null);
                  setItemFormError(null);
                }}
              />
            ) : null}
          </section>
        ) : activeCategory ? (
          <section className="admin-section admin-form-page">
            <button
              type="button"
              className="admin-btn admin-btn--ghost admin-settings-back"
              onClick={() => {
                setActiveCategoryId(null);
                setItems(null);
                setItemsError(null);
                setItemsStatus("idle");
              }}
            >
              <span aria-hidden="true">←</span>
              {d.insights.back}
            </button>
            <div className="admin-head">
              <div className="admin-head__text">
                <p className="admin-head__hint">Catégorie</p>
                <h2 className="admin-head__title">{activeCategory.name}</h2>
                <p className="admin-head__hint">
                  Consultez les articles de cette catégorie ou ajoutez-en un nouveau.
                </p>
              </div>
              <div className="admin-form__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => {
                    setCategoryFormError(null);
                    setCategoryForm({ mode: "edit", category: activeCategory });
                  }}
                >
                  {d.categories.edit}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={() => {
                    setItemFormError(null);
                    setItemForm({ mode: "create" });
                  }}
                >
                  {d.items.add}
                </button>
              </div>
            </div>
            <ItemList
              dict={dict}
              items={items ?? []}
              loading={itemsStatus === "loading" || itemsStatus === "idle"}
              error={itemsStatus === "error" ? itemsError : null}
              onRetry={() => activeCategoryId && void loadItems(activeCategoryId)}
              onEdit={(item) => {
                setItemFormError(null);
                setItemForm({ mode: "edit", item });
              }}
              onDelete={(item) => setItemDelete(item)}
              onToggleAvailability={(item) => void handleItemAvailability(item)}
              availabilityBusyId={itemAvailabilityBusy}
            />
          </section>
        ) : (
        <>
          <section className="admin-section">
            <div className="admin-head">
              <div className="admin-head__text">
                <h2 className="admin-head__title">{d.categories.title}</h2>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => {
                  setCategoryFormError(null);
                  setItemForm(null);
                  setCategoryForm({ mode: "create" });
                }}
              >
                {d.categories.add}
              </button>
            </div>

            <CategoryList
              dict={dict}
              categories={categories ?? []}
              selectedId={activeCategoryId}
              loading={catStatus === "idle"}
              error={catStatus === "error" ? catError : null}
              onRetry={reloadCategories}
              onAdd={() => {
                setCategoryFormError(null);
                setCategoryForm({ mode: "create" });
              }}
              onSelect={(category) => {
                setItemForm(null);
                setActiveCategoryId(category.id);
                void loadItems(category.id);
              }}
              onEdit={(category) => {
                setCategoryFormError(null);
                setCategoryForm({ mode: "edit", category });
              }}
              onDelete={(category) => setCategoryDelete(category)}
            />
          </section>

        </>
        )
      ) : view === "profile" ? (
        coffee ? (
          <section className="admin-section">
            <div className="admin-head">
              <div className="admin-head__text">
                <h2 className="admin-head__title">{d.settings.title}</h2>
                <p className="admin-head__hint">{d.settings.intro}</p>
              </div>
            </div>
            <CoffeeForm
              dict={dict}
              mode="edit"
              initial={{ name: coffee.name, logo: coffee.logo, cover: coffee.cover ?? undefined, slug: coffee.slug }}
              title={d.coffeeForm.editTitle}
              busy={settingsBusy}
              error={settingsError}
              hideCancel
              onSubmit={handleSettingsSave}
              onUpload={uploadForSession}
              onCancel={() => setSettingsError(null)}
            />
          </section>
        ) : null
      ) : (
        <section className="admin-section">
          <div className="admin-head__text">
            <h2 className="admin-head__title">{d.pin.title}</h2>
            <p className="admin-head__hint">{d.pin.intro}</p>
          </div>
          <ChangePinForm
            dict={dict}
            busy={pinBusy}
            error={pinError}
            onSubmit={handlePinChange}
          />
        </section>
      )      ) : initialView !== "insights" ? (
        <AdminNotice title={d.errors.loadFailed} loading />
      ) : null}

      {initialView !== "insights" && categoryDelete ? (
        <AdminConfirmDialog
          title={d.delete.categoryTitle(categoryDelete.name)}
          message={d.delete.categoryMessage}
          confirmLabel={d.delete.confirm}
          cancelLabel={d.delete.cancel}
          busyLabel={d.delete.deleting}
          busy={categoryDeleteBusy}
          onConfirm={() => void handleCategoryDelete()}
          onCancel={() => setCategoryDelete(null)}
        />
      ) : null}

      {initialView !== "insights" && itemDelete ? (
        <AdminConfirmDialog
          title={d.delete.itemTitle(itemDelete.name)}
          message={d.delete.itemMessage}
          confirmLabel={d.delete.confirm}
          cancelLabel={d.delete.cancel}
          busyLabel={d.delete.deleting}
          busy={itemDeleteBusy}
          onConfirm={() => void handleItemDelete()}
          onCancel={() => setItemDelete(null)}
        />
      ) : null}
    </AdminLayout>
  );
}