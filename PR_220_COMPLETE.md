## What / Why

Fix all cross-store contamination issues in Settings page. Prevents UI state, status messages, and partially-entered data from leaking between Bannos and Flourlane when switching stores. Includes race condition guards to prevent in-flight async operations from updating the wrong store.

## Bug Details

**User Reports:**
1. "Sync Bannos (failed), switch to Flourlane → Flourlane shows 'Sync failed'" ❌
2. "Never clicked sync on Flourlane but it shows error from Bannos" ❌

**Cursor Bot Findings:**
3. `hasUnsavedChanges` - Save footer persists across stores
4. `newBlackoutDate` - Partially-entered date appears on other store
5. Race condition - In-flight requests update wrong store after switch

## Root Cause

State variables persist when switching stores because React component doesn't remount (just receives new `store` prop). Status states, UI flags, and form inputs retain old values.

**Worse:** Async operations started on Bannos can complete AFTER switching to Flourlane, causing Flourlane to show Bannos results.

## The Complete Fix

### 1. Reset All States When Store Changes

```typescript
// Lines 118-131
useEffect(() => {
  currentStoreRef.current = store;  // Track current store
  setConnectionStatus('idle');
  setSyncStatus('idle');
  setIsConnecting(false);
  setIsSyncing(false);
  setSyncProgress({ imported: 0, skipped: 0, errors: 0 });
  setHasUnsavedChanges(false);  // Cursor finding
  setNewBlackoutDate('');  // Cursor finding
}, [store]);
```

### 2. Guard Against Race Conditions

```typescript
// In handleTestConnection and handleSyncOrders
const requestStore = store;  // Capture at request time

// ... after async call completes ...

if (currentStoreRef.current !== requestStore) {
  console.log('Store changed during request - ignoring result');
  return;  // Don't update state if store changed
}
```

This prevents "ghost status" where Bannos sync result appears in Flourlane.

## How to verify

### Test 1: Basic Status Isolation
1. Go to Bannos Settings
2. Click "Sync Orders" (let it fail or succeed)
3. Switch to Flourlane Settings
4. **Expected:** No status messages ✅ (clean slate)

### Test 2: Race Condition Guard
1. Go to Bannos Settings
2. Click "Sync Orders" (slow operation)
3. **Immediately** switch to Flourlane (before sync completes)
4. Wait for Bannos sync to complete
5. **Expected:** Flourlane shows NO status (Bannos result ignored) ✅

### Test 3: hasUnsavedChanges
1. Go to Bannos Settings
2. Change a setting (don't save)
3. **Expected:** Shows "Unsaved changes" footer
4. Switch to Flourlane
5. **Expected:** NO "Unsaved changes" footer ✅

### Test 4: newBlackoutDate
1. Go to Bannos Settings
2. Type "2025-12-" in blackout date input (don't finish)
3. Switch to Flourlane
4. **Expected:** Blackout date input is empty ✅

## Checklist
- [x] One small task only (cross-contamination prevention)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run type-check` passes locally
- [x] `npm run build` passes locally
- [x] All Cursor bot findings addressed

## Files Changed
```
modified:   src/components/SettingsPage.tsx
  - Line 1: Import useRef
  - Line 119: Add currentStoreRef to track store
  - Lines 122-131: Reset all states when store changes
  - Lines 240-280: Race condition guards in handleTestConnection
  - Lines 282-332: Race condition guards in handleSyncOrders
```

## Impact
- ✅ Complete isolation between Bannos and Flourlane
- ✅ No status leakage
- ✅ No UI state leakage (unsaved changes, form inputs)
- ✅ No race conditions (in-flight requests can't update wrong store)
- ✅ Clean UX when switching stores

## Commits
1. **df6ac96** - Initial status reset fix
2. **0166b8a** - Complete Cursor bot findings (hasUnsavedChanges, newBlackoutDate, race guards) ⭐

## Refs
- User bug reports
- Cursor bot analysis (3 additional findings)
- SettingsPage.tsx lines 118-332

