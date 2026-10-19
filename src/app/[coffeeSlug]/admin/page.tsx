import { permanentRedirect } from "next/navigation";

interface LegacyCoffeeAdminRedirectProps {
  params: Promise<{ coffeeSlug: string }>;
}

/** `/:coffeeSlug/admin` → `/faza/:coffeeSlug/admin` — legacy links. */
export default async function LegacyCoffeeAdminRedirect({ params }: LegacyCoffeeAdminRedirectProps) {
  const { coffeeSlug } = await params;
  permanentRedirect(`/faza/${coffeeSlug}/admin`);
}
