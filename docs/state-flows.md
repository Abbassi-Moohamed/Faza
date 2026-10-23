# State & Flows

## Cart

- `src/lib/cart.ts` stores a cart per coffee at `faza:cart:${slug}` in
  localStorage.
- Cart changes emit the `faza-cart-change` event.
- A line supports `kind?: "item" | "offer"`.
- `cartSplit` divides lines into `{ items, offers }` for the create-order
  payload.
- Offer lines use a shared `offerImage` helper for display.

## Public ordering flow

1. Guest opens `/faza/[slug]` and browses menu items or offers.
2. Items/offers are added to the local cart.
3. `OrderCenter` submits the cart through `createOrder`.
4. The backend returns an order and, for a new session, a `sessionToken`.
5. The session token and active-order state are retained on the device.
6. `/faza/[slug]/order/[orderId]` shows status; `/faza/[slug]/orders` lists the
   session history.
7. Realtime subscriptions update order/session views.

## Sessions and history

- `src/lib/table-session.ts`, `src/lib/session-orders.ts`, and
  `src/lib/session-history.ts` manage session tokens, active orders, and
  history.
- Session tokens are the only public credential for a party's orders.

## Admin flow

1. `AdminPinGate` submits the PIN through the app or coffee login endpoint.
2. `admin-session.ts` stores `{ token, role, coffeeId? }` in sessionStorage
   under `faza.admin.session`.
3. API functions receive the token explicitly.
4. 401/403 failures are treated as session failures and clear the session.
5. Coffee-admin API calls are authorized by the token; the frontend never sends
   a tenant ID to select another coffee.

## Realtime

`src/lib/realtime.ts` creates the Socket.IO client. Public clients subscribe to
their order/session; coffee admins subscribe to coffee operational updates.
