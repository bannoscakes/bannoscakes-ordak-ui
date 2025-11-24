# PR: Fix TypeScript Errors

## What / Why
Resolved all 49 TypeScript errors across 26 files that were preventing `npm run type-check` from passing. These errors were primarily unused variables, missing imports, and type mismatches that needed cleanup.

## How to verify
```bash
npm run type-check  # Should pass with 0 errors
npm run build       # Should complete successfully
npm test            # Should still pass (all 5 Vitest suites)
```

## Changes Summary

### Error Categories Fixed:
1. **Unused variables/imports** (41 errors)
   - Removed unused props: `title`, `stats`, `onRefresh`, `onError`
   - Removed unused imports: `Info`, `ChevronDown`, `Download`, `Users`, `X`, `isOptimistic`, `BaseMessage`
   - Removed unused variables: `storeOrders`, `fallbackStaffData`, `MODE`, `result`, `calculated`, `loading`, `inactiveStaffCount`
   - Prefixed unused parameters with `_` (error, index) per TypeScript convention

2. **Missing modules** (2 errors)
   - Fixed `DebugOverlay.tsx` by removing imports to non-existent `QueueDebug` and `EnvBadge` components
   - Removed non-existent `useStore` import from `DueDateTest.tsx`

3. **Variable scoping** (2 errors)
   - Fixed `markAsRead` function declaration order in `MessagesPage.tsx` (was used before being declared)
   - Reordered callbacks to ensure proper dependency

4. **Implicit any** (1 error)
   - Added explicit type annotation `(s: any)` in `TimePayrollPage.tsx`

5. **Invalid property** (1 error)
   - Removed invalid `description` property from `ErrorNotificationOptions` in `error-notifications.ts`

### Files Modified (26):
- Components: AnalyticsKPI, BannosProductionPage, BarcodeTest, CameraScanner, DashboardContent, DebugOverlay, DueDateTest, ErrorDisplay, FlourlaneProductionPage, InventoryOverview, MainDashboardMessaging, QuickActions, RecentOrders, ScannerOverlay, StaffOverview, StaffPage, TimePayrollPage
- Messaging: MessagesPage, types.ts
- Hooks: useRealtimeMessages.ts
- Lib: auth.ts, due-date-utils.ts, error-monitoring.tsx, error-notifications.ts, messaging-adapters.ts, queue.data.ts

## Results
- ✅ `npm run type-check` now passes (0 errors, previously 49)
- ✅ `npm run build` completes successfully
- ✅ `npm test` still passes (all 5 Vitest suites)
- ⚠️ `npm run lint` - no linting configured (typescript-eslint reminder only)

## Checklist
- [x] One small task only (no mixed changes)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run type-check` passes locally
- [x] `npm run build` succeeds
- [x] No functional changes - type cleanup only

