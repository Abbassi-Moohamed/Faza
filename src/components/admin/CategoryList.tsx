"use client";

import type { Dictionary } from "@/i18n/dictionary";
import type { AdminCategoryDto } from "@/types/backend";
import { cn } from "@/lib/utils";

import { AdminNotice } from "./AdminNotice";

interface CategoryListProps {
  dict: Dictionary;
  categories: AdminCategoryDto[];
  selectedId: string | null;
  loading: boolean;
  error?: string | null;
  onRetry: () => void;
  onAdd: () => void;
  onSelect: (category: AdminCategoryDto) => void;
  onEdit: (category: AdminCategoryDto) => void;
  onDelete: (category: AdminCategoryDto) => void;
}

export function CategoryList({
  dict,
  categories,
  selectedId,
  loading,
  error,
  onRetry,
  onAdd,
  onSelect,
  onEdit,
  onDelete,
}: CategoryListProps) {
  const d = dict.admin;

  if (loading) {
    return (
      <div aria-busy="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="category-row">
            <span className="skeleton skeleton--card-title" />
            <span className="category-row__chevron skeleton skeleton--chip" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <AdminNotice title={d.categories.loadError} message={error} actionLabel={d.errors.retry} onAction={onRetry} />
    );
  }

  if (categories.length === 0) {
    return (
      <AdminNotice
        title={d.categories.emptyTitle}
        message={d.categories.emptyMessage}
        actionLabel={d.categories.add}
        onAction={onAdd}
      />
    );
  }

  return (
    <ul className="category-list">
      {categories.map((category) => {
        const count = category.itemCount;
        return (
          <li key={category.id} className="category-row">
            <button
              type="button"
              className={cn("category-row__main", selectedId === category.id && "category-row__main--active")}
              onClick={() => onSelect(category)}
              aria-label={`${category.name} — ${d.categories.itemCount(count)}`}
            >
              {category.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="category-row__image" src={category.image} alt="" />
              ) : (
                <span className="category-row__image category-row__image--empty" aria-hidden="true">
                  {category.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="category-row__name">{category.name}</span>
              <span className="category-row__count">{d.categories.itemCount(count)}</span>
            </button>
            <div className="category-row__actions">
              <button type="button" className="row-action row-action--danger" onClick={() => onDelete(category)}>
                {d.delete.confirm}
              </button>
              <button type="button" className="row-action" onClick={() => onEdit(category)}>
                {d.categories.edit}
              </button>
              <button type="button" className="row-action" onClick={() => onSelect(category)}>
                {d.categories.viewItems}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
