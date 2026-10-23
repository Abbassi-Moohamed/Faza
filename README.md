# Faza Frontend

Next.js 16 App Router frontend for the Faza QR-menu platform. It provides the
mobile-first public menu, cart and order tracking, today's offers, and the
PIN-protected app-admin and coffee-admin backoffices.

Current, code-grounded documentation lives in [`docs/`](docs/README.md).

## Stack

- Next.js `^16.4.2` App Router, React `19.3.0`, TypeScript
- `socket.io-client` `^4.8.4`
- Custom global CSS (no Tailwind or component library)
- Fraunces + Inter via `next/font/google`
- Vitest + jsdom for unit tests

There is no React Query/SWR or global state library. Data fetching goes through
`src/lib/api.ts`; local browser state is kept in `localStorage`/`sessionStorage`.

## Local development

Requirements: Node.js 22.x, npm, and a running backend.

```powershell
copy .env.example .env
npm ci
npm run dev
```

Default URLs:

- Frontend: `http://localhost:3000`
- API: `http://localhost:4000`

Environment variables:

- `BACKEND_API_URL`: server-side API origin (SSR)
- `NEXT_PUBLIC_BACKEND_API_URL`: browser-visible API origin

The browser API helper includes a LAN/QR-testing override: when the configured
API host is loopback but the page is opened from another host, it uses
`http://<pageHost>:4000`. `next.config.ts` also allows dev origin
`192.168.1.146`.

## Main routes

Public/customer:

```text
/                              landing
/faza                          Faza landing
/faza/[slug]                   coffee menu
/faza/[slug]/[categName]       category view
/faza/[slug]/offers            today's offers
/faza/[slug]/offers/[offerId]  offer detail
/faza/[slug]/orders            session order history
/faza/[slug]/order/[orderId]   order status
/[coffeeSlug]                  alternate slug route
/menuscan/[[...path]]          menu-scan catch-all
```

Admin:

```text
/faza/admin                    app admin (APP_ADMIN)
/faza/admin/insights           platform insights
/faza/[slug]/admin             coffee admin
/faza/[slug]/admin/offers      offers management
/faza/[slug]/admin/insights    coffee insights
/[coffeeSlug]/admin            alternate coffee-admin route
```

## Behavior notes

- Public coffee lookup maps backend `404`/`400` to a Next.js not-found page.
- The cart is stored per coffee under `faza:cart:${slug}` and supports both
  regular items and offer bundles.
- Order submission creates or joins a table session; the returned session token
  is retained on the device for later orders/history.
- Admin sessions live in `sessionStorage` under `faza.admin.session`; the API
  enforces roles and tenant scope.
- Realtime order/session updates use the backend Socket.IO endpoint.
- UI copy is French-only via `getDictionary()`. There is no language switcher.

## Scripts

```text
npm run dev          Next.js development server
npm run build        production build
npm start            production server
npm run lint         ESLint
npm run format       Prettier write
npm run format:check Prettier check
npm run typecheck    tsc --noEmit
npm test             Vitest
npm run test:watch   Vitest watch
npm run smoke        scripts/smoke.mjs
npm run check        typecheck + tests
```

## Documentation map

- [Architecture](docs/architecture.md)
- [API client & data layer](docs/api-client.md)
- [Routing & pages](docs/routing-pages.md)
- [Components](docs/components.md)
- [State & flows](docs/state-flows.md)
- [Styling & assets](docs/styling-assets.md)
- [Testing](docs/testing.md)
- [Known limitations](docs/known-limitations.md)

## Known documentation caveats

- The Coffee model has no `defaultLanguage`; language switching is not
  implemented.
- The backend insights service contains a hard-coded discount rate and
  synthetic promotion fields, which the dashboard may display.
- No frontend security headers are configured in `next.config.ts`.
- No order idempotency key is sent; retrying a create request can duplicate an
  order.
