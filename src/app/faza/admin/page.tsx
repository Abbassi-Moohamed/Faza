import type { Metadata } from "next";

import { AppAdmin } from "@/components/admin/AppAdmin";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

/**
 * Faza application admin — `/faza/admin`. The PIN gate and the whole
 * backoffice are client-driven.
 */
export default function AppAdminPage() {
  return <AppAdmin />;
}