import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/layout/BackLink";
import { OfferCartActions } from "@/components/offers/OfferCartActions";
import { OrderCenter } from "@/components/ordering/OrderCenter";
import { siteConfig } from "@/config/site";
import { getDictionary } from "@/i18n";
import { getCoffeeOffers } from "@/lib/api";
import { offerImage } from "@/lib/cart";
import { formatPrice } from "@/lib/menu";
import { resolvePublicCoffee } from "@/lib/public-coffee";

interface OfferPageProps {
  params: Promise<{ slug: string; offerId: string }>;
}

const dayFormatter = new Intl.DateTimeFormat(siteConfig.locale, {
  day: "numeric",
  month: "long",
  timeZone: siteConfig.timeZone,
});
const timeFormatter = new Intl.DateTimeFormat(siteConfig.locale, {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: siteConfig.timeZone,
});
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: siteConfig.timeZone,
});

function formatOfferWindow(startAt: string | null, endAt: string | null): string {
  const d = getDictionary();
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  const sameDay = start && end ? dayKeyFormatter.format(start) === dayKeyFormatter.format(end) : false;

  if (start && end && sameDay) {
    return d.offer.availableToday(timeFormatter.format(end));
  }
  if (start && end) {
    return `${d.offer.availableFrom(`${dayFormatter.format(start)} à ${timeFormatter.format(start)}`)} · ${d.offer.availableUntil(
      `${dayFormatter.format(end)} à ${timeFormatter.format(end)}`,
    )}`;
  }
  if (start) {
    return d.offer.availableFrom(`${dayFormatter.format(start)} à ${timeFormatter.format(start)}`);
  }
  if (end) {
    const isToday = dayKeyFormatter.format(end) === dayKeyFormatter.format(new Date());
    return isToday
      ? d.offer.availableToday(timeFormatter.format(end))
      : d.offer.availableUntil(`${dayFormatter.format(end)} à ${timeFormatter.format(end)}`);
  }
  return d.offer.whileStock;
}

export async function generateMetadata({ params }: OfferPageProps): Promise<Metadata> {
  const { slug, offerId } = await params;
  try {
    const offers = await getCoffeeOffers(slug);
    const offer = offers.find((entry) => entry.id === offerId);
    return offer ? { title: offer.name, description: offer.description ?? undefined } : { title: "Offre" };
  } catch {
    return { title: "Offre" };
  }
}

/** Full detail of one offer: composition, window and add-to-cart. */
export default async function OfferPage({ params }: OfferPageProps) {
  const { slug, offerId } = await params;
  const d = getDictionary();
  await resolvePublicCoffee(slug);

  const offers = await getCoffeeOffers(slug);
  const offer = offers.find((entry) => entry.id === offerId);
  if (!offer) {
    notFound();
  }

  const image = offerImage(offer);
  const savings = offer.originalPrice - offer.price;
  const availability = formatOfferWindow(offer.startAt, offer.endAt);

  return (
    <main id="main">
      <article className="offer-detail container">
        <div className="offer-detail__header">
          <BackLink className="offer-detail__back" href={`/faza/${slug}/offers`} label={d.offer.backToOffers} />
          <p className="offer-detail__eyebrow">{d.offer.sectionTitle}</p>
        </div>

        <div className="offer-detail__hero">
          {image ? (
            // Remote menu images are decorative; the offer name carries the meaning.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" />
          ) : (
            <span className="offer-detail__hero-fallback" aria-hidden="true">
              %
            </span>
          )}
          {savings > 0 ? (
            <span className="offer-detail__savings">
              {d.offer.savings(formatPrice(savings, siteConfig.currency, siteConfig.locale))}
            </span>
          ) : null}
        </div>

        <div className="offer-detail__intro">
          <h1 className="offer-detail__title">{offer.name}</h1>
          {offer.description ? <p className="offer-detail__description">{offer.description}</p> : null}
        </div>

        <div className="offer-detail__price-row">
          <span className="offer-detail__price">
            {formatPrice(offer.price, siteConfig.currency, siteConfig.locale)}
          </span>
          {offer.originalPrice > offer.price ? (
            <s className="offer-detail__price-old">
              {formatPrice(offer.originalPrice, siteConfig.currency, siteConfig.locale)}
            </s>
          ) : null}
        </div>

        <OfferCartActions coffeeSlug={slug} offer={offer} />

        <dl className="offer-detail__meta">
          <div className="offer-detail__meta-row">
            <dt>{d.offer.availability}</dt>
            <dd>{availability}</dd>
          </div>
        </dl>

        <section className="offer-detail__composition" aria-labelledby="offer-composition-title">
          <h2 id="offer-composition-title" className="offer-detail__section-title">
            {d.offer.composition}
          </h2>
          <ul className="offer-detail__lines">
            {offer.lines.map((line) => (
              <li className="offer-detail__line" key={line.itemId}>
                <span className="offer-detail__line-art">
                  {line.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={line.image} alt="" loading="lazy" />
                  ) : (
                    <span aria-hidden="true">{line.name.charAt(0)}</span>
                  )}
                </span>
                <span className="offer-detail__line-name">
                  {line.quantity > 1 ? `${line.quantity}× ` : ""}
                  {line.name}
                </span>
                <span className="offer-detail__line-price">
                  {formatPrice(line.unitPrice * line.quantity, siteConfig.currency, siteConfig.locale)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </article>
      <OrderCenter coffeeSlug={slug} offers={offers} />
    </main>
  );
}
