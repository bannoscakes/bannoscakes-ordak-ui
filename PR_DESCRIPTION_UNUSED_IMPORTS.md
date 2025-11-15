## What / Why

Clean up unused React imports across 11 components (9 files + 2 Button imports).

Modern React (17+) doesn't require React in scope for JSX, but these files still had unused React imports causing TypeScript warnings.

## How to verify

```bash
# TypeScript errors reduced from 77 to 66
npm run type-check

# Build still succeeds
npm run build

# Tests still pass
npm test
```

## Changes

Removed unused imports from 11 components:
- 9 unused `React` imports (modern React doesn't need React in scope for JSX)
- 2 unused `Button` imports from test/demo components

## Checklist

- [x] One small task only (unused React imports)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run build` passes locally
- [x] Reduced TypeScript errors from 77 to 66 (11 errors fixed)

## Notes

This is part of a series of PRs to clean up TypeScript errors. Each PR focuses on one type of cleanup following the "one small task = one PR" workflow.

Remaining errors (66) include other unused variables and missing modules that will be addressed in future PRs.

