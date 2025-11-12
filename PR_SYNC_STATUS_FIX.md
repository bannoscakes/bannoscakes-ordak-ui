## What / Why

Fix sync status cross-contamination bug where sync/connection status leaks between Bannos and Flourlane. When sync fails on one store, the error state persists when switching to the other store, showing incorrect "Sync failed" messages.

## Bug Details

**User Report:**
> "I tried to sync Bannos and failed. I went to check Flourlane and was showing the same Sync failed but I did not click Sync"

**The Problem:**
Status states persist when switching stores:
- Click "Sync Orders" on Bannos → Fails → Shows "Sync failed" ❌
- Switch to Flourlane Settings
- Flourlane also shows "Sync failed" even though you never clicked sync ❌
- Same issue with connection status (Test Token button)

**Root Cause:**
State variables are initialized once but never reset when `store` prop changes:

```typescript
const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
const [isSyncing, setIsSyncing] = useState(false);
const [isConnecting, setIsConnecting] = useState(false);
const [syncProgress, setSyncProgress] = useState({ imported: 0, skipped: 0, errors: 0 });

// When switching Bannos → Flourlane:
// - store prop changes
// - But these states keep old values ❌
```

**The Fix:**
Add useEffect to reset status states when store changes:

```typescript
// Reset status states when switching stores (prevents cross-contamination)
useEffect(() => {
  setConnectionStatus('idle');
  setSyncStatus('idle');
  setIsConnecting(false);
  setIsSyncing(false);
  setSyncProgress({ imported: 0, skipped: 0, errors: 0 });
}, [store]);
```

Now when you switch stores, all status messages clear properly.

## How to verify

1. **Test Bannos sync failure:**
   - Go to Bannos Settings
   - Click "Sync Orders" (let it fail or succeed)
   - Should show status message (success or error)

2. **Switch to Flourlane:**
   - Go to Flourlane Settings
   - Should show NO status messages (clean slate)
   - Should NOT show Bannos sync status ✅

3. **Test Flourlane independently:**
   - Click "Test Admin API Token"
   - Should show its own status (not Bannos)

4. **Switch back to Bannos:**
   - Go to Bannos Settings
   - Should show NO status from Flourlane ✅
   - Clean slate for new operations

Each store now maintains independent status tracking!

## Checklist
- [x] One small task only (status state reset)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run type-check` passes locally
- [x] `npm run build` passes locally

## Files Changed
```
modified:   src/components/SettingsPage.tsx
  - Lines 118-125: Added useEffect to reset status states on store change
```

## Impact
- ✅ Bannos and Flourlane have independent sync status
- ✅ No confusion from previous store's status messages
- ✅ Switching stores clears all status indicators
- ✅ Each store starts with clean slate

## Related PRs
- PR #217 - Task 12 implementation
- PR #219 - Settings data cross-contamination fix
- This PR - Status state cross-contamination fix

## Refs
- User bug report
- SettingsPage.tsx lines 118-125

