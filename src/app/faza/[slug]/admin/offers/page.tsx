import { CoffeeAdmin } from "@/components/admin/CoffeeAdmin";

interface OffersAdminPageProps {
  params: Promise<{ slug: string }>;
}

/** `/faza/:slug/admin/offers` — the daily offers of the coffee. */
export default async function OffersAdminPage({ params }: OffersAdminPageProps) {
  const { slug } = await params;
  return <CoffeeAdmin coffeeSlug={slug} initialView="offers" />;
}
