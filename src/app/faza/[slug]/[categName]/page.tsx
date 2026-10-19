import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/layout/BackLink";
import { CategoryChipsRail } from "@/components/menu/CategoryChipsRail";
import { OrderExperience } from "@/components/ordering/OrderExperience";
import { getDictionary } from "@/i18n";
import { categoryIcon, toMenuItem } from "@/lib/adapters";
import { ApiClientError, getCoffeeBySlug, getItemsByCategoryId } from "@/lib/api";
import { resolvePublicCoffee } from "@/lib/public-coffee";
import { categoryHref, slugify } from "@/lib/utils";

interface CategoryPageProps {
  params: Promise<{ slug: string; categName: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug, categName } = await params;
  try {
    const coffee = await getCoffeeBySlug(slug);
    const category = coffee.categories.find((c) => slugify(c.name) === slugify(categName));
    if (category) {
      return {
        title: `${category.name} — ${coffee.name}`,
        description: `Menu · ${coffee.name}`,
      };
    }
  } catch {
    // fall through to the neutral title below
  }
  return { title: "Menu" };
}

/**
 * Category items page — `/faza/:slug/:categName`. The category is resolved
 * strictly WITHIN the coffee returned by the backend (`slugify(name)` match),
 * so a category that belongs to another coffee can never leak its items here;
 * unknown coffees and unknown/mismatched categories are clean not-founds.
 */
export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug, categName } = await params;
  const dict = getDictionary();

  const coffee = await resolvePublicCoffee(slug);
  const category = coffee.categories.find((c) => slugify(c.name) === slugify(categName));
  if (!category) {
    notFound();
  }

  let items;
  try {
    items = await getItemsByCategoryId(category.id);
  } catch (error) {
    if (error instanceof ApiClientError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }

  const menuItems = items.map(toMenuItem);

  return (
    <main id="main">
      <section className="category-page">
        <div className="category-page__sticky">
          <div className="container category-page__header">
            <BackLink className="category-page__back" href={`/faza/${slug}`} label={dict.sheet.backLabel} />
            <div className="category-page__heading">
              <h1 className="category-page__title">{category.name}</h1>
              <p className="category-page__count">{dict.sheet.itemsCountLabel(menuItems.length)}</p>
            </div>
          </div>
          <CategoryChipsRail ariaLabel={dict.sheet.categoriesNavLabel}>
            {coffee.categories.map((sibling) => {
              const glyph = (
                <span className="category-chip__icon" aria-hidden="true">
                  {categoryIcon(sibling.id, sibling.name)}
                </span>
              );
              return sibling.id === category.id ? (
                <span key={sibling.id} className="category-chip category-chip--active" aria-current="page">
                  {glyph}
                  {sibling.name}
                </span>
              ) : (
                <Link key={sibling.id} href={categoryHref(slug, sibling.name)} className="category-chip">
                  {glyph}
                  {sibling.name}
                </Link>
              );
            })}
          </CategoryChipsRail>
        </div>

        {menuItems.length > 0 ? (
          <OrderExperience coffeeSlug={slug} items={menuItems} />
        ) : (
          <div className="container">
            <div className="sheet-state">
              <p className="sheet-state__title">{dict.sheet.emptyTitle}</p>
              <p className="sheet-state__text">{dict.sheet.emptyMessage}</p>
              <Link className="notice-page__cta" href={`/faza/${slug}`}>
                {dict.sheet.emptyCta}
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
