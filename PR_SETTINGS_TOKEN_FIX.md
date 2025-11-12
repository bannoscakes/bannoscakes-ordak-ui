## What / Why

Fix critical bug where Shopify Admin API tokens leak between Bannos and Flourlane stores. When setting a token for Bannos, then switching to Flourlane settings, the Flourlane token field incorrectly shows the Bannos token. This breaks the two-entity separation and could cause API calls to wrong store.

## Bug Details

**User Report:**
> "When I'm adding Bannos API and go to Flourlane, API field already filled with Bannos API"

**Root Cause:**
SettingsPage.tsx line 166 used incorrect fallback:
```typescript
shopifyToken: shopifyToken || prev.shopifyToken  // ❌ WRONG
```

When switching from Bannos (with token) to Flourlane (no token):
1. Load Flourlane settings from database
2. Flourlane has no token → `shopifyToken = undefined`
3. Fallback to `prev.shopifyToken` → Still has Bannos token!
4. Flourlane field shows Bannos token ❌

**The Fix:**
```typescript
shopifyToken: shopifyToken || ''  // ✅ CORRECT
```

Now Flourlane shows empty string (correct) when it has no token.

## How to verify

1. **Set Bannos token:**
   - Go to Bannos Settings
   - Enter Admin API token "bannos_test_token"
   - Save settings

2. **Switch to Flourlane:**
   - Go to Flourlane Settings
   - Token field should be EMPTY (not showing Bannos token)

3. **Set Flourlane token:**
   - Enter Admin API token "flourlane_test_token"
   - Save settings

4. **Switch back to Bannos:**
   - Go to Bannos Settings
   - Token field should show "bannos_test_token" (not Flourlane)

5. **Verify in database:**
   ```sql
   SELECT store, key, value #>> '{}' as token
   FROM settings
   WHERE key = 'shopifyToken'
   ORDER BY store;
   ```
   Should show two separate rows with different tokens.

## Database Verification

**Settings table is CORRECT:**
```sql
CREATE TABLE settings (
  store text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  PRIMARY KEY (store, key)  -- ✅ Tokens stored per-store
);
```

**RPCs are CORRECT:**
- `get_settings(p_store)` filters by store ✅
- `set_setting(p_store, p_key, p_value)` saves per-store ✅
- `test_admin_token(p_store, p_token)` saves per-store ✅

**Bug was ONLY in frontend state management.**

## Checklist
- [x] One small task only (single line fix)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run type-check` passes locally
- [x] `npm run build` passes locally

## Files Changed
```
modified:   src/components/SettingsPage.tsx (1 line changed)
```

## Impact
- ✅ Bannos and Flourlane tokens now properly isolated
- ✅ No cross-store token contamination
- ✅ Each store maintains its own Shopify API token
- ✅ Switching between stores shows correct token (or empty)

## Refs
- Task 12 - Shopify Integration
- SettingsPage.tsx line 166
- User bug report

