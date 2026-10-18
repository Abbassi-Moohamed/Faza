# Faza Frontend

Faza is a mobile-first digital menu for coffee shops. A QR code opens a
coffee-specific URL, where guests discover categories and menu items without
installing an app. The frontend is a Next.js App Router application that
renders the public menu, provides the two PIN-protected backoffice
experiences, and communicates with the Faza Express.js + MongoDB backend.

The production site uses `/faza` as its canonical namespace. Older
bare-root links remain supported through permanent redirects.

## Project overview

### Public experience

```text
QR code
   |
   v
/faza/:slug
   |
   v
Coffee
   |
   v
Organic category bubbles
   |
   v
/faza/:slug/:categName
   |
   v
Item cards
```

The coffee slug identifies the tenant. The frontend requests the coffee and
its categories from the API, then requests category items only when the
category page is opened. Coffee names, categories, and items are never
hardcoded into the UI.

### Backoffice

```text
/faza/admin
   |
   v
Application admin

/faza/:slug/admin
   |
   v
Coffee admin

/faza/admin/insights
/faza/:slug/admin/insights
   |
   v
Analytics dashboard
```

Application administrators manage every coffee. A coffee administrator manages
only the coffee associated with their authenticated session.

```mermaid
flowchart TD
    QR[QR code] --> Next[Next.js frontend]
    Next --> API[Express.js REST API]
    API --> Mongo[(MongoDB)]
```

## Technology stack

| Area | Actual implementation |
| --- | --- |
| Framework | Next.js `16.3.5`, App Router, React Server Components, Turbopack in development |
| UI runtime | React `19.3.0` and `react-dom` `19.3.0` |
| Language | TypeScript `^5.8.0`, strict mode |
| Styling | Plain global CSS in `src/app/globals.css`; no Tailwind or CSS framework |
| Fonts | `next/font/google` with Fraunces for display text and Inter for body text |
| Data fetching | Native `fetch`, wrapped by `src/lib/api.ts`; no React Query/SWR |
| Forms | Controlled React components with local validation; no form library |
| Validation | Local URL and price validators in `src/lib/validators.ts`, with backend validation remaining authoritative |
| UI component library | None; components are local to `src/components` |
| Images | `next/image` with `unoptimized: true`; arbitrary remote URLs are accepted |
| Authentication | Short-lived backend bearer token stored in browser `sessionStorage` |
| Localization | Typed French dictionary in `src/i18n/fr.ts`; locale `fr-TN` |

The only runtime dependencies are Next.js, React, and React DOM. There is no
client state-management package, API client package, CSS framework, or schema
validation package.

## Project structure

```text
frontend/
â”œâ”€â”€ public/
â”‚   â”œâ”€â”€ icon.svg
â”‚   â”œâ”€â”€ icon-192.png
â”‚   â”œâ”€â”€ icon-512.png
â”‚   â””â”€â”€ manifest.webmanifest
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ page.tsx                         # Redirects / -> /faza
â”‚   â”‚   â”œâ”€â”€ layout.tsx                       # Root layout, fonts, metadata, public chrome
â”‚   â”‚   â”œâ”€â”€ globals.css                      # Shared public and admin design system
â”‚   â”‚   â”œâ”€â”€ error.tsx                        # Branded runtime error boundary
â”‚   â”‚   â”œâ”€â”€ not-found.tsx                    # Branded global 404
â”‚   â”‚   â”œâ”€â”€ [coffeeSlug]/page.tsx            # Legacy public coffee redirect
â”‚   â”‚   â”œâ”€â”€ [coffeeSlug]/admin/page.tsx      # Legacy coffee-admin redirect
â”‚   â”‚   â””â”€â”€ faza/
â”‚   â”‚       â”œâ”€â”€ page.tsx                     # Canonical brand landing page
â”‚   â”‚       â”œâ”€â”€ admin/page.tsx               # Application-admin route
â”‚   â”‚       â””â”€â”€ [slug]/
â”‚   â”‚           â”œâ”€â”€ page.tsx                 # Public coffee menu
â”‚   â”‚           â”œâ”€â”€ admin/page.tsx           # Coffee-admin route
â”‚   â”‚           â””â”€â”€ [categName]/
â”‚   â”‚               â”œâ”€â”€ page.tsx             # Public category items page
â”‚   â”‚               â””â”€â”€ not-found.tsx       # Category-specific 404
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ admin/                           # PIN gate, CRUD forms/lists, admin shell
â”‚   â”‚   â”œâ”€â”€ layout/                          # Header, footer, public chrome, back-to-top
â”‚   â”‚   â””â”€â”€ menu/                            # Brand intro, bubbles, item cards and art
â”‚   â”œâ”€â”€ config/
â”‚   â”‚   â”œâ”€â”€ api.ts                            # Context-aware API base URL
â”‚   â”‚   â””â”€â”€ site.ts                           # Brand, locale, currency and public URL
â”‚   â”œâ”€â”€ i18n/
â”‚   â”‚   â”œâ”€â”€ dictionary.ts                     # Dictionary TypeScript contract
â”‚   â”‚   â”œâ”€â”€ fr.ts                             # French UI copy
â”‚   â”‚   â””â”€â”€ index.ts                          # Dictionary access
â”‚   â”œâ”€â”€ lib/
â”‚   â”‚   â”œâ”€â”€ api.ts                            # Public and admin API functions
â”‚   â”‚   â”œâ”€â”€ adapters.ts                       # Backend DTO -> presentation model
â”‚   â”‚   â”œâ”€â”€ admin-errors.ts                   # Status -> user-facing admin errors
â”‚   â”‚   â”œâ”€â”€ admin-session.ts                   # sessionStorage token lifecycle
â”‚   â”‚   â”œâ”€â”€ blob.ts                            # Deterministic bubble geometry/layout
â”‚   â”‚   â”œâ”€â”€ menu.ts                            # Currency/price formatting
â”‚   â”‚   â”œâ”€â”€ public-coffee.ts                  # Public coffee resolution and 404 mapping
â”‚   â”‚   â”œâ”€â”€ utils.ts                           # Slugs and class-name helpers
â”‚   â”‚   â””â”€â”€ validators.ts                     # URL and price validation
â”‚   â””â”€â”€ types/
â”‚       â”œâ”€â”€ backend.ts                        # API envelopes and backend DTOs
â”‚       â””â”€â”€ menu.ts                           # UI presentation types
â”œâ”€â”€ .env.example
â”œâ”€â”€ next.config.ts
â”œâ”€â”€ package.json
â””â”€â”€ tsconfig.json
```

`src/app` owns route composition and server-side data loading. `src/components`
contains reusable UI. `src/lib/api.ts` is the only frontend API boundary;
components should call its typed functions rather than constructing URLs
directly. Backend DTOs belong in `src/types/backend.ts`; display-only derived
fields belong in `src/types/menu.ts` and `src/lib/adapters.ts`.

## Routing architecture

The authenticated Insights pages are `/faza/:slug/admin/insights` for
coffee administrators and `/faza/admin/insights` for the application
administrator. `InsightsDashboard` sends one typed request through
`src/lib/api.ts` for each selected range and renders the compact
`AnalyticsDto`; it never downloads orders or calculates business metrics in
the browser. The dashboard includes UTC date filters, KPI comparisons,
revenue/order trends, top items, peak hours, statuses, current availability,
and deterministic actionable messages. Loading skeletons, French empty/error
states, retry behavior, and responsive card/bar layouts are provided by the
existing admin styles. Custom ranges are limited by the backend to 366 days.

Historical category and promotion metrics are shown as unavailable because
the backend order snapshot does not retain category or regular-price history.
Current availability is not presented as historical availability.

### Manual payment validation

Coffee Admins manage order processing and payment separately. A confirmed
order can remain `UNPAID` until staff verify payment at the café:

```text
PENDING -> CONFIRMED -> (manual validation) PAID
PENDING -> REJECTED
```

`CONFIRMED` is not payment confirmation. The dashboard shows separate order
and payment states, offers a confirmation dialog before marking an order paid,
and disables payment validation for pending, rejected, or already paid orders.
Payment is recorded through the token-scoped
`PATCH /admin/my-coffee/orders/:orderId/payment` API; visitors cannot change
payment status.

Table views aggregate confirmed, paid, and outstanding amounts per table while
keeping payment at individual order level. Service-shift summaries and
Insights distinguish confirmed revenue, collected revenue, outstanding amount,
and payment rate. Closing a shift with confirmed unpaid orders is allowed but
shows a warning; historical order totals and item snapshots are never
recalculated or overwritten.

| Route | Implementation | Data/access |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | Permanent redirect to `/faza` |
| `/faza` | `src/app/faza/page.tsx` | Public brand landing; no backend data |
| `/:coffeeSlug` | `src/app/[coffeeSlug]/page.tsx` | Permanent redirect to `/faza/:coffeeSlug` |
| `/faza/:slug` | `src/app/faza/[slug]/page.tsx` | Server-fetches a coffee and its category summaries by slug |
| `/faza/:slug/:categName` | `src/app/faza/[slug]/[categName]/page.tsx` | Resolves category within that coffee, then fetches category items |
| `/faza/admin` | `src/app/faza/admin/page.tsx` | Client-driven application-admin PIN gate and console |
| `/faza/admin/insights` | `src/app/faza/admin/insights/page.tsx` | Authenticated application analytics dashboard |
| `/faza/:slug/admin` | `src/app/faza/[slug]/admin/page.tsx` | Client-driven coffee-admin PIN gate and console |
| `/faza/:slug/admin/insights` | `src/app/faza/[slug]/admin/insights/page.tsx` | Authenticated coffee analytics dashboard |
| `/:coffeeSlug/admin` | `src/app/[coffeeSlug]/admin/page.tsx` | Permanent redirect to canonical coffee-admin route |

The category URL uses `slugify(category.name)`. It is not a backend category
ID in the public URL. The page first loads the coffee, finds a category whose
slugified name matches `categName`, and only then requests items using that
category's backend ID. This keeps category resolution scoped to the owning
coffee.

## Public menu flow

```text
QR code
    |
    v
Extract `slug` from `/faza/:slug`
    |
    v
GET /api/v1/coffees/:coffeeSlug
    |
    v
Render coffee name/logo and dynamic category bubbles
    |
    v
User opens `/faza/:slug/:categName`
    |
    v
Resolve category name within the coffee
    |
    v
GET /api/v1/categories/:categoryId/items
    |
    v
Render item cards or an empty-category state
```

`resolvePublicCoffee` converts backend `400` and `404` responses into the
branded Next.js not-found experience. Other failures reach the branded error
boundary instead of exposing backend details.

The public coffee page is server-rendered. Category links are real Next.js
links, so category pages are deep-linkable and refresh-safe. There is no
client-side menu database or fallback list of coffee/category/item records.

## Data architecture

The backend is the source of truth. The frontend mirrors its DTOs in
`src/types/backend.ts` and adapts them for visual components.

```mermaid
flowchart TD
    Coffee[Coffee] --> Category[ItemCategory]
    Category --> Item[Item]
    Coffee -. categories summary .-> Category
    Category -. item query by categoryId .-> Item
```

### Analytics

Both admin levels use the same typed analytics contract. The application
dashboard calls `GET /api/v1/admin/insights`; a coffee dashboard calls
`GET /api/v1/admin/my-coffee/insights`. Both accept optional `from` and `to`
ISO date query parameters and return `AnalyticsDto` (KPIs, trend, rankings,
peak hours, order statuses, promotions, availability, and actionable
insights).
The dashboard supports today, yesterday, 7/30 days, this month, previous
month, and custom ranges without adding a chart dependency.

### Backend/API DTOs

| Type | Fields |
| --- | --- |
| `CoffeeDto` | `id`, `name`, `logo`, `cover: string \| null`, `slug`, `categories: CategoryDto[]` |
| `CategoryDto` | `id`, `name`, `image: string \| null` |
| `ItemDto` | `id`, `name`, `description: string \| null`, `price: number`, `image: string \| null` |
| `AdminCoffeeDto` | `id`, `name`, `logo`, `cover: string \| null`, `slug`, `categoryCount`, `createdAt`, `updatedAt` |
| `AdminCategoryDto` | `id`, `name`, `image: string \| null`, `createdAt`, `updatedAt` |
| `AdminItemDto` | `id`, `name`, `description`, `price`, `image`, `itemCategoryId`, timestamps |

All successful backend responses are expected to use
`{ success: true, data }`. Errors use `{ success: false, message, details? }`.

Prices are decimal JavaScript numbers, such as `2.5`, not integer minor units.
`formatPrice` renders TND with exactly three fraction digits using
`Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND" })`.

Public presentation models are intentionally richer:

```ts
interface MenuCategory {
  id: string;
  name: string;
  icon?: string;
  accent: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  accent?: string;
}
```

`toMenuCategory` derives a stable accent and fallback icon from the category
ID/name. When a category image exists, the public category bubble displays it.
Items are not embedded in the category adapter; they are fetched on demand.
`toMenuItem` converts nullable API description/image values to the UI shape.

When backend DTOs change, update `src/types/backend.ts`, the API function
signatures, and the adapters together. Do not invent frontend-only copies of
backend fields.

## Table Session and Service Shift

The public visitor flow is intentionally simple: a guest picks a table once,
creates a table session, then keeps ordering against that active table session.
The frontend does not expose backend concepts like `sessionId` or
`serviceShiftId` to normal visitors; the UI speaks in human language such as
"Table 12" and "Commande en cours".

### Visitor flow

```text
First order
  -> choose table number
  -> submit order
  -> backend creates/returns an active table session
  -> store the session token in coffee-scoped browser storage
  -> order confirmation

Next orders in the same session
  -> browse menu normally
  -> add items to cart
  -> submit another order
  -> reuse the same active table session
  -> no repeated form for the table number while the session stays active
```

The public ordering screen keeps `Ajouter à la commande` as a browsing action
so guests can keep shopping without being forced into the cart flow. If a valid
session is already active, the UI shows a compact, human-friendly table-state
message instead of asking for the table again.

### Session persistence and recovery

The frontend stores the session token using `localStorage`, scoped by the
coffee slug (`faza:table-session:<coffeeSlug>`). This prevents one coffee's
active session from being reused on another coffee. The token is never exposed to
normal visitors and no extra order history is persisted beyond the session token
itself.

The UI gracefully recovers from invalid, expired, or closed sessions. If the
backend rejects the token, the visitor sees a short error state and can start a
new table session without being stuck in an endless loader.

### Order, Table Session, and Service Shift

These are distinct but related concepts:

- Order: one purchase record, with its own status and total.
- Table Session: the table-level lifecycle that groups several orders for the same table in the current service period.
- Service Shift: the staff operational period that groups active table sessions and helps the coffee team manage the current service window.

The visitor-facing UX focuses on "table" and "order". The admin dashboard uses
"service" and "tables actives" as the operational model, while preserving the
individual order controls for confirm/reject/view details.

### Coffee admin service flow

The admin dashboard shows the current service at the top of the page and makes
its state obvious with a current-shift indicator. Staff can open a morning or
afternoon service, close the current service with confirmation, and review the
shift history for recent service periods. The UI renders shift statistics,
active tables, and order totals only from backend data; no static analytics or
fixed totals are hardcoded.

### Insights and shift filtering

The Insights dashboard accepts a service filter and passes the backend's
`serviceShiftId` query parameter through the typed API layer instead of filtering
an "all orders" dataset in the browser. This keeps the analytics aligned with the
backend's authoritative reporting model.

### Routes and API contracts

The frontend keeps the backend contract authoritative in `src/types/backend.ts`
and `src/lib/api.ts`.

```text
Public order creation/reuse:
  POST /api/v1/orders
  GET /api/v1/orders/:id or related order queries
  Table session token is reused if still active

Admin service shift routes:
  GET /api/v1/admin/service-shifts/current
  POST /api/v1/admin/service-shifts/open
  POST /api/v1/admin/service-shifts/close
  GET /api/v1/admin/service-shifts

Admin table-session routes:
  GET /api/v1/admin/table-sessions
  POST /api/v1/admin/table-sessions/:id/close
```

The frontend does not invent field names or response shapes. If the backend API
changes, the frontend DTOs and endpoint wrappers are updated together.

### Important UX decisions

- Keep the visitor flow mobile-first and intuitive.
- Preserve each individual order's status and identity.
- Group orders by table session for staff without masking per-order actions.
- Show pending and confirmed totals distinctly.
- Avoid exposing technical backend names to visitors.
- Recover gracefully on invalid, expired, closed, or cross-coffee session states.

## API integration

### API origins

`src/config/api.ts` uses `BACKEND_API_URL` for server-rendered requests and
`NEXT_PUBLIC_BACKEND_API_URL` for browser requests. Both default to the local
Express API at `http://localhost:4000`.

Browser requests go directly to the Express backend. This is intentional:
multipart image uploads must not pass through a Next.js/Vercel proxy body limit.
The backend CORS configuration must allow the deployed frontend origin.

Every request uses `cache: "no-store"` and sends an `Accept: application/json`
header. JSON requests receive `Content-Type: application/json`; `FormData`
uploads leave the content type unset so the browser supplies the multipart
boundary.
Non-2xx responses and unsuccessful envelopes become `ApiClientError` instances
with the HTTP status attached.

### Public endpoints

| Method | Endpoint | Used by |
| --- | --- | --- |
| `GET` | `/api/v1/coffees/:coffeeSlug` | Public coffee and category pages |
| `GET` | `/api/v1/categories/:categoryId/items` | Public category page |

### Authentication endpoints

| Method | Endpoint | Result |
| --- | --- | --- |
| `POST` | `/api/v1/admin/auth/app` | App-admin bearer session |
| `POST` | `/api/v1/admin/auth/coffee/:coffeeSlug` | Coffee-admin bearer session |

### Application-admin endpoints

All endpoints below require an `Authorization: Bearer <token>` header.

| Method | Endpoint | Operation |
| --- | --- | --- |
| `GET` | `/api/v1/admin/coffees` | List coffees |
| `POST` | `/api/v1/admin/coffees` | Create coffee |
| `PATCH` | `/api/v1/admin/coffees/:coffeeId` | Edit coffee |
| `DELETE` | `/api/v1/admin/coffees/:coffeeId` | Delete coffee and cascade its categories/items |
| `PATCH` | `/api/v1/admin/coffees/:coffeeId/pin` | Reset a coffee PIN |

### Image uploads

| Method | Endpoint | Operation |
| --- | --- | --- |
| `POST` | `/api/v1/admin/images` | Upload one multipart image using the `file` field |
| `DELETE` | `/api/v1/admin/images/:imageId` | Delete an uploaded image |

The upload request uses the authenticated admin bearer token. The frontend
selects the file and sends it to Express; only the backend talks to Cloudflare
R2. The backend returns the public URL, which the subsequent coffee/item CRUD
request persists in MongoDB. The browser never receives R2 credentials.

### Coffee-admin endpoints

All endpoints below require the coffee-admin bearer token. The backend derives
the owned coffee from the token; the frontend does not send an arbitrary
coffee owner ID.

| Method | Endpoint | Operation |
| --- | --- | --- |
| `GET` | `/api/v1/admin/my-coffee` | Load the authenticated coffee |
| `PATCH` | `/api/v1/admin/my-coffee` | Edit coffee name, logo, cover, or slug |
| `PATCH` | `/api/v1/admin/my-coffee/pin` | Change current coffee PIN |
| `GET` | `/api/v1/admin/my-coffee/categories` | List owned categories |
| `POST` | `/api/v1/admin/my-coffee/categories` | Create category |
| `PATCH` | `/api/v1/admin/my-coffee/categories/:categoryId` | Edit category |
| `DELETE` | `/api/v1/admin/my-coffee/categories/:categoryId` | Delete category and cascade items |
| `GET` | `/api/v1/admin/my-coffee/categories/:categoryId/items` | List category items |
| `POST` | `/api/v1/admin/my-coffee/categories/:categoryId/items` | Create item |
| `PATCH` | `/api/v1/admin/my-coffee/items/:itemId` | Edit item, promotion, or availability |
| `DELETE` | `/api/v1/admin/my-coffee/items/:itemId` | Delete item |

## Category bubbles

`CategoryBubbles` receives category summaries from the backend and generates
one link per category. It does not contain a fixed list of categories.

For each category:

- `categoryAccent` hashes the backend category ID into a warm, stable palette.
- `categoryIcon` selects an emoji from name keywords, or a stable fallback.
- `bubbleGeometry` uses a seeded FNV-1a hash and `mulberry32` PRNG to derive
  border-radius values, a small tilt, and vertical drift.
- `layoutBubbleRows` greedily packs approximately three equal-weight bubbles
  per row (`CATEGORY_WEIGHT = 1`, `MAX_ROW_WEIGHT = 3.1`).
- `categoryHref` slugifies the display name and creates the canonical category
  URL.

The bubble field is a responsive flex layout. It is touch-friendly, keyboard
focusable, and uses hover/focus feedback without requiring JavaScript state.
An empty category collection renders a translated empty state. The selected
category is represented by the destination page rather than a persistent
client-side selection store.

## Item cards

`MenuItemCard` displays the item name, description, formatted price, and
visual art. `ItemArt` uses the optional remote `image` URL through
`next/image`; if the URL is absent or the image fails to load, it falls back
to a gradient block with the item's initial.

Cards use a single-column sheet on the mobile-first layout and a constrained
larger presentation at wider widths. Category pages show the item count in
their header. A category with zero items renders the translated
â€œnothing in this categoryâ€ state instead of an empty list.

## Backoffice architecture

Both backoffice surfaces are client components because they manage PIN input,
session restoration, CRUD mutations, tabs, dialogs, and transient notices.

### Application admin: `/faza/admin`

`AppAdmin` accepts only an `APP_ADMIN` session. After authentication it:

- loads all coffees with `GET /admin/coffees`;
- creates coffees with name, logo, and optional cover image;
- edits name, logo, cover, and optionally slug;
- deletes a coffee after an explicit confirmation dialog;
- resets a coffee PIN through the reset endpoint after confirmation;
- links each coffee to its public menu.

New coffee slug generation is intentionally delegated to the backend. Edit-mode
slug input accepts lowercase letters, numbers, and hyphens.

### Coffee admin: `/faza/:slug/admin`

`CoffeeAdmin` accepts only a `COFFEE_ADMIN` session. It loads the token-scoped
coffee and verifies that its returned slug equals the route slug. A mismatch
shows a re-login message rather than rendering the wrong coffee.

The menu tab supports category and item CRUD. Categories support optional image
selection, local preview, backend upload, and replacement. Items are loaded lazily for the
selected category. The settings tab edits coffee name, logo, and slug. The

Coffee admins can edit each item's regular price, optional promotional price,
and availability. Promotional prices must be greater than zero and lower than
the regular price; clearing the field removes the promotion. Unavailable items
remain in the database and admin list, but the public menu marks them
`Indisponible` and does not present a promotional price as active. The settings tab edits coffee name, logo, and slug. The
security tab changes the coffee PIN. The top bar provides logout and a link to
the public menu.

```mermaid
flowchart TD
    AppPin[App PIN] --> AppSession[APP_ADMIN session]
    AppSession --> All[All coffees]
    CoffeePin[Coffee PIN] --> CoffeeSession[COFFEE_ADMIN session]
    CoffeeSession --> Own[Token-scoped coffee only]
```

## PIN gate and session handling

```text
Open admin route
      |
      v
Four-digit PIN screen
      |
      v
POST authentication endpoint
      |
      v
Backend verifies PIN and returns short-lived bearer token
      |
      v
Store validated session in sessionStorage
      |
      v
Render the appropriate admin console
```

`AdminPinGate` accepts digits only, limits input to four characters, and submits
only when exactly four digits are present. The returned token, role,
optional `coffeeId`, and `expiresIn` are stored under
`faza.admin.session` in `sessionStorage`, not `localStorage`. A tab close
therefore removes the browser-held session. PIN values themselves are never
persisted.

Application admin restores only `APP_ADMIN` sessions. Coffee admin restores
only `COFFEE_ADMIN` sessions and cross-checks the token-owned coffee slug
against the route. Logout clears the stored session and returns to the PIN
gate. A `401` or `403` during an admin request clears the session and asks the
user to reconnect. The backend remains the authority for token expiry,
ownership, and authorization; the frontend role checks are UX protection, not
a security boundary.

## Permissions

| Role | Can do | Cannot do |
| --- | --- | --- |
| `APP_ADMIN` | List, create, edit, delete all coffees; reset coffee PINs | Use coffee-admin-only token-scoped operations as a coffee owner |
| `COFFEE_ADMIN` | Edit its coffee; manage its categories/items; change its PIN; open its public menu | List or manage other coffees |

Frontend visibility and route checks improve usability, but every protected
request still carries the bearer token and must be authorized by the backend.

## Forms and CRUD behavior

### Coffee forms

`CoffeeForm` supports create and edit modes. It requires a non-empty name and
allows either an existing absolute logo URL or a device-selected image. New
files are previewed locally, uploaded to the backend, and only then persisted
by the coffee CRUD request. The optional cover uses the same upload flow and
is rendered as the public menu hero background. Edit mode optionally accepts a slug matching
`[a-z0-9]+(?:-[a-z0-9]+)*`.

### Category forms

`CategoryForm` trims the name and requires it to be non-empty. Category
creation and editing are handled by the coffee-admin component.

### Item forms

`ItemForm` follows the same upload flow for optional item images. Existing
images remain unchanged when no replacement file is selected.

`ItemForm` supports name, optional description, non-negative decimal price,
and optional absolute `http`/`https` image URL. Price inputs use decimal
steps of `0.001`, matching the TND display convention.

All forms disable their controls while a request is pending and display
translated field or server errors. Successful mutations reload the affected
list and show a temporary status notice. Deletes use
`AdminConfirmDialog`; coffee and category deletion warnings explicitly explain
their cascading effect. Updates are not optimistic: the UI reflects the
server response after the mutation completes.

## State management

There is no global state library.

| State | Location |
| --- | --- |
| Public coffee/category/item data | Server component request lifecycle |
| Selected category in coffee admin | `CoffeeAdmin` local React state |
| Admin token/role | `CoffeeAdmin` or `AppAdmin` state, restored from `sessionStorage` after hydration |
| Loading/error states | Local component state per resource |
| Create/edit/delete dialog state | Local admin component state |
| Transient success notices | Local state, automatically cleared after approximately 4.5 seconds |

Admin lists use explicit `idle`, `loading`, `ready`, and `error`-style states
and provide retry actions. Effects guard against updating state after a
request has been cancelled.

## Error and empty states

| Situation | Frontend behavior |
| --- | --- |
| Coffee not found or invalid slug | Branded public 404 |
| Category not found for the coffee | Category-specific 404 |
| Backend failure loading a public page | Branded unavailable page with retry |
| Empty coffee categories | â€œThis coffee has not published its menuâ€ state |
| Empty category items | â€œNothing in this categoryâ€ state |
| Invalid PIN | Friendly translated PIN error; input is cleared |
| Admin `401` | Session cleared; user returns to PIN gate |
| Admin `403` | Session cleared for re-authentication, or translated forbidden action error |
| Admin `404`/`409`/`400` | Translated not-found, conflict, or validation message |
| Network failure | Translated â€œcannot reach serverâ€ message |

Raw backend error text is not rendered as customer-facing copy. The mapping
in `src/lib/admin-errors.ts` translates status codes by context.

## Responsive design and design system

The public menu is QR-first and mobile-first. The shared content container is
constrained to `44rem` with `1.125rem` horizontal padding. The main public
layout is optimized for one-handed phone use, while wider screens receive
more generous spacing and category/item sizing.

The principal breakpoint is `36rem` for additional header tagline content and
`42rem` for larger menu/category layouts. Admin views use the same fluid
container but prioritize readable operational forms and action controls.

Design tokens are defined at the top of `src/app/globals.css`:

- Fraunces display typography and Inter body typography;
- cream, espresso, mocha, amber, and line colors;
- small, medium, large, and full-radius tokens;
- card, hover, and pop shadows;
- a `3.75rem` sticky public header;
- `:focus-visible` outlines and a skip link;
- reduced-motion handling through `prefers-reduced-motion`.

Public menu UI is visual and exploratory: organic shapes, category discovery,
gradual card reveals, and image/gradient art. Backoffice UI is functional and
operational: tabs, explicit labels, skeleton loading states, inline errors,
status notices, disabled busy states, and destructive confirmation dialogs.

Interactive controls are real links/buttons, form fields have labels, status
messages use appropriate live-region roles, and keyboard focus is visible.
Touch targets are sized for mobile use. Images use empty alt text because the
menu image is decorative next to the item text.

## Environment configuration

The checked-in `.env.example` contains the complete frontend configuration:

```dotenv
BACKEND_API_URL=http://localhost:4000
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:4000
```

| Variable | Required | Description |
| --- | --- | --- |
| `BACKEND_API_URL` | Recommended | Absolute Express origin for server-rendered requests. Defaults to `http://localhost:4000`. |
| `NEXT_PUBLIC_BACKEND_API_URL` | Required for browser actions | Public Express origin for browser requests and image uploads. Defaults to `http://localhost:4000`. |

Do not add credentials or PINs to `.env.example`. The backend URL may be
different in development and production; for example:

```dotenv
BACKEND_API_URL=https://your-deployed-api.example.com
NEXT_PUBLIC_BACKEND_API_URL=https://your-deployed-api.example.com
```

Do not add Cloudflare credentials to either frontend variable. R2
configuration belongs exclusively in the backend environment.

## Table Session visitor flow and Service Shift operations

The frontend implements a human-language table flow instead of exposing the
technical `TableSession` plumbing to regular visitors.

### Visitor flow

```text
First order
  -> user selects menu items
  -> enters table number once
  -> POST /api/v1/orders with the table number and items
  -> backend creates or reuses an active table session
  -> session token returned in the order response
  -> frontend stores it under the coffee slug in localStorage
  -> subsequent orders reuse the same table session automatically
```

The table number is only requested when there is no valid active session for
that coffee. Once a token is stored for the coffee slug, the cart shows a
friendly `Table X` / `Commande en cours` status instead of prompting again.
This keeps the visitor feeling like they are ordering for a table, not for a
technical backend object.

### Session token persistence

The browser stores only a minimal session token and table number under a
coffee-scoped key such as `faza:table-session:<slug>`. The token is never
shown to the visitor and never persisted beyond the browser storage available
on that device. If the backend rejects the token, the session expires, the
coffee changes, or the browser storage is unavailable, the UI clears the saved
state and asks the visitor to begin a fresh table session.

### Multiple orders and grouping

The order creation API already supports table session reuse. Each new order
keeps its own order identity and status while remaining part of that table's
current experience. The frontend does not create separate unrelated purchase
records in the UI; it groups orders by active table session when the admin
screens render active tables.

### Coffee admin: service shift and active tables

The coffee-admin dashboard reads the real backend shift lifecycle:

- `GET /api/v1/admin/my-coffee/service-shifts/current`
- `POST /api/v1/admin/my-coffee/service-shifts/open`
- `POST /api/v1/admin/my-coffee/service-shifts/close`
- `GET /api/v1/admin/my-coffee/service-shifts`
- `GET /api/v1/admin/my-coffee/table-sessions`
- `PATCH /api/v1/admin/my-coffee/table-sessions/:sessionId/close`

This creates a clear operational model:

```text
Current Service
  -> Active tables
      -> Individual orders
```

The admin screen exposes a simple open/close flow for the current service, a
history list of previous shifts, and table cards that bundle the current active
orders for each table session. Individual order status actions remain in place:
confirm, reject, and view details still operate at the individual-order level.
The table-session layer is a grouping and operational wrapper, not a replacement
for current order management.

### Insights and service filtering

The insights dashboard accepts an optional `serviceShiftId` query value and the
frontend passes it through the existing `AnalyticsQuery` contract. That allows
shift-aware filtering in the same analytics API the dashboard already uses,
without duplicating business logic in the browser. The coffee admin's insights
screen therefore filters by a selected service when present and falls back to
all services when no service is chosen.

### Important UX decisions

- The public visitor language remains human and French-first;
- technical backend object names are never surfaced to guests;
- the frontend treats the backend as the source of truth for shifts, sessions,
  and statuses;
- no static fake analytics or hard-coded table totals are used in the UI;
- all session and shift states are recovered gracefully when the backend rejects
  or closes them.

This preserves the existing Faza visual design while adding the service
shift and table-session lifecycle expected by the café workflow.

## Local development

Prerequisites: a current Node.js installation and a running Faza backend
with MongoDB configured.

```bash
git clone <repository-url>
cd frontend
copy .env.example .env
npm install
npm run dev
```

On macOS/Linux, use `cp .env.example .env` instead of `copy`. The project
loads the root `.env`; restart the dev server after changing it.

The frontend development server runs at `http://localhost:3000`. The default
backend origin is `http://localhost:4000`, so start the Express API there or
change both backend URL variables in `.env`.

Useful commands:

```bash
npm run dev       # Development server
npm run build     # Production build
npm run start     # Serve the production build
npm run lint      # ESLint
npm run typecheck # TypeScript without emitting files
```

To test the public experience, open:

```text
http://localhost:3000/faza/<coffee-slug>
```

Then open a category bubble, or directly test:

```text
http://localhost:3000/faza/<coffee-slug>/<category-name-slug>
```

To test administration:

```text
http://localhost:3000/faza/admin
http://localhost:3000/faza/<coffee-slug>/admin
```

Use the PINs configured in the backend or provisioned by the backend
administrator. Do not put real PINs in source control or documentation.

## Deployment

The expected deployment topology is:

```text
Faza Next.js
        |
        v
Express API
        |
        v
MongoDB
```

For a production Next.js deployment:

1. Set both `BACKEND_API_URL` and `NEXT_PUBLIC_BACKEND_API_URL` to the
   reachable production Express API origin.
2. Build with `npm run build`.
3. Run with `npm run start`, or deploy the project to a compatible Next.js host.
4. Ensure the backend is reachable from both the Next.js server/runtime and
   the user's browser.
5. Configure backend CORS to allow the deployed frontend origin.

The public URL structure is `/faza/<coffee-slug>` and
`/faza/<coffee-slug>/<category-slug>`. If a reverse proxy or custom domain
is added, preserve those paths and forward `/api/v1/*` through the Next
application.

## Developer guide

### Add a UI component

Put reusable public components in `src/components/menu` or
`src/components/layout`. Put reusable backoffice components in
`src/components/admin`. Keep data loading and mutation orchestration in the
route-level page or parent feature component, and pass typed props to presentational
components.

### Add a menu feature

Start with the public route/component that owns the behavior. Add or extend
the backend DTO in `src/types/backend.ts` only if the API response changes.
Use `src/lib/adapters.ts` for display-only derived fields and keep category
item loading separate if the backend endpoint is separate.

### Add an API integration

Add one typed function to `src/lib/api.ts`, using the shared `request<T>`
helper. Add or update the request/response types in `src/types/backend.ts`.
Do not fetch the backend directly from a component or use a second base-URL
mechanism.

### Add an admin feature or form

Keep authentication/session handling in `AppAdmin` or `CoffeeAdmin`. Add a
focused controlled form under `src/components/admin`, use validators from
`src/lib/validators.ts` where applicable, and map failures through
`actionError`/`isSessionFailure`. Disable controls while busy, provide a
translated error, and reload server state after successful writes.

### Add a route

Place App Router segments under `src/app`. Use an async server page for
server-fetched public data. Use `notFound()` for invalid resource resolution
and add a segment-specific `not-found.tsx` when the copy differs. For
client-driven admin routes, keep the page thin and delegate stateful behavior
to an admin component.

### Extend models and copy

Mirror backend fields in `src/types/backend.ts`, adapt them deliberately, and
update the typed dictionary contract plus `src/i18n/fr.ts` for user-facing
copy. Avoid inline customer-facing strings in components.

## Troubleshooting

| Symptom | Likely cause and solution |
| --- | --- |
| Coffee menu does not load | Check that the slug exists in MongoDB, the backend is running, and both backend URL variables point to the API origin. A `400`/`404` is intentionally shown as a 404 page. |
| Admin PIN is rejected | Confirm that the PIN belongs to the correct scope: app PIN for `/faza/admin`, coffee PIN for `/faza/:slug/admin`. The gate accepts exactly four digits. |
| Categories are empty | The coffee API returned no category summaries. Create categories in the coffee backoffice and reload the public menu. |
| Items are not displayed | Confirm the selected category has items and that `/api/v1/categories/:categoryId/items` is reachable. A successful empty array is rendered as an empty state. |
| Images do not load | Images must be absolute `http`/`https` URLs. The UI falls back to gradient art when the remote image fails. |
| CORS error | Browser requests go directly to the backend. Configure backend CORS for the frontend origin and verify `NEXT_PUBLIC_BACKEND_API_URL`. |
| API unavailable | Start the backend on port `4000`, or update `.env` and restart the Next dev server. Environment changes are not picked up by an already-running process. |
| Image upload rejected or unavailable | Check the authenticated session, backend upload limit, backend CORS configuration, and that `NEXT_PUBLIC_BACKEND_API_URL` points directly to the Express API rather than the Next/Vercel origin. |
| Production variable missing | Set both backend URL variables in the hosting platform before building/starting. Cloudflare variables belong only to the backend. |
| Session appears to disappear | Admin sessions use `sessionStorage`, so closing the browser tab clears them. A backend `401`/`403` also intentionally returns the user to the PIN gate. |
| Wrong coffee message appears | A coffee-admin token is bound to one coffee. Sign out and authenticate at the matching `/:slug/admin` route. |

## Quick reference

### Routes

| Route | Purpose | Access |
| --- | --- | --- |
| `/` | Redirect to Faza landing | Public |
| `/faza` | Faza brand landing | Public |
| `/faza/:slug` | Coffee menu and category bubbles | Public |
| `/faza/:slug/:categName` | Items for one coffee category | Public |
| `/faza/admin` | Application backoffice | Four-digit PIN |
| `/faza/:slug/admin` | Coffee backoffice | Four-digit PIN |
| `/:coffeeSlug` | Legacy redirect to canonical coffee menu | Public |
| `/:coffeeSlug/admin` | Legacy redirect to canonical coffee backoffice | Four-digit PIN |

### Main API dependencies

Public:

```text
GET /api/v1/coffees/:coffeeSlug
GET /api/v1/categories/:categoryId/items
```

Authentication:

```text
POST /api/v1/admin/auth/app
POST /api/v1/admin/auth/coffee/:coffeeSlug
```

Application admin:

```text
GET    /api/v1/admin/coffees
POST   /api/v1/admin/coffees
PATCH  /api/v1/admin/coffees/:coffeeId
DELETE /api/v1/admin/coffees/:coffeeId
PATCH  /api/v1/admin/coffees/:coffeeId/pin
POST   /api/v1/admin/images
DELETE /api/v1/admin/images/:imageId
```

Coffee admin:

```text
GET    /api/v1/admin/my-coffee
PATCH  /api/v1/admin/my-coffee
PATCH  /api/v1/admin/my-coffee/pin
GET    /api/v1/admin/my-coffee/categories
POST   /api/v1/admin/my-coffee/categories
PATCH  /api/v1/admin/my-coffee/categories/:categoryId
DELETE /api/v1/admin/my-coffee/categories/:categoryId
GET    /api/v1/admin/my-coffee/categories/:categoryId/items
POST   /api/v1/admin/my-coffee/categories/:categoryId/items
PATCH  /api/v1/admin/my-coffee/items/:itemId
DELETE /api/v1/admin/my-coffee/items/:itemId
```

## License

Private â€” Â© Faza.

## Cart and order architecture

The cart is implemented in `src/lib/cart.ts` and rendered by
`src/components/ordering/OrderCenter.tsx`. `OrderExperience.tsx` owns the
category-page add action and renders `OrderCenter` with the currently loaded
items.

```text
Cart = local, not submitted
Order = backend record, already submitted
```

- A cart is stored in `localStorage` under `faza:cart:<coffeeSlug>`.
- Each coffee has an isolated cart; switching coffee slugs never reuses the
  previous coffee's lines.
- Cart lines store the item identity, display snapshot (name/price/promotion/
  image), and quantity. `cartTotal`, `cartCount`, and `cartLinePrice` derive
  display values from those lines.
- Adding an item increments its quantity. The minus control decrements and
  removes the line at zero. The plus control is disabled when the item is
  known to be unavailable.
- `faza-cart-change` is a browser `CustomEvent` used to synchronize the
  floating cart and category add controls in the same tab.
- The cart is cleared only after `POST /orders` succeeds. The returned order ID
  is stored as `faza:active-order:<coffeeSlug>` so the visitor can reopen
  the submitted order from the menu.
- Availability is evaluated only when the current page has authoritative item
  data. This prevents an item from another category, still present in the
  shared cart, being falsely labelled `Indisponible`. The backend remains the
  final validator at submission time.

## Order lifecycle and visitor UI

`OrderStatus` is the union `PENDING | CONFIRMED | REJECTED`. A visitor enters a
numeric table number (1â€“10,000), then submits item IDs and quantities. The
backend returns an order snapshot containing item names, images, unit prices,
subtotals, total, table number, status, and timestamps. Historical order
pricing is displayed from that snapshot rather than recalculated from the
current menu.

The order route `/faza/:slug/order/:orderId` loads the order on mount and
renders a themed ticket. It has reusable back navigation to the coffee menu and
an accessible refresh icon. Refresh performs a new `GET /orders/:orderId`,
prevents duplicate clicks while in flight, clears a previous error, animates
while loading, and returns to the idle state in `finally`. The admin order
screen lists coffee orders by status and allows pending orders to be confirmed
or rejected.

There is no Socket.IO, Server-Sent Events, polling loop, or other realtime
transport in the frontend. Refresh is intentionally user-triggered.

## Promotions and availability

`ItemDto`, `AdminItemDto`, and `MenuItem` expose `promotion: number | null` and
`isAvailable: boolean`. `MenuItemCard` shows the regular price struck through
when a valid promotion exists and uses the promotion as the effective cart
price. An unavailable item is visually muted/overlaid, does not expose an
active promotional price, and cannot be added from the menu. Existing cart
lines are preserved when availability changes so the visitor can see the line
and remove it; checkout excludes only lines explicitly known to be unavailable
and reports backend validation failures.

## Component architecture

- `PublicChrome`, `Header`, `Footer`, and `BackToTop` provide the public shell.
- `MenuScene`, `BrandIntro`, `CategoryBubbles`, `MenuItemCard`, `ItemArt`, and
  `PriceBadge` compose the visitor menu.
- `OrderExperience` and `OrderCenter` provide add-to-cart, cart persistence,
  table entry, order submission, and active-order navigation.
- `BackLink` is the shared accessible arrow navigation component used on the
  category and order pages. Its visual treatment is defined by
  `.navigation-back` in `globals.css`.
- `AdminLayout` is the shared admin shell. `AdminPinGate` handles PIN entry;
  `AppAdmin` and `CoffeeAdmin` orchestrate their respective consoles.
- `CoffeeForm`, `CategoryForm`, `ItemForm`, list components,
  `AdminConfirmDialog`, and `AdminNotice` are reusable admin CRUD primitives.
- `OrdersSection` is the coffee-admin order list. It includes status filtering,
  manual refresh, status badges, and confirm/reject actions.

There is no data-table library, modal library, global store, or form library.
Dialogs, buttons, badges, skeletons, and responsive layouts are local CSS and
React components in this repository.

## Responsive behavior

The design is mobile-first because the public entry point is a QR scan on a
phone. Public content uses a constrained container, one-handed spacing,
touch-sized controls, and a fixed cart/order dock. Category item layouts expand
at wider breakpoints. The order ticket keeps table/status controls separated
from item lines on small screens. Admin screens use fluid containers, stacked
controls on narrow viewports, and wrapped action rows; the same components
remain usable on tablet and desktop. CSS breakpoints and all design tokens are
in `src/app/globals.css`; there is no JavaScript viewport store.

## Environment variables

| Variable | Required | Purpose | Example |
| --- | --- | --- | --- |
| `BACKEND_API_URL` | Optional in local development; required for SSR against a remote backend | Server-side Express origin | `https://api.example.com` |
| `NEXT_PUBLIC_BACKEND_API_URL` | Optional because it falls back to localhost; required for browser use against a remote backend | Browser-visible Express origin, including uploads | `https://api.example.com` |

The fallback for both is `http://localhost:4000`. Never put PINs, JWTs,
Cloudflare credentials, or other secrets in the frontend environment or this
README. The backend must allow the deployed frontend origin through CORS.

## Current Implementation Status

- [x] QR-friendly coffee-scoped public menus
- [x] Dynamic categories and category item pages
- [x] Coffee branding, logo, cover, and remote item/category images
- [x] Promotions and effective-price cart calculation
- [x] Availability display and add-to-cart protection
- [x] Per-coffee persistent cart
- [x] Table-number order submission
- [x] Visitor order status with pending/confirmed/rejected states
- [x] Manual order refresh with loading animation
- [x] Application-admin coffee CRUD and coffee PIN reset
- [x] Coffee-admin coffee/category/item CRUD
- [x] Coffee-admin availability and promotion management
- [x] Coffee-admin order filtering, refresh, confirmation, and rejection
- [x] SessionStorage PIN sessions and role-aware admin gates
- [x] French typed UI dictionary (`fr-TN`)
- [x] Responsive public and admin UI with accessible focus states
- [ ] Push-based realtime order notifications (not implemented)
- [ ] Visitor account/login (not implemented)

## Known Limitations

- Order status is not pushed to the browser; visitors must use the refresh
  control.
- Visitor orders have no visitor authentication. Possession of an order ID is
  the current lookup mechanism; backend policy remains authoritative.
- The cart is local to one browser and coffee slug. It is not synchronized
  across devices, tabs beyond the custom same-tab event behavior, or users.
- Public category items are loaded when the category page opens; there is no
  client-side menu cache or offline menu.
- The frontend has no automated end-to-end test suite in its package scripts.
- Remote image availability depends on backend URLs and Next image/runtime
  configuration; the UI supplies gradient fallbacks when an image is absent or
  fails.

## Architectural Decisions

- The backend is the source of truth for coffee data, prices, availability,
  order status, authorization, and validation.
- Public routes are coffee-scoped under `/faza/:slug`; category URLs use a
  slugified display name resolved back to a category ID within that coffee.
- Visitors do not authenticate. Admin sessions use short-lived bearer tokens
  in `sessionStorage`, not `localStorage`; PINs are never persisted.
- There is one local cart per coffee slug. A cart is not an order until the
  create-order request succeeds.
- Orders display backend snapshots, preserving historical item names/prices
  even if the menu later changes.
- API calls belong in `src/lib/api.ts` or the focused `src/lib/orders.ts`
  wrapper; components must not construct backend URLs directly.
- Server components load public menu data; client components own interactive
  cart/admin/session state. There is intentionally no global state library.
- Plain global CSS is the UI system. Reuse tokens and shared components before
  adding route-specific styles.

## Future Development Handoff

1. Read the route file first to determine whether a feature belongs to a server
   page or a client feature component.
2. Add backend DTO changes to `src/types/backend.ts`, API functions to
   `src/lib/api.ts` or `src/lib/orders.ts`, and presentation-only mapping to
   `src/lib/adapters.ts`.
3. Put shared visitor UI in `src/components/menu`, `src/components/ordering`,
   or `src/components/layout`; put admin UI in `src/components/admin`.
4. Keep authentication orchestration in `AdminPinGate`, `AppAdmin`,
   `CoffeeAdmin`, and `admin-session.ts`. Do not duplicate token storage or
   role checks in individual forms.
5. Keep cart semantics in `cart.ts`/`OrderCenter`; do not create a second cart
   state or storage key. Keep order API calls in `orders.ts`.
6. Add user-facing copy to the typed dictionary contract and French dictionary.
7. Reuse `BackLink`, `AdminNotice`, `AdminConfirmDialog`, and existing status
   styles instead of creating lookalike controls.
8. After architectural or feature-level changes, update this README in the same
   task, then run `npm run lint`, `npm run typecheck`, and `npm run build` when
   the environment permits.

## Recent Changes

- Added visitor ordering with table numbers, order snapshots, and status pages.
- Added coffee-admin order filtering, manual refresh, and status actions.
- Added promotion and availability support across menu cards, cart, and admin.
- Fixed shared-cart availability handling across category pages.
- Added reusable themed `BackLink` navigation and order-page refresh control.
- Improved responsive status/card presentation and accessible icon controls.
