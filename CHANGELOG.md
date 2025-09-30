
printf "\n- feat(ui): default queue source → vw_queue_minimal (legacy alias remains)\n" >> CHANGELOG.md
git add CHANGELOG.md
git commit -m "chore(changelog): note default queue source update"
git push

- feat(ui): QueueDebug uses RPC-first data module (queue.data.ts)
- functions(webhooks): HMAC-only skeleton for orders_create (bannos/flourlane)
- sql(007): read-only scan lookup RPC (get_order_for_scan) — installed and verified
-feat(ui): switch reads from views to read-only RPCs (get_queue_minimal / get_unassigned_counts / get_complete_minimal)

## [Unreleased]
- sql(001): initial base schema
- sql(001a): add settings table for RLS flag
- sql(002): RLS scaffolding + minimal views
- chore(repo): preflight no-dupes; env clean (mocks off; APP_URL=3000)
- feat(ui): Supabase client + typed API; hooks; DEV QueueDebug
- fix(ui): lazy client + ErrorBoundary; ?debug toggle
- docs/sql(004): UI↔DB contract checks (no data) + docs/db-contract.md
- sql(005): read-only RPCs wrapping minimal views (queue, counts, complete)


## [v0.1.0-alpha] - 2025-01-15 - Clean Implementation
## [Unreleased]
- sql(001): initial base schema (orders, stage_events, work_queue, dead_letter, components/BOM, logs)
- sql(002): RLS scaffolding (feature-flag) + minimal views (vw_queue_minimal, vw_unassigned_counts, vw_complete_minimal)
- chore(repo): removed nested duplicate folder; canonical supabase/sql kept
- feat(ui): supabase client + typed API wrappers for queue/unassigned/complete views

### BREAKING CHANGES
- **Removed entire mock system** - Application now uses real Supabase backend only
- **Removed VITE_USE_MOCKS** environment variable and all mock toggle functionality
- **Cleaned documentation** of all mock references and implementation details

### Added
- Real-time Supabase integration for all data operations
- Production-ready RPC facade without mock fallbacks
- Guard tests to prevent mock reintroduction

### Removed
- `src/mocks/` directory and all mock implementations
- Mock-related configuration options and environment variables
- Switchable facade system for development/production

### Fixed
- Simplified development workflow with single data source
- Eliminated confusion between mock and real data states
- Streamlined deployment process

---

# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),  
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [v0.2.0-beta] - 2025-01-30 - Complete Database & UI Integration

### 🎉 Major Features Added
- **Complete Database Schema**: Separate `orders_bannos` and `orders_flourlane` tables with proper relationships
- **Production RPC Functions**: `get_queue_minimal`, `get_unassigned_counts`, `get_complete_minimal` with full pagination support
- **Shopify Webhook Integration**: `ingest_order` RPC function with deduplication and store routing
- **Real-time UI Integration**: All components now use live Supabase data instead of mocks
- **Human ID Generation**: Automatic `bannos-12345` and `flourlane-67890` ID generation via triggers
- **Priority System**: Enum-based priority levels (High, Medium, Low) with proper database constraints

### 🗄️ Database Changes
- **New Tables**: `orders_bannos`, `orders_flourlane`, `staff_shared` with complete field mapping
- **New Enums**: `stage_type` (Filling, Covering, Decorating, Packing, Complete), `priority_level` (High, Medium, Low)
- **New Views**: `vw_queue_minimal`, `vw_unassigned_counts`, `vw_complete_minimal` for UI data access
- **New Triggers**: Human ID generation and `updated_at` timestamp management
- **New Indexes**: Performance-optimized indexes for queue ordering, unassigned counts, and date queries

### 🔧 RPC Functions
- **`get_queue_minimal(p_store, p_stage, p_limit, p_offset)`**: Paginated queue data with filtering
- **`get_unassigned_counts(p_store)`**: Unassigned order counts by store and stage
- **`get_complete_minimal(p_store, p_limit)`**: Completed orders with pagination
- **`ingest_order(normalized)`**: Shopify webhook order ingestion with deduplication

### 💻 UI Improvements
- **Type Safety**: Updated TypeScript types to match database schema exactly
- **Real Data**: Removed all mock data dependencies, using live Supabase RPCs
- **Performance**: Optimized data fetching with proper pagination and filtering
- **Error Handling**: Robust error handling for all RPC calls

### 🧪 Testing & Verification
- **End-to-End Testing**: Complete verification of data flow from webhook to UI
- **Sample Data**: Test orders for both Bannos and Flourlane stores
- **Schema Validation**: All database constraints and relationships verified
- **RPC Testing**: All functions tested with various parameters and edge cases

### 📁 New Files
- `supabase/sql/001_orders_core.sql` - Core database schema
- `supabase/sql/002_orders_human_id_trigger.sql` - Human ID generation
- `supabase/sql/003_orders_views.sql` - UI data views
- `supabase/sql/004_rpc_functions.sql` - Production RPC functions
- `supabase/sql/test_schema.sql` - Test data and verification scripts

### 🔄 Breaking Changes
- **Removed Mock System**: All mock data and RPC implementations removed
- **Updated Types**: `Stage` type simplified from `Filling_pending` to `Filling`
- **Database Schema**: Single `orders` table replaced with separate store tables
- **RPC Signatures**: Updated function parameters to match database schema

### ✅ Completed PRs
- **PR #1**: Database Foundation - Separate store tables and core schema
- **PR #2**: RPC Functions - Data access layer with pagination
- **PR #3**: Ingest RPC - Shopify webhook integration
- **PR #4**: UI Integration - Connect components to real data
- **PR #5**: Testing - End-to-end verification and validation

### 🚀 Production Ready
- **Webhook Integration**: Ready to receive real Shopify orders
- **Data Flow**: Complete order lifecycle from creation to completion
- **Performance**: Optimized queries and proper indexing
- **Security**: All database operations through SECURITY DEFINER RPCs
- **Monitoring**: Comprehensive error handling and logging

---

## [v0.1.0-alpha] - 2025-01-15 - Clean Implementation

### Added
- chore(supabase): add minimal client in `src/lib/supabase.ts`
- chore(rpc): add scaffolded real RPC module (same signatures; throws until implemented)
- chore(types): add STAGES, STAGE_ORDER, makeEmptyCounts to shared stage helpers (no behavior change)
- test(guard): vitest to block direct `@/mocks/rpc` imports
- chore(types): add shared `src/types/stage.ts` (no behavior change)
- docs: `docs/DEPLOY_STAGING.md` — staging deployment checklist for Vercel + Railway
- chore(husky): add pre-commit guard to prevent direct `@/mocks/rpc` imports
- chore(ci): enforce `guard:rpc` in PR checks
- chore(guard): add `guard:rpc` script to block direct `@/mocks/rpc` imports
- Initial CHANGELOG.md file  
- Release process documented in [README.md](README.md)  
- Placeholder for upcoming features and fixes  
- docs: `docs/CURSOR_RULES.md` — Cursor project guardrails for safe, incremental changes.
- docs: `docs/RULES_SANITY_TEST.md` — sanity test confirming rules are active (no code changes).
- feat: `src/lib/config.ts` — central VITE_* env config helper.
- feat: `src/lib/rpc.ts` — neutral RPC facade delegating to mocks.
- chore(env): add `VITE_USE_MOCKS=true` to `.env.local` (toggle for RPC facade; default on).
- docs(env): add `.env.example` (commit-safe template for local setup).

### Changed
- chore(rpc): switch facade to real-only (remove mock path)
- chore(guard): block src/mocks/ and '@/mocks/rpc' imports
- chore(sql): add supabase/sql placeholders for Phase 2
- chore(rpc): make real get_queue use env `VITE_QUEUE_SOURCE` (default "queue_view")

### Fixed
- fix(rpc): robust env fallback for QUEUE_SOURCE (empty/whitespace → "queue_view")
- chore(rpc): real `get_queue` queries Supabase or returns [] (no crash; mocks remain default)
- chore(rpc): real get_queue returns [] placeholder (prevents crash on preview flip)
- chore(rpc): facade now imports real RPC; behavior unchanged while VITE_USE_MOCKS=true
- chore(types): BannosProductionPage stats = Record<Stage, number> (no behavior change)
- chore(types): FlourlaneProductionPage stats = Record<Stage, number> (no behavior change)
- chore(types): DashboardContent stats = StatsByStore (Record<Stage, number> per store)
- chore(types): Dashboard uses shared `StatsByStore` helper (no behavior change)
- chore(types): Dashboard uses makeEmptyCounts() helper for zeroed stage counters
- chore(types): narrow stats type for FlourlaneMonitorPage
- chore(types): narrow stats type for BannosMonitorPage
- chore(types): Dashboard uses shared Stage/StoreKey types
- chore(types): make queue item deliveryTime optional (date-only system; no behavior change)
- chore(types): re-enable TS on Dashboard (remove nocheck; begin incremental fixes)
- chore(types): type Dashboard stage counters (guarded string index; no behavior change)
- chore(types): add optional `onRefresh` to Header props (no behavior change)
- chore(types): add optional `stats`/`onRefresh` to DashboardContent props (no behavior change)
- chore(types): allow optional `stats` on FlourlaneMonitorPage props (no behavior change)
- chore(types): allow optional `stats` on BannosMonitorPage props (no behavior change)
- chore(types): allow stats/initialFilter/onRefresh on FlourlaneProductionPage props (no behavior change)
- chore(types): add optional `stats` (and `initialFilter`/`onRefresh`) to BannosProductionPage props (no behavior change)
- chore(types): type Dashboard stage counters (fix string-index error; no behavior change)
- refactor(scanner): route one scanner file to `src/lib/rpc` (neutral facade, no behavior change).
- refactor(orders): route `UnassignedStations` to `src/lib/rpc` (neutral facade, no behavior change).
- refactor(components): route `StaffWorkspacePage` to `src/lib/rpc` (neutral facade, no behavior change).
- refactor(components): route `Dashboard` to `src/lib/rpc` (neutral facade, no behavior change).

---

## [0.1.0] - 2025-09-14
### Added
- chore(guard): add `guard:rpc` script to block direct `@/mocks/rpc` imports
- Complete production-ready `README.md` with:
  - Quick Start, Environment Setup, Emergency Procedures
  - Database management and migration steps
  - Scripts section with dev/build/test commands
  - Development workflow (Cursor + Git branches)
  - Documentation index linking `/docs/*`
  - Deployment process and testing levels
  - Release process (versioning, tagging, changelog)
  - Performance targets and monitoring setup
  - Troubleshooting section
  - Screenshots & diagrams references
  - Quality & security practices
- Core diagrams generated:
  - `branch-flow.png`
  - `system-overview.png`
  - `table-site-map.png`
- Documentation suite under `/docs/` completed

---

## [0.0.1] - 2025-09-01
### Added
- chore(guard): add `guard:rpc` script to block direct `@/mocks/rpc` imports
- Repository initialized  
- Basic project scaffolding  
- `.env.example` created  
- Initial Supabase + Vite integration  

---

[Unreleased]: https://github.com/<your-org>/<your-repo>/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/<your-org>/<your-repo>/releases/tag/v0.1.0
[0.0.1]: https://github.com/<your-org>/<your-repo>/releases/tag/v0.0.1
