import Link from "next/link";

import { getDictionary } from "@/i18n";

/**
 * Customer-facing 404 for unknown routes and unknown coffee slugs.
 * No backend details are ever surfaced.
 */
export default function NotFound() {
  const dict = getDictionary();

  return (
    <main id="main" className="notice-page">
      <div className="container">
        <p className="notice-page__eyebrow">{dict.notFound.eyebrow}</p>
        <h1 className="notice-page__title">{dict.notFound.title}</h1>
        <p className="notice-page__text">{dict.notFound.message}</p>
        <Link className="notice-page__cta" href="/faza">
          {dict.notFound.cta}
        </Link>
      </div>
    </main>
  );
}
