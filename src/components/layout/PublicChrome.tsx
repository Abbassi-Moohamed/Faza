"use client";

import { usePathname } from "next/navigation";

/**
 * The public site chrome (brand header, footer, back-to-top) only wraps the
 * customer-facing routes. Backoffice routes match `/…/admin` and render their
 * own functional chrome instead, so the public header/footer are skipped.
 */
export function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.includes("/admin");

  return <>{isAdmin ? null : children}</>;
}
