## What / Why

Fix critical cross-store contamination bug where settings leak between Bannos and Flourlane. When switching stores in Settings page, values from the previous store incorrectly appear in the new store's fields. This breaks the two-entity separation and could cause incorrect configurations.

## Bug Details

**User Discovery:**
> "When I'm adding Bannos API and go to Flourlane, API field already filled with Bannos API"

**Cursor Bot Analysis:**
Found 6 fields with same cross-contamination pattern:

1. **shopifyToken** - Line 169: Shows Bannos token in Flourlane field
2. **flavours** - Line 170: Shows Bannos flavours (4) in Flourlane (should be 8)
3. **storage** - Line 171: Shows Bannos storage locations in Flourlane
4. **defaultDue** - Line 179: Shows Bannos default in Flourlane
5. **monitor.density** - Line 185: Shows Bannos density in Flourlane
6. **monitor.autoRefresh** - Line 186: Shows Bannos refresh rate in Flourlane

**Root Cause:**
All fields used `prev` state as fallback when loading store settings:

```typescript
// OLD CODE (WRONG) - Causes cross-contamination
shopifyToken: shopifyToken || prev.shopifyToken,
flavours: Array.isArray(flavours) ? flavours : prev.flavours,
storage: Array.isArray(storage) ? storage : prev.storage,
// ... etc
```

When switching from Bannos (with settings) to Flourlane (no settings):
1. Load Flourlane settings from database
2. Flourlane has no settings → all undefined
3. Fallback to `prev` → Still has Bannos values!
4. Flourlane shows Bannos settings ❌

**The Fix:**
Use `getDefaultSettings(store)` for store-specific defaults:

```typescript
// NEW CODE (CORRECT) - Store-specific defaults
const storeDefaults = getDefaultSettings(store);

shopifyToken: shopifyToken || '',
flavours: Array.isArray(flavours) ? flavours : storeDefaults.flavours,
storage: Array.isArray(storage) ? storage : storeDefaults.storage,
// ... etc
```

Now each store falls back to **its own** defaults, not the previous store's values.

## How to verify

1. **Set Bannos settings:**
   - Go to Bannos Settings
   - Set token: "bannos_test"
   - Verify flavours: 4 items (Vanilla, Chocolate, Strawberry, Caramel)
   - Set monitor density: "comfortable"

2. **Switch to Flourlane:**
   - Go to Flourlane Settings
   - Token should be EMPTY (not "bannos_test")
   - Flavours should be 8 items (includes Cinnamon, Lemon, Almond, Sourdough)
   - Monitor density should be "cozy" (default, not "comfortable")

3. **Set Flourlane settings:**
   - Set token: "flourlane_test"
   - Change monitor density: "dense"

4. **Switch back to Bannos:**
   - Go to Bannos Settings
   - Token should be "bannos_test" (not "flourlane_test")
   - Flavours should be 4 items (not 8)
   - Monitor density should be "comfortable" (not "dense")

All settings now properly isolated per store! ✅

## Technical Details

**Database is CORRECT** (always was):
```sql
CREATE TABLE settings (
  store text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  PRIMARY KEY (store, key)  -- ✅ Per-store storage
);
```

**RPCs are CORRECT** (always were):
- `get_settings(p_store)` - Filters by store ✅
- `set_setting(p_store, p_key, p_value)` - Saves per-store ✅

**Bug was ONLY in frontend state management:**
- Used `prev` state from old store as fallback
- Should use `storeDefaults` from current store

## Checklist
- [x] One small task only (cross-contamination fix)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run type-check` passes locally
- [x] `npm run build` passes locally
- [x] All Cursor bot findings addressed

## Files Changed
```
modified:   src/components/SettingsPage.tsx
  - Line 156: Add storeDefaults = getDefaultSettings(store)
  - Line 164: Use storeDefaults.inventoryTrackingEnabled
  - Line 169: shopifyToken uses '' not prev
  - Line 170: flavours uses storeDefaults not prev
  - Line 171: storage uses storeDefaults not prev
  - Line 173-175: printing uses storeDefaults
  - Line 177-181: dueDates uses storeDefaults
  - Line 183-186: monitor uses storeDefaults
```

## Impact
- ✅ All settings properly isolated per store
- ✅ No cross-contamination when switching Bannos ↔ Flourlane
- ✅ Each store uses correct defaults (Bannos: 4 flavours, Flourlane: 8 flavours)
- ✅ Shopify tokens remain separate
- ✅ Monitor settings remain separate
- ✅ Due date settings remain separate

## Commits
1. **1547276** - Fix shopifyToken cross-contamination
2. **7d76004** - Fix all other settings cross-contamination (Cursor findings)

## Refs
- User bug report (Bannos token showing in Flourlane)
- Cursor bot analysis (found 5 additional fields)
- SettingsPage.tsx lines 154-187

