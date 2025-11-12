# docs: add migration 066 to CHANGELOG

## What / Why

Document completion of migration 066 (RLS on system tables) in CHANGELOG.md. Adds v0.10.1-beta entry to track the final piece of RLS implementation that achieves 100% coverage.

## How to verify

1. Check CHANGELOG.md has new v0.10.1-beta entry at top
2. Entry documents migration 066 and PR #226
3. Lists all 5 system tables protected
4. Notes 100% RLS coverage achieved

## Checklist

- [x] One small task only (CHANGELOG update)
- [x] No direct writes from client; RPCs only (N/A - docs only)
- [x] No secrets/keys leaked
- [x] `npm run type-check` not needed (no code changes)

## Changes

**CHANGELOG.md:**
- Added v0.10.1-beta section (45 lines)
- Documented migration 066 (system tables RLS)
- Listed 5 tables protected and 12 policies created
- Noted 100% RLS coverage achievement
- Referenced PR #226

## Impact

- ✅ Project documentation complete for RLS work
- ✅ All 3 RLS PRs now documented (224, 225, 226)
- ✅ CHANGELOG reflects current security state
- ✅ 100% RLS coverage documented

