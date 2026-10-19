"use client";

import Image from "next/image";
import Link from "next/link";

import type { Dictionary } from "@/i18n/dictionary";
import type { AdminCoffeeDto } from "@/types/backend";

import { AdminNotice } from "./AdminNotice";

interface CoffeeListProps {
  dict: Dictionary;
  coffees: AdminCoffeeDto[];
  loading: boolean;
  error?: string | null;
  onRetry: () => void;
  onEdit: (coffee: AdminCoffeeDto) => void;
  onResetPin: (coffee: AdminCoffeeDto) => void;
  onDelete: (coffee: AdminCoffeeDto) => void;
}

export function CoffeeList({ dict, coffees, loading, error, onRetry, onEdit, onResetPin, onDelete }: CoffeeListProps) {
  const d = dict.admin;

  if (loading) {
    return (
      <ul className="coffee-list" aria-busy="true">
        {Array.from({ length: 3 }, (_, index) => (
          <li key={index} className="coffee-list__item">
            <span className="coffee-list__logo skeleton skeleton--thumb" />
            <div className="coffee-list__body">
              <span className="skeleton skeleton--card-title" />
              <span className="skeleton skeleton--card-line skeleton--card-line--short" />
            </div>
            <span className="skeleton skeleton--chip" />
          </li>
        ))}
      </ul>
    );
  }

  if (error) {
    return <AdminNotice title={d.errors.loadFailed} message={error} actionLabel={d.errors.retry} onAction={onRetry} />;
  }

  if (coffees.length === 0) {
    return <AdminNotice title={d.app.emptyTitle} message={d.app.emptyMessage} />;
  }

  return (
    <ul className="coffee-list">
      {coffees.map((coffee) => (
        <li key={coffee.id} className="coffee-list__item">
          <span className="coffee-list__logo">
            {coffee.logo ? (
              <Image src={coffee.logo} alt="" fill sizes="3rem" className="coffee-list__logo-img" />
            ) : null}
          </span>
          <div className="coffee-list__body">
            <span className="coffee-list__name">{coffee.name}</span>
            <span className="coffee-list__slug">/faza/{coffee.slug}</span>
            <span className="coffee-list__count">{d.app.categoryCount(coffee.categoryCount)}</span>
          </div>
          <div className="coffee-list__actions">
            <Link className="coffee-list__action coffee-list__action--menu" href={`/faza/${coffee.slug}`}>
              {d.app.openMenu}
            </Link>
            <button type="button" className="coffee-list__action" onClick={() => onEdit(coffee)}>
              {d.app.edit}
            </button>
            <button
              type="button"
              className="coffee-list__action"
              title={d.app.resetPin}
              onClick={() => onResetPin(coffee)}
            >
              {d.app.resetPin}
            </button>
            <button
              type="button"
              className="coffee-list__action coffee-list__action--danger"
              onClick={() => onDelete(coffee)}
            >
              {d.delete.confirm}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
