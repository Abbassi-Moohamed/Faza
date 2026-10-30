import type { Metadata } from "next";

import { MenuScene } from "@/components/menu/MenuScene";
import { OrderCenter } from "@/components/ordering/OrderCenter";
import { toMenuCategory } from "@/lib/adapters";
import { getCoffeeBySlug, getCoffeeOffers } from "@/lib/api";
import { resolvePublicCoffee } from "@/lib/public-coffee";

interface CoffeePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CoffeePageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const coffee = await getCoffeeBySlug(slug);
    return { title: coffee.name, description: `Menu · ${coffee.name}` };
  } catch {
    return { title: "Menu" };
  }
}

/**
 * Coffee menu — `/faza/:slug`. The slug drives a single backend fetch:
 * the coffee (and its category names) are the source of truth; every bubble
 * links to its own `/faza/:slug/:categName` items page.
 */
export default async function CoffeePage({ params }: CoffeePageProps) {
  const { slug } = await params;
  const coffee = await resolvePublicCoffee(slug);
  // Offers are an enhancement: a failure never breaks the menu itself.
  const offers = await getCoffeeOffers(slug).catch(() => []);

  return (
    <div id="top" className="menu-page">
      <main id="main">
        <MenuScene
          name={coffee.name}
          logo={coffee.logo}
          cover={coffee.cover}
          coffeeSlug={slug}
          categories={coffee.categories.map(toMenuCategory)}
          offersHref={offers.length > 0 ? `/faza/${slug}/offers` : undefined}
          offersCount={offers.length}
        />
        <OrderCenter coffeeSlug={slug} tableCount={coffee.tableCount} offers={offers} />
      </main>
    </div>
  );
}
