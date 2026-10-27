# Components

## Layout and shared

- `Header` - public navigation.
- `PublicChrome` - public shell.
- `BackLink` - consistent back navigation.
- Root layout provides the skip link, fonts, manifest, and theme color.

## Public menu and ordering

- `MenuScene` - category/item menu experience.
- `OrderCenter` - cart/order submission UI.
- `OffersList` - public offer cards.
- `OfferDetailActions` - add an offer to the cart from its detail page.
- `ItemMediaCarousel` - item gallery for images, GIFs, and muted videos;
  auto-advances while in view, pauses on manual navigation, exposes a
  play/pause control, and starts paused when reduced motion is requested.
- Category bubbles/item cards and sheet-state components under `src/components/`.

## Admin

- `AppAdmin` - app-admin PIN gate and coffee tenant CRUD.
- `AdminPinGate` - PIN entry and error handling.
- `AdminLayout` - admin top bar, context, public-menu link, logout.
- `AdminConfirmDialog` - destructive-action confirmation.
- `CoffeeForm` / `CoffeeList` - app-admin coffee management. Creating a coffee
  asks only for its name and unique slug; editing exposes name, slug, logo,
  cover, and the rest of the coffee attributes.
- `InsightsDashboard` - shared analytics UI for app and coffee insights.
- `CoffeeAdmin` - coffee-admin dashboard and view switching.
- `OrdersSection` - service, tables, and orders views; status/payment filters;
  shift and table actions.
- `OffersDashboard` - offer status, ordering, and archive-aware display.
- `OfferForm` - create/update an offer bundle.
- `ItemMediaManager` - item gallery upload/reorder/delete UI. Videos are no
  longer blocked by duration on the client; the backend trims over-long videos.
- `usePendingOrdersCount` - pending-order badge/count hook.

Admin data actions map failures through `src/lib/admin-errors.ts`; raw backend
messages are not shown, and 401/403 clear the stored session.
