# Frontend Architecture

## Stack

- Next.js `^16.4.2` App Router
- React `19.3.0`, React DOM `19.3.0`
- TypeScript, ESLint, Prettier
- `socket.io-client` `^4.8.4`
- Custom global CSS; no Tailwind or component library
- Vitest + jsdom

## Structure

```text
src/app/          App Router routes, layouts, error/not-found states
src/components/   Public and admin UI components
src/lib/          API client, cart, sessions, orders, realtime, helpers
src/i18n/         Dictionary types and French copy
src/config/       API and site configuration
src/types/        Backend DTOs and menu types
```

## Rendering and data

- Public menu pages are server components. They resolve the coffee through
  `resolvePublicCoffee(slug)`, which maps backend 400/404 responses to Next's
  `notFound()`.
- Admin screens are client components. They call the API with an explicit
  bearer token and manage local UI state.
- `src/lib/api.ts` is the single request layer. It prefixes `/api/v1`, unwraps
  the backend envelope, and throws `ApiClientError` with status/details.
- There is no React Query, SWR, Redux, or other global state library.

## Layout

`src/app/layout.tsx`:

- sets `lang="fr"`
- loads Fraunces (display) and Inter (body) with `next/font/google`
- renders a skip link, `Header`, and `PublicChrome`
- declares the manifest and theme color `#fbf7ef`

## Configuration

`src/config/api.ts`:

- Server-side uses `BACKEND_API_URL`.
- Browser uses `NEXT_PUBLIC_BACKEND_API_URL`.
- If the configured API host is loopback but the page is opened from another
  host, the browser uses `http://<pageHost>:4000` for LAN/QR testing.

`src/config/site.ts`:

- name: Faza
- locale: `fr-TN`
- timezone: `Africa/Tunis`
- currency: `TND`

`next.config.ts`:

- `reactStrictMode: true`
- `allowedDevOrigins: ["192.168.1.146"]`
- `images.unoptimized: true`

## Internationalization

`getDictionary()` always returns the single French dictionary. The types allow
future languages, but there is no runtime language switch and no per-coffee
language setting.
