# API Client & Data Layer

## Core client (`src/lib/api.ts`)

- `ApiClientError(status, message, details)` carries the HTTP status.
- `requestWithToken<T>(path, init, token?)`:
  - adds `Accept: application/json`
  - adds `Content-Type: application/json` unless the body is `FormData`
  - adds `Authorization: Bearer <token>` when a token is supplied
  - fetches `${apiConfig.baseUrl}/api/v1${path}` with `cache: "no-store"`
  - unwraps `{ success: true, data }`
  - throws on non-2xx or `success: false`
- Batch uploads use `FormData`; the helper does not force a JSON content type.

## Public functions

- `getCoffeeBySlug(slug)` -> `CoffeeDto`
- `getItemsByCategoryId(categoryId)` -> `ItemDto[]`
- `getCoffeeOffers(coffeeSlug)` -> `FeaturedOfferDto[]`

## Auth and app admin

- `loginAppAdmin(pin)`
- `loginCoffeeAdmin(coffeeSlug, pin)`
- `listCoffees`, `createCoffee`, `updateCoffee`, `deleteCoffee`,
  `resetCoffeePin`
- `getAppAnalytics` (actual endpoint is `/admin/insights`, despite the stale
  comment naming `/admin/analytics`)

## Coffee admin

- Coffee: `getMyCoffee`, `updateMyCoffee`, `changeMyPin`
- Categories: `listMyCategories`, `createMyCategory`,
  `updateMyCategory`, `deleteMyCategory`
- Items: `listMyCategoryItems`, `createMyItem`, `updateMyItem`,
  `deleteMyItem`
- Offers: `listMyOffers`, `createMyOffer`, `updateMyOffer`, `deleteMyOffer`
- Images: `uploadImage`
- Insights: `getCoffeeAnalytics`

## Orders and operations

`src/lib/orders.ts`:

- Public: `createOrder`, `getOrder`, `listSessionOrders`
- Admin: `listOrders`, `markOrderPaid`, `updateOrderStatus`

`src/lib/api.ts` also wraps service shifts, table sessions, and tables:

- Current/open/close/list shifts and `service-shifts` aliases
- List/get/close table sessions
- List tables and close a table

## Local storage keys

- Admin session: `faza.admin.session` (sessionStorage)
- Cart: `faza:cart:${slug}` (localStorage)
- Active public order: `faza:active-order:${slug}` (localStorage)

## Types

- `src/types/backend.ts` mirrors backend DTOs: API envelope, auth, coffee,
  categories, items, offers, orders, analytics, shifts, sessions, tables,
  images.
- `src/types/menu.ts` holds menu UI types.
