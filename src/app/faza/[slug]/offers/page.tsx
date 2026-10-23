import type { Metadata } from "next";
import Link from "next/link";

import { BackLink } from "@/components/layout/BackLink";
import { OffersList } from "@/components/offers/OffersList";
import { getDictionary } from "@/i18n";
import { getCoffeeOffers } from "@/lib/api";
import { resolvePublicCoffee } from "@/lib/public-coffee";

interface OffersPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: OffersPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const coffee = await resolvePublicCoffee(slug);
    return { title: `Offres du jour — ${coffee.name}` };
  } catch {
    return { title: "Offres du jour" };
  }
}

/** Public index of today's offers for one coffee. */
export default async function OffersPage({ params }: OffersPageProps) {
  const { slug } = await params;
  const d = getDictionary();
  const coffee = await resolvePublicCoffee(slug);
  const offers = await getCoffeeOffers(slug);

  return (
    <main id="main">
      <section className="offers-page container">
        <div className="offers-page__header">
          <BackLink className="offers-page__back" href={`/faza/${slug}`} label={d.offer.backToMenu} />
          <div className="offers-page__heading">
            <h1 className="offers-page__title">{d.offer.pageTitle}</h1>
            <p className="offers-page__hint">{d.offer.pageHint(coffee.name)}</p>
          </div>
        </div>

        {offers.length > 0 ? (
          <OffersList coffeeSlug={slug} offers={offers} />
        ) : (
          <div className="sheet-state offers-page__empty">
            <p className="sheet-state__title">{d.offer.emptyTitle}</p>
            <p className="sheet-state__text">{d.offer.emptyMessage}</p>
            <Link className="offers-page__cta" href={`/faza/${slug}`}>
              {d.offer.emptyCta}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
