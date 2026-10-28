# Known Limitations & Defects

- **Outdated README**: the previous frontend README claimed Socket.IO was not
  used and omitted offers. The app uses `socket.io-client` and
  `src/lib/realtime.ts`.
- **French-only UI**: all copy is in one French dictionary; there is no
  language switcher and no per-coffee `defaultLanguage` in the backend.
- **No Content Security Policy**: `next.config.ts` configures transport,
  framing, referrer, and permissions headers, but does not define a CSP.
- **Analytics comment mismatch**: `getAppAnalytics` names `/admin/analytics` in
  a comment, but the implemented endpoint is `/admin/insights`.
- **Synthetic insights**: the dashboard displays backend insights that include
  a hard-coded discount rate (`0.2051`) and synthetic promotion metrics.
- **No order idempotency**: create-order requests carry no idempotency key, so
  client retries can duplicate an order.
- **No end-to-end tests**: unit tests cover selected `src/lib` modules only.
