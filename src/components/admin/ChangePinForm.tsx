"use client";

import { useState } from "react";

import type { Dictionary } from "@/i18n/dictionary";
import { cn } from "@/lib/utils";

interface ChangePinFormProps {
  dict: Dictionary;
  busy: boolean;
  /** Server-side error (already translated). */
  error?: string | null;
  onSubmit: (currentPin: string, newPin: string) => Promise<void>;
}

const DIGITS = /^\d{4}$/;

/**
 * "Change PIN" form: current PIN + new PIN + confirmation. The PIN is only
 * held transiently in component state and is never persisted client-side.
 */
export function ChangePinForm({ dict, busy, error, onSubmit }: ChangePinFormProps) {
  const t = dict.admin.pin;
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleChange = (setter: (v: string) => void) => {
    return (value: string) => setter(value.replace(/\D/g, "").slice(0, 4));
  };

  const submit = () => {
    if (!DIGITS.test(currentPin) || !DIGITS.test(newPin) || !DIGITS.test(confirmPin)) {
      setFieldError(t.invalid);
      return;
    }
    if (newPin !== confirmPin) {
      setFieldError(t.mismatch);
      return;
    }
    if (newPin === currentPin) {
      setFieldError(t.sameAsCurrent);
      return;
    }
    setFieldError(null);
    void onSubmit(currentPin, newPin);
  };

  return (
    <section className={cn("admin-form", busy && "admin-form--disabled")} aria-busy={busy}>
      <div className="admin-form__head">
        <h3 className="admin-form__title">{t.title}</h3>
        <p className="admin-form__hint">{t.intro}</p>
      </div>

      <label className="admin-field">
        <span className="admin-field__label">{t.current}</span>
        <input
          className="admin-field__input admin-field__input--pin"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={currentPin}
          disabled={busy}
          autoComplete="off"
          onChange={(event) => handleChange(setCurrentPin)(event.target.value)}
        />
      </label>

      <label className="admin-field">
        <span className="admin-field__label">{t.newPin}</span>
        <input
          className="admin-field__input admin-field__input--pin"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={newPin}
          disabled={busy}
          autoComplete="new-password"
          onChange={(event) => handleChange(setNewPin)(event.target.value)}
        />
      </label>

      <label className="admin-field">
        <span className="admin-field__label">{t.confirm}</span>
        <input
          className="admin-field__input admin-field__input--pin"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={confirmPin}
          disabled={busy}
          autoComplete="off"
          onChange={(event) => handleChange(setConfirmPin)(event.target.value)}
        />
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
        <button type="button" className="admin-btn admin-btn--primary" disabled={busy} onClick={submit}>
          {busy ? t.saving : t.save}
        </button>
      </div>
    </section>
  );
}
