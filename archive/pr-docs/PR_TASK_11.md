# feat: add storage filter to queue tables

## What / Why
Add Storage location dropdown filter to QueueTable component so users can filter orders by storage location (e.g., "Kitchen Freezer", "Store Fridge"). Completes **Task 11** from Master_Task.md.

**Problem:** Users could not answer "Show me all orders in Kitchen Freezer" - storage chips displayed on cards but no queue-level filter existed.

**Solution:** Added Storage dropdown to FilterBar that fetches configured storage locations from Settings and applies dual filtering (server-side RPC + client-side) for optimal UX.

## How to verify

### Setup
1. Go to Bannos Settings → Configure storage locations (default: Store Fridge, Store Freezer, Kitchen Coolroom, Kitchen Freezer, Basement Coolroom)
2. Create or edit a few test orders
3. Set different storage locations on orders using Order Detail Drawer

### Testing Steps
1. Navigate to **Bannos Production** page
2. Verify new **Storage** dropdown appears in filter bar (next to Priority and Status filters)
3. Dropdown should show "All Locations" (default) + configured storage locations
4. Select "Kitchen Freezer" → verify only orders with that storage display
5. Switch to "All Locations" → verify all orders display again
6. Test across all stages: Filling, Covering, Decorating, Packing, Complete
7. Test "Clear Filters" button → verify storage filter also resets
8. Repeat for **Flourlane Production** page

### Expected Behavior
- Storage dropdown populates with store-specific configured locations
- Filtering works immediately on selection
- Filter persists across stage tab switches
- Clear Filters button resets storage filter along with others
- Filter works in combination with Priority, Status, and Search filters

## Implementation Details

**Files Modified:**
- `src/components/QueueTable.tsx` (+43 lines, -4 lines, 1 critical bug fix)

**Changes:**
1. Added `storageFilter` and `storageLocations` state variables
2. Added useEffect to fetch storage locations via `getStorageLocations(store)` RPC
3. Updated `fetchQueueData` to pass `storage: storageFilter` to `getQueue` RPC (server-side filtering)
4. Updated `filteredItems` useMemo to include `matchesStorage` check (client-side filtering)
5. Added Storage dropdown Select component in filter UI
6. Updated Clear Filters button to reset `storageFilter`
7. Added fallback to default locations if fetch fails
8. **🐛 Critical Bug Fix:** Added `storageFilter` to useEffect deps array (line 70) - initial implementation was missing this, causing server-side filtering to never trigger on dropdown changes

**Technical Approach:**
- **Dual filtering**: Server-side (RPC parameter) for efficiency + client-side (filteredItems) for immediate UI feedback
- **Reused existing patterns**: Same structure as Priority and Status filters
- **No new dependencies**: Uses existing `getStorageLocations` RPC and Shadcn Select component

**Bug Fix Details:**
The initial implementation passed `storageFilter` to the `getQueue` RPC but forgot to include it in the useEffect dependency array. This meant changing the storage dropdown never re-triggered the server query - only client-side filtering worked, causing the server to always fetch all 200 orders. Caught by AI code review and fixed in commit `e5e687d`.

## Checklist
- [x] One small task only (no mixed changes)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run type-check` passes locally (no new errors)
- [x] `npm run build` passes locally ✅
- [x] Master_Task.md updated (Task 11 marked Done, progress updated to 50%)

## Related Tasks
- Task 4 (set_storage RPC) - ✅ Prerequisite (completed)
- Task 2 (Add flavour column) - Similar filter pattern

## Testing Notes
- Storage locations come from Settings (configurable per store)
- Default fallback: 5 standard locations if fetch fails
- Filter applies to all production stages
- Works seamlessly with existing Priority, Status, and Search filters

---

**Task 11 Status:** ✅ Done — 2025-11-10  
**Overall Master Task Progress:** 50% (10/20 tasks complete)  
**Tier 2 Progress:** 80% (4/5 tasks complete)

