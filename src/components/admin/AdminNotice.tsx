"use client";

interface AdminNoticeProps {
  title: string;
  message?: string;
  /** Renders shimmer placeholder lines instead of the title/message. */
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

/** Shared empty / error / loading state block used across the backoffice. */
export function AdminNotice({ title, message, loading, actionLabel, onAction }: AdminNoticeProps) {
  if (loading) {
    return (
      <div className="admin-notice" aria-busy="true" aria-label={title}>
        <span className="admin-notice__title skeleton skeleton--card-title" />
        <span className="admin-notice__text skeleton skeleton--card-line" />
        <span className="admin-notice__text skeleton skeleton--card-line skeleton--card-line--short" />
      </div>
    );
  }

  return (
    <div className="admin-notice">
      <h3 className="admin-notice__title">{title}</h3>
      {message ? <p className="admin-notice__text">{message}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" className="admin-notice__action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
