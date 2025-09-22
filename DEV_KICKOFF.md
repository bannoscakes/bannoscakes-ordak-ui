# Ordak v2 – Dev Kickoff Seed

## Stack
- frontend/react18, vite, typescript, tailwindcss-v4
- backend/supabase (db, rpc, edge functions)

## Starting Point Reality Check
✅ UI components built (50+ in src/components)
✅ Docs complete (/docs with 10+ specs)
✅ TypeScript configured (4 files with @ts-nocheck to fix later)
✅ Routing implemented (custom in App.tsx)
✅ Tailwind v4 configless working
✅ Supabase configured (.env.local + GitHub secrets)
✅ CI/CD green (GitHub Actions on dev/main)
✅ README production-ready

## Architecture Invariants
- Stages: Filling → Covering → Decorating → Packing → Complete
- Filling starts at barcode print; scan completes Filling
- No pending/in_progress tables; "Unassigned" = assignee_id IS NULL
- All writes through SECURITY DEFINER RPCs

## Current Implementation Status
✅ Mock data and RPCs created (src/mocks/)
✅ QueueTable wired to mocks
✅ ScannerOverlay integrated
✅ Staff/Supervisor workspaces using mocks
✅ Dashboard loading stats from mocks
✅ All metric components connected

## Mock Infrastructure
- src/mocks/mock-data.ts - MockOrder type, MOCK_QUEUE data
- src/mocks/rpc.ts - All mock RPCs (get_queue, handle_print_barcode, complete_*, advance_stage)
- src/features/scanner/ - Scanner component and handler

## Stage Rules (Implemented)
- Print barcode → stage stays Filling, sets filling_start_ts
- Complete Filling → stage becomes Covering
- Complete Covering → stage becomes Decorating
- Complete Decorating → stage becomes Packing
- Complete Packing → stage becomes Complete

## Components Using Mock Data
✅ QueueTable - displays orders, Print/Complete buttons work
✅ ScannerOverlay - advances stages
✅ MetricCards - shows real counts
✅ UnassignedStations - counts unassigned by stage
✅ ProductionStatus - shows stage performance
✅ ProductionTimeline - generates timeline from orders
✅ StaffOverview - shows staff status
✅ Dashboard - aggregates all stats

## Testing the System
1. Run npm run dev
2. Navigate to http://localhost:5173
3. View queue - see mock orders (bannos-10001, flourlane-10002)
4. Click Print/Complete buttons - see toasts
5. Sign in as supervisor/staff - test scanning

## Next Steps (Real Backend)
1. Apply database migrations to Supabase
2. Deploy Edge Functions for webhooks
3. Replace mock imports with real Supabase calls
4. Configure Shopify webhooks
5. Test end-to-end with real data

## Key Documentation
- /docs/overview.md - System overview
- /docs/schema-and-rls.md - Database structure
- /docs/rpc-surface.md - All RPC functions
- /docs/data-flows.md - Business logic flows
- /docs/vertical-slices.md - Build order

## Working Agreements
- Branch: feature/* → dev → main
- Commits: conventional (feat:, fix:, docs:)
- CI must pass before merge
- Add /docs as context in Cursor