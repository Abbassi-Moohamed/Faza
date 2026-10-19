"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { Dictionary } from "@/i18n/dictionary";
import { pinError } from "@/lib/admin-errors";
import { cn } from "@/lib/utils";

interface AdminPinGateProps {
  dict: Dictionary;
  /** Heading shown above the dots. */
  title: string;
  /** Short helper line under the title. */
  subtitle: string;
  /** Optional coffee logo (coffee-admin gate). */
  logo?: string;
  /** Called with exactly 4 digits; must throw on authentication failure. */
  onSubmit: (pin: string) => Promise<void>;
}

/**
 * Clean, mobile-first PIN screen guarding every admin route. Accepts only
 * digits, submits only when exactly 4 are entered (never malformed payloads),
 * and surfaces a friendly message when the backend rejects the PIN.
 */
export function AdminPinGate({ dict, title, subtitle, logo, onSubmit }: AdminPinGateProps) {
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setPin(digits);
    if (error) setError(null);
  };

  const submit = async () => {
    if (pin.length !== 4 || status === "submitting") return;
    setStatus("submitting");
    setError(null);
    try {
      await onSubmit(pin);
      // On success the parent swaps this screen for the backoffice.
    } catch (err) {
      setError(pinError(dict, err));
      setPin("");
      setStatus("idle");
      inputRef.current?.focus();
    }
  };

  return (
    <div className="pin-gate">
      <div className="pin-gate__card">
        {logo ? (
          <Image className="pin-gate__logo" src={logo} alt="" width={64} height={64} unoptimized />
        ) : (
          <span className="pin-gate__mark" aria-hidden="true">
            M
          </span>
        )}

        <h1 className="pin-gate__title">{title}</h1>
        <p className="pin-gate__subtitle">{subtitle}</p>

        <div className="pin-gate__dots" role="presentation" onClick={() => inputRef.current?.focus()}>
          {Array.from({ length: 4 }, (_, index) => (
            <span
              key={index}
              className={cn("pin-gate__dot", index < pin.length && "pin-gate__dot--filled")}
              aria-hidden="true"
            />
          ))}
        </div>

        <input
          ref={inputRef}
          className="pin-gate__input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          aria-label={dict.admin.gate.label}
          value={pin}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
        />

        <button
          type="button"
          className={cn("pin-gate__submit", pin.length === 4 && "pin-gate__submit--ready")}
          disabled={pin.length !== 4 || status === "submitting"}
          onClick={() => void submit()}
        >
          {status === "submitting" ? dict.admin.gate.verifying : dict.admin.gate.verify}
        </button>

        {error ? (
          <p className="pin-gate__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
