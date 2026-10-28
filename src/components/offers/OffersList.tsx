import Link from "next/link";

import { siteConfig } from "@/config/site";
import { getDictionary } from "@/i18n";
import { offerImage } from "@/lib/cart";
import { formatPrice } from "@/lib/menu";
import type { FeaturedOfferDto } from "@/types/backend";
import { OfferCartActions } from "./OfferCartActions";

interface OffersListProps {
  coffeeSlug: string;
  offers: FeaturedOfferDto[];
}

/**
 * Compact index of the day's offers. Offer details remain a separate link,
 * while each card can also add its offer directly to the shared cart.
 */
export function OffersList({ coffeeSlug, offers }: OffersListProps) {
  const d = getDictionary();

  return (
    <ul className="offers-list">
      {offers.map((offer) => {
        const image = offerImage(offer);
        const soldOut = offer.stock <= 0;
        return (
          <li className="offers-list__item" key={offer.id}>
            <Link
              className={`offer-card-link${soldOut ? " offer-card-link--sold-out" : ""}`}
              href={`/faza/${coffeeSlug}/offers/${offer.id}`}
              aria-label={`${offer.name} — ${d.offer.details}`}
            >
              <div className="offer-card-link__art">
                {image ? (
                  // Remote menu images are decorative; the offer name carries the meaning.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="" loading="lazy" />
                ) : (
                  <span className="offer-card-link__art-fallback" aria-hidden="true">
                    %
                  </span>
                )}
              </div>
              <div className="offer-card-link__body">
                <div className="offer-card-link__head">
                  <h2 className="offer-card-link__name">{offer.name}</h2>
                  {soldOut ? (
                    <span className="offer-card-link__badge offer-card-link__badge--sold-out">{d.offer.soldOut}</span>
                  ) : offer.savings > 0 ? (
                    <span className="offer-card-link__badge">
                      {d.offer.savings(formatPrice(offer.savings, siteConfig.currency, siteConfig.locale))}
                    </span>
                  ) : null}
                </div>
                <p className="offer-card-link__composition">
                  {offer.lines
                    .map((line) => `${line.quantity > 1 ? `${line.quantity}x ` : ""}${line.name}`)
                    .join(" + ")}
                </p>
                <div className="offer-card-link__foot">
                  <span className="offer-card-link__prices">
                    <span className="offer-card-link__price">
                      {formatPrice(offer.price, siteConfig.currency, siteConfig.locale)}
                    </span>
                    {offer.originalPrice > offer.price ? (
                      <s className="offer-card-link__price-old">
                        {formatPrice(offer.originalPrice, siteConfig.currency, siteConfig.locale)}
                      </s>
                    ) : null}
                  </span>
                  <span className="offer-card-link__arrow" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
            <OfferCartActions coffeeSlug={coffeeSlug} offer={offer} compact />
          </li>
        );
      })}
    </ul>
  );
}
