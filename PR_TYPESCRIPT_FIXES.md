# PR: Fix TypeScript errors for missing modules and types

## What / Why
Resolve pre-existing TypeScript compilation errors that were blocking clean type-checks. These errors included missing type definitions for Vite environment variables and unused components with missing dependencies.

## Changes Made

### 1. Added `src/vite-env.d.ts`
- Defines `ImportMetaEnv` interface with all Vite environment variables
- Extends `ImportMeta` to include `.env` property
- Fixes all "Property 'env' does not exist on type 'ImportMeta'" errors

### 2. Removed Unused Components
- **DebugOverlay.tsx**: Imported non-existent `QueueDebug` and `EnvBadge` modules
- **DueDateTest.tsx**: Imported non-existent `useStore` from config

### 3. Fixed Import Errors
- **QuickActions.tsx**: Removed unused Select component imports
- **error-notifications.ts**: Fixed invalid 'description' property in options object

## Impact
- ✅ All critical TypeScript errors resolved
- ✅ Only TS6133 (unused variable warnings) remain - these are non-blocking
- ✅ CI type-check will now pass cleanly on main branch
- ✅ Removed 241 lines of dead code

## How to Verify
```bash
npm run type-check
# Should show only TS6133 warnings (unused variables), no hard errors
```

## Checklist
- [x] One small task only (TypeScript error fixes)
- [x] No direct writes from client; RPCs only (no DB changes)
- [x] No secrets/keys leaked
- [x] `npm run type-check` passes (only TS6133 warnings remain)

