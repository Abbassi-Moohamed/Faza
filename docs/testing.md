# Testing

## Setup

- Vitest with jsdom.
- Config: `frontend/vitest.config.mts`.
- Alias: `@` -> `frontend/src`.
- Test files live beside source as `src/**/*.test.ts`.

## Covered modules

- `src/lib/admin-tables.test.ts`
- `src/lib/cart.test.ts`
- `src/lib/insights.test.ts`
- `src/lib/orders.test.ts`
- `src/lib/session-history.test.ts`
- `src/lib/session-orders.test.ts`

## Commands

```text
npm test             vitest run
npm run test:watch   vitest watch
npm run typecheck    tsc --noEmit
npm run lint         ESLint
npm run format:check Prettier check
npm run check        typecheck + tests
```

There are no browser/component end-to-end tests in the repository.
