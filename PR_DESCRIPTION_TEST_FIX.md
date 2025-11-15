## What / Why

Fix `npm test` failure where Vitest was attempting to run Playwright e2e tests, causing the test suite to fail with module errors.

Playwright tests should run separately via `npm run test:e2e`, not through the Vitest unit test runner.

## How to verify

```bash
# Tests now pass - all 13 unit tests run successfully
npm test

# Playwright e2e tests still work separately
npm run test:e2e
```

## Changes

- Created `vitest.config.ts` to exclude `tests/e2e/**` directory from Vitest
- Vitest now only runs unit tests in `src/` directory
- Playwright tests remain available via separate command

## Checklist

- [x] One small task only (npm test fix)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run build` passes locally
- [x] `npm test` now works (13 tests pass)

## Notes

This PR **only** fixes the `npm test` issue. Other CI concerns (lint, type-check) are pre-existing and will be addressed in separate PRs following the "one small task = one PR" workflow.
