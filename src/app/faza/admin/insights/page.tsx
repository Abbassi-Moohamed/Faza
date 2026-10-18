import type { Metadata } from "next";

import { AppAdmin } from "@/components/admin/AppAdmin";

export const metadata: Metadata = {
  title: "Analyses — Administration",
  robots: { index: false, follow: false },
};

export default function AppAdminInsightsPage() {
  return <AppAdmin initialView="insights" />;
}
