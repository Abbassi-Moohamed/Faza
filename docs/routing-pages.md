# Routing & Pages

## Public and customer routes

| Route                           | Purpose                      |
| ------------------------------- | ---------------------------- |
| `/`                             | Landing page                 |
| `/faza`                         | Faza landing                 |
| `/faza/[slug]`                  | Coffee menu with categories  |
| `/faza/[slug]/[categName]`      | Category view                |
| `/faza/[slug]/offers`           | Today's offers index         |
| `/faza/[slug]/offers/[offerId]` | Offer detail and add-to-cart |
| `/faza/[slug]/orders`           | Session order history        |
| `/faza/[slug]/order/[orderId]`  | Order status                 |
| `/[coffeeSlug]`                 | Alternate slug entry         |
| `/menuscan/[[...path]]`         | Menu-scan catch-all          |

The public pages resolve the coffee with `resolvePublicCoffee`. Backend 400/404
responses become a not-found page; other failures reach the error boundary.

## Admin routes

| Route                         | Purpose                              |
| ----------------------------- | ------------------------------------ |
| `/faza/admin`                 | App admin (coffee tenant management) |
| `/faza/admin/insights`        | Platform insights                    |
| `/faza/[slug]/admin`          | Coffee admin dashboard               |
| `/faza/[slug]/admin/offers`   | Offers management                    |
| `/faza/[slug]/admin/insights` | Coffee insights                      |
| `/[coffeeSlug]/admin`         | Alternate coffee-admin entry         |

Admin pages set `noindex` metadata where applicable and are protected by a PIN
gate plus backend role checks.

## Page behavior

- The public menu fetches the coffee and categories in one request. Category
  items/offers are fetched as needed.
- Offer detail pages use `getCoffeeOffers` and show availability windows in the
  `Africa/Tunis` timezone.
- Admin dashboards use client components and the token from sessionStorage.
- `CoffeeAdmin` supports views for service, tables, orders, menu, profile, and
  security; `OffersDashboard` is the dedicated offers view.
