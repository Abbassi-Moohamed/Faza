import { permanentRedirect } from "next/navigation";

interface LegacyMenuscanRedirectProps {
  params: Promise<{ path?: string[] }>;
}

/**
 * Legacy `/menuscan/*` namespace → `/faza/*` — printed QR codes and old
 * bookmarks keep working. Optional catch-all also matches bare `/menuscan`.
 */
export default async function LegacyMenuscanRedirect({ params }: LegacyMenuscanRedirectProps) {
  const { path = [] } = await params;
  const target = ["/faza", ...path].join("/");
  permanentRedirect(path.length > 0 ? target : "/faza");
}
