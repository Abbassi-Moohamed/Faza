import { BrandIntro } from "@/components/menu/BrandIntro";
import { siteConfig } from "@/config/site";
import { getDictionary } from "@/i18n";

/**
 * Faza brand landing — `/faza`, the single root namespace of the
 * app. Explicitly NOT a specific coffee: cafés are reachable through their
 * own public route `/faza/:slug` (QR code → menu).
 */
export default function FazaLandingPage() {
  const dict = getDictionary();

  return (
    <div id="top">
      <main id="main">
        <BrandIntro
          name={siteConfig.name}
          eyebrow={dict.landing.eyebrow}
          description={dict.landing.message}
        />
      </main>
    </div>
  );
}