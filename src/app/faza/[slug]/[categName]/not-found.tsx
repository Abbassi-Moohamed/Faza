import Link from "next/link";

import { getDictionary } from "@/i18n";

/**
 * Category-specific 404 for `/faza/:slug/:categName` when the slug is
 * unknown or the category only exists under a different coffee. Same branded
 * notice language, an explicit back path to the coffee menu.
 */
export default function CategoryNotFound() {
  const dict = getDictionary();

  return (
    <main id="main" className="notice-page">
      <div className="container">
        <p className="notice-page__eyebrow">{dict.notFound.eyebrow}</p>
        <h1 className="notice-page__title">{dict.notFound.categoryTitle}</h1>
        <p className="notice-page__text">{dict.notFound.categoryMessage}</p>
        <Link className="notice-page__cta" href="/faza">
          {dict.notFound.cta}
        </Link>
      </div>
    </main>
  );
}
