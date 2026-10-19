import type { Metadata } from "next";

import { CoffeeAdmin } from "@/components/admin/CoffeeAdmin";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

interface CoffeeAdminPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Coffee backoffice — `/faza/:slug/admin`. The slug drives the PIN gate
 * and is cross-checked against the session's coffee; writes stay token-scoped.
 */
export default async function FazaCoffeeAdminPage({ params }: CoffeeAdminPageProps) {
  const { slug } = await params;
  return <CoffeeAdmin coffeeSlug={slug} />;
}
