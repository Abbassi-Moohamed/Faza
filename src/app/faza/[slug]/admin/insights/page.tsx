import type { Metadata } from "next";

import { CoffeeAdmin } from "@/components/admin/CoffeeAdmin";

export const metadata: Metadata = {
  title: "Analyses — Administration",
  robots: { index: false, follow: false },
};

interface CoffeeAdminInsightsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CoffeeAdminInsightsPage({ params }: CoffeeAdminInsightsPageProps) {
  const { slug } = await params;
  return <CoffeeAdmin coffeeSlug={slug} initialView="insights" />;
}
