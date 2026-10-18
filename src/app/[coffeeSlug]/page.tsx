import { permanentRedirect } from "next/navigation";

interface LegacyCoffeeRedirectProps {
  params: Promise<{ coffeeSlug: string }>;
}

/** `/:coffeeSlug` → `/faza/:coffeeSlug` — legacy QR codes and links. */
export default async function LegacyCoffeeRedirect({ params }: LegacyCoffeeRedirectProps) {
  const { coffeeSlug } = await params;
  permanentRedirect(`/faza/${coffeeSlug}`);
}