# feat: extract 85 production RPCs into version control

## What / Why

Extract all production RPC functions (70+ functions that were applied directly to production) into version control as migration files. This is critical for maintainability, testing, and deployment consistency.

## How to verify

1. Review migration files in `supabase/migrations/` (005-013)
2. Check `RPC_EXTRACTION_COMPLETE.md` for complete list of extracted functions
3. Optionally: Test in fresh Supabase environment with `supabase db reset`

## Details

- **85 functions extracted** (93 versions including duplicates)
- **9 migration files** organized by category:
  - 005: Core Auth & Helpers (10 functions)
  - 006: Staff Management (6 functions)
  - 007: Queue & Orders (7 functions)
  - 008: Scanner & Stage Completion (9 functions, 13 versions)
  - 009: Settings (13 functions)
  - 010: Inventory (20 functions, 21 versions)
  - 011: Messaging (11 functions, 13 versions)
  - 012: Workers & Background Jobs (4 functions, 5 versions)
  - 013: Order Updates & Triggers (5 functions)

- **Extraction script included** (`scripts/extract_rpcs.js`) for reproducibility
- **Complete documentation** in `RPC_EXTRACTION_COMPLETE.md`

## Checklist

- [x] One small task only (no mixed changes)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [ ] `npm run type-check` passes locally (N/A - no TypeScript changes)
- [x] Follows workflow: feature branch from dev
- [x] Clear commit message with conventional style

## Notes

- This PR contains **database migrations only** - no application code changes
- All functions were already in production - this just brings them into version control
- Some functions have multiple versions (different signatures) for backward compatibility
- Testing in fresh environment recommended but not required (functions already work in production)

