## What / Why

Fix TypeScript errors related to missing `import.meta.env` type definitions (16 errors).

Vite requires explicit typing for `import.meta.env` to provide IntelliSense and type safety for environment variables.

## How to verify

```bash
# Type errors reduced from 77 to 61
npm run type-check

# Build still succeeds
npm run build

# Tests still pass
npm test
```

## Changes

- Created `src/vite-env.d.ts` with Vite environment variable types
- Defines all VITE_* environment variables used in the project

## Checklist

- [x] One small task only (Vite env types)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run build` passes locally
- [x] Reduced TypeScript errors from 77 to 61

## Notes

This fixes 16/77 TypeScript errors. Remaining 61 errors are mostly unused imports/variables that can be addressed in separate PRs following the "one small task = one PR" workflow.

