"use client";

import { getDictionary } from "@/i18n";

/**
 * Branded error boundary: keeps backend errors and technical details off the
 * screen and offers a single, honest retry.
 */
export default function RootError({ reset }: { error: Error; reset: () => void }) {
  const dict = getDictionary();

  return (
    <main id="main" className="notice-page">
      <div className="container">
        <p className="notice-page__eyebrow">{dict.unavailable.eyebrow}</p>
        <h1 className="notice-page__title">{dict.unavailable.title}</h1>
        <p className="notice-page__text">{dict.unavailable.message}</p>
        <button type="button" className="notice-page__cta" onClick={reset}>
          {dict.unavailable.retry}
        </button>
      </div>
    </main>
  );
}
