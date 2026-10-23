export const siteConfig = {
  name: "Faza",
  description:
    "Café de spécialité et douceurs de saison. Ouvrez le menu directement sur votre téléphone en scannant le code QR.",
  url: "https://faza-iota.vercel.app",
  locale: "fr-TN",
  /** Shop timezone used to render dates and offer windows consistently server-side. */
  timeZone: "Africa/Tunis",
  /** Presentation default used to render backend prices (backend sends decimals only). */
  currency: "TND",
} as const;

export type SiteConfig = typeof siteConfig;
