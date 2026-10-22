"use client";

import { useEffect, useRef } from "react";

interface AdminConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  busyLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Small confirmation dialog for destructive operations. Rendered on demand
 * only, and never triggers the destructive action on a single stray click.
 */
export function AdminConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  busyLabel,
  busy,
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  return (
    <div className="admin-dialog admin-dialog--confirm" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="admin-dialog__scrim" onClick={busy ? undefined : onCancel} aria-hidden="true" />
      <div className="admin-dialog__card">
        <h3 className="admin-dialog__title">{title}</h3>
        <p className="admin-dialog__text">{message}</p>
        <div className="admin-dialog__actions">
          <button
            ref={cancelRef}
            type="button"
            className="admin-btn admin-btn--ghost"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button type="button" className="admin-btn admin-btn--danger" disabled={busy} onClick={onConfirm}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
