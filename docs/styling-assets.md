# Styling & Assets

## CSS

- Single global stylesheet: `src/app/globals.css`.
- No Tailwind, CSS modules, or component library.
- Styles are organized around public menu, offers, order, and admin sections.

## Fonts

- `next/font/google` in `src/app/layout.tsx`.
- Fraunces for display typography.
- Inter for body text.

## Theme and metadata

- Theme color: `#fbf7ef`.
- Manifest is declared in the root layout.
- `lang="fr"`.

## Site config

`src/config/site.ts`:

- name: Faza
- URL: production Vercel URL
- locale: `fr-TN`
- timezone: `Africa/Tunis`
- currency: `TND`

Prices are sent by the backend as decimals and formatted for presentation with
the TND currency and site locale.

## Images

Next Image is configured with `unoptimized: true` because menu images and logos
may come from arbitrary external hosts. This avoids remote-domain allow-listing
while retaining the Image layout API.
