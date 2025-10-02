## [v0.5.0-beta] - 2025-01-30 - Complete Barcode Scanning & Printing System

### 🎯 Overview
Complete implementation of the barcode scanning and printing system, including real camera scanning for tablets/mobiles and barcode generation with printing capabilities. This is a critical production workflow component.

### ✅ Phase 1: Barcode Generation & Printing
- **BarcodeGenerator Component**: Code 128 barcode generation with order details
- **Print Functionality**: Browser print with proper timing and PDF generation
- **Download Functionality**: PNG download of generated barcodes
- **Interactive Testing**: BarcodeTest page with form for testing different orders
- **Barcode Service**: Complete service library for barcode operations

### ✅ Phase 2: Real Camera Scanning
- **CameraScanner Component**: Real-time barcode detection using @zxing/library
- **Multi-Camera Support**: Automatic detection and switching between front/back cameras
- **Visual Feedback**: Green scanning frame with animation for user guidance
- **Mobile Optimization**: Optimized for tablets and mobile devices
- **Error Handling**: Graceful fallback to manual entry when camera fails

### ✅ ScannerOverlay Integration
- **Dual Mode Operation**: Toggle between camera scanning and manual entry
- **Seamless Workflow**: Integration with existing order completion workflow
- **Real-time Detection**: Instant barcode recognition and validation
- **User Experience**: Clear instructions and error messages

### 🔧 Technical Implementation
- **Libraries**: jsbarcode for generation, @zxing/library for scanning
- **RPC Integration**: Updated RPC client with correct barcode/stage functions
- **TypeScript**: Full type safety with proper interfaces
- **Error Handling**: Comprehensive error handling and user feedback
- **Performance**: Optimized for real-time scanning and generation

### 📱 Mobile/Tablet Ready
- **Camera Permissions**: Automatic camera permission requests
- **Device Detection**: Smart camera selection (prefers back camera)
- **Touch Interface**: Mobile-optimized UI and interactions
- **Responsive Design**: Works on all screen sizes

### 🚀 Production Ready
- **Critical Workflow**: Core component for production stage management
- **Quality Assurance**: Tested on desktop, ready for tablet testing
- **Documentation**: Comprehensive code documentation and comments
- **Branch Safety**: Isolated in feature branch for safe development

### 📋 Files Added/Modified
- `src/components/BarcodeGenerator.tsx` - Barcode generation component
- `src/components/BarcodeTest.tsx` - Testing interface
- `src/components/CameraScanner.tsx` - Real camera scanning
- `src/lib/barcode-service.ts` - Barcode service library
- `src/components/ScannerOverlay.tsx` - Enhanced with camera integration
- `src/lib/rpc-client.ts` - Updated with barcode RPC functions

---

## [v0.4.0-beta] - 2025-01-30 - UI Integration & Barcode System Foundation

### 🎯 Overview
Complete UI integration with real database data, removal of all mock data, and foundation for barcode scanning and printing system. This release connects all major UI components to the Supabase backend and prepares for barcode implementation.

### ✅ UI Integration Completed
- **Dashboard**: Connected to real queue data via `getQueue()` RPC
- **Staff Workspace**: Real order data, staff assignment, stage progression
- **Supervisor Workspace**: Full order management and assignment capabilities
- **Inventory System**: All 6 tabs connected to real database (Components, BOMs, Keywords, Requirements, Transactions, Tools)
- **Settings Pages**: Real settings management for both Bannos and Flourlane stores
- **Order Management**: OrderDetailDrawer and EditOrderDrawer with real data
- **Production Pages**: Real-time production status and monitoring

### ✅ Database Integration
- **Environment Variables**: Proper Supabase connection with working API keys
- **RPC Client**: Complete type-safe wrapper for all 50+ RPC functions
- **Error Handling**: Comprehensive error handling and loading states
- **Data Mapping**: Proper mapping between database fields and UI components

### ✅ Navigation & Access
- **Sidebar Navigation**: Fixed Staff Workspace and Supervisor Workspace access
- **Role-based Access**: Proper workspace access based on user roles
- **Real-time Updates**: Live data updates across all components

### 🔧 Technical Improvements
- **TypeScript**: Enhanced type safety with proper interfaces
- **Performance**: Optimized data fetching and rendering
- **Code Quality**: Removed all mock data, cleaned up unused imports
- **Documentation**: Updated project status and implementation guides

### 📋 Files Modified
- `src/lib/rpc-client.ts` - Added missing RPC functions
- `src/components/Sidebar.tsx` - Fixed workspace navigation
- `src/components/Dashboard.tsx` - Real data integration
- `src/components/StaffWorkspacePage.tsx` - Real order data
- `src/components/SupervisorWorkspacePage.tsx` - Real order management
- `src/components/inventory/*` - All inventory tabs connected
- `src/components/SettingsPage.tsx` - Real settings management
- `src/components/OrderDetailDrawer.tsx` - Real order details
- `src/components/EditOrderDrawer.tsx` - Real order editing

### 🚀 Next Phase: Barcode System
- **Barcode Generation**: Code 128 format with order details
- **Camera Scanning**: Real-time barcode scanning for tablets/mobiles
- **Stage Progression**: Complete workflow automation
- **Print Integration**: PDF generation and printing

---

## [v0.3.0-beta] - 2025-10-01 - Complete RPC Implementation

### 🎯 Overview
Complete implementation of all critical RPC functions across 9 phases, providing a comprehensive backend API for the production management system. This release includes 50+ RPC functions covering queue management, order lifecycle, staff management, inventory tracking, and settings.

### ✅ Phase 1: Database Infrastructure
- **New Tables**: `staff_shifts`, `settings`, `components`, `stage_events`, `audit_log`
- **Helper Functions**: `check_user_role()`, `get_user_role()`, `settings_get_bool()`
- **RLS Policies**: Row-level security on all tables
- **Indexes**: Optimized for performance
- **File**: `supabase/sql/005_database_infrastructure.sql`

### ✅ Phase 2: Staff Management RPCs  
- `get_staff_list()` - Get all staff with filtering
- `get_staff_member()` - Get individual staff details
- `upsert_staff_member()` - Create/update staff
- `deactivate_staff_member()` - Soft delete staff
- `start_shift()` / `end_shift()` - Shift management
- `get_current_shift()` / `get_shift_history()` - Shift tracking
- `start_break()` / `end_break()` - Break management
- **File**: `supabase/sql/006_staff_management_rpcs.sql`

### ✅ Phase 3: Order Management RPCs
- `assign_staff()` / `unassign_staff()` - Staff assignment
- `move_to_next_stage()` / `move_to_stage()` - Stage progression
- `update_order_notes()` - Update order notes
- `update_order_priority()` - Change priority level
- `update_order_due_date()` - Update due date
- `get_order()` - Get single order with assignee details
- **File**: `supabase/sql/007_order_management_rpcs.sql`

### ✅ Phase 4: Queue Management RPCs
- `get_queue()` - Enhanced queue with filtering, pagination, search, sorting (10 parameters)
- `get_queue_stats()` - Queue statistics and counts by stage
- `get_unassigned_counts()` - Unassigned orders count by stage
- `set_storage()` - Set storage location
- `get_orders_by_assignee()` - Get orders assigned to specific staff
- `get_queue_minimal()` - Updated compatibility wrapper
- **Multi-store support** for both Bannos and Flourlane
- **File**: `supabase/sql/008_queue_management_rpcs.sql`

### ✅ Phase 5: Scanner & Stage Management RPCs
- `handle_print_barcode()` - Print barcode and start filling stage
- `complete_filling()` / `complete_covering()` / `complete_decorating()` - Stage completion
- `start_packing()` / `complete_packing()` - Packing workflow
- `qc_return_to_decorating()` - QC return workflow (Supervisor only)
- `get_order_for_scan()` - Lookup order by barcode
- `print_barcode()` / `complete_stage()` - Compatibility wrappers
- **Barcode format**: `STORE-HUMAN_ID` (e.g., `BANNOS-00001`)
- **File**: `supabase/sql/009_scanner_stage_rpcs.sql`

### ✅ Phase 6: Inventory Management RPCs
- `get_components()` - Get all components with filtering
- `get_component()` - Get single component by ID or SKU
- `upsert_component()` - Create/update components
- `update_component_stock()` - Update stock levels with audit trail
- `get_low_stock_components()` - Get components below minimum stock
- `get_inventory_value()` - Total inventory value and category summary
- `bulk_update_component_stock()` - Update multiple components
- `deactivate_component()` - Soft delete components
- **File**: `supabase/sql/010_inventory_management_rpcs.sql`

### ✅ Phase 7: Settings Management RPCs
- `get_settings()` / `get_setting()` - Get store settings
- `set_setting()` / `delete_setting()` - Manage settings
- `get_flavours()` / `set_flavours()` - Manage available flavours
- `get_storage_locations()` / `set_storage_locations()` - Manage storage locations
- `get_monitor_density()` / `set_monitor_density()` - Monitor settings
- `get_settings_printing()` / `set_settings_printing()` - Printing configuration
- **Store-specific** or global settings with JSON values
- **File**: `supabase/sql/011_settings_management_rpcs.sql`

### ✅ Phase 8: Complete Grid & Order Management RPCs
- `get_complete()` - Get completed orders with filtering, date range, search, sorting
- `update_order_core()` - Update order core fields (customer, product, flavour, notes, etc.)
- `get_complete_minimal()` - Simplified complete orders view
- **Multi-store support** verified with both Bannos and Flourlane
- **File**: `supabase/sql/012_complete_grid_order_rpcs.sql`

### ✅ Phase 9: Final RPCs (Analytics, Shopify & Bulk Operations)
- `get_staff_me()` - Get current authenticated staff member
- `get_inventory_status()` - Get detailed stock status
- `cancel_order()` - Cancel an order (Admin only)
- `bulk_assign()` - Assign multiple orders to staff
- `test_storefront_token()` / `connect_catalog()` / `sync_shopify_orders()` - Shopify integration placeholders
- `get_staff_times()` / `get_staff_times_detail()` - Time and payroll reporting
- **File**: `supabase/sql/013_final_rpcs.sql`

### 🔐 Security Features
- **Role-based Access Control**: Staff, Supervisor, Admin roles enforced on all RPCs
- **Row Level Security (RLS)**: Enabled on all tables with proper policies
- **Audit Logging**: Complete trail in `audit_log` table for all critical operations
- **Stage Events**: Detailed tracking in `stage_events` table
- **Input Validation**: Store, stage, priority, and parameter validation
- **Foreign Key Constraints**: Data integrity enforced

### 🏗️ Architecture
- **Separate Tables**: `orders_bannos` and `orders_flourlane` for data isolation
- **Multi-Store Support**: All RPCs support single-store or multi-store queries
- **UNION ALL**: Efficient cross-store queries when needed
- **Dynamic SQL**: Safe parameterized queries with proper escaping
- **SECURITY DEFINER**: All RPCs run with elevated privileges with explicit role checks

### 📊 Testing & Validation
- **Complete Order Lifecycle**: Tested Filling → Covering → Decorating → Packing → Complete
- **Multi-Store**: Verified with orders in both Bannos and Flourlane
- **Barcode Scanning**: Tested with format `BANNOS-12345`, `FLOURLANE-67890`
- **Inventory**: Tested component creation, stock updates, low stock alerts
- **Settings**: Tested flavours, storage locations, monitor density
- **Stage Events**: Verified audit trail for all stage transitions

### 📝 Database Changes
- **New SQL Files**: 9 new migration files (005-013)
- **Total Functions**: 50+ RPC functions implemented
- **New Tables**: 5 new infrastructure tables
- **Indexes**: Performance optimized for all queries
- **Views**: Updated compatibility views

### 🎨 Data Type Fixes
- Fixed `currency` type: `character(3)` in database
- Fixed `priority` type: `priority_level` enum
- Fixed `stage` type: `stage_type` enum
- Proper handling of `NULL` values in audit logging
- Correct column naming: `actor_id`, `order_id`, `store` in `audit_log`

### 🔧 Key Improvements
- **Idempotency**: Safe to call functions multiple times
- **Error Handling**: Proper validation and error messages
- **Performance**: Optimized queries with proper indexing
- **Scalability**: Ready for production load
- **Maintainability**: Clean, well-documented code

### 📦 Files Added
- `supabase/sql/005_database_infrastructure.sql` - Core infrastructure
- `supabase/sql/006_staff_management_rpcs.sql` - Staff & shift management
- `supabase/sql/007_order_management_rpcs.sql` - Order operations
- `supabase/sql/008_queue_management_rpcs.sql` - Queue functions
- `supabase/sql/009_scanner_stage_rpcs.sql` - Scanner & stage lifecycle
- `supabase/sql/010_inventory_management_rpcs.sql` - Inventory tracking
- `supabase/sql/011_settings_management_rpcs.sql` - Settings management
- `supabase/sql/012_complete_grid_order_rpcs.sql` - Complete orders grid
- `supabase/sql/013_final_rpcs.sql` - Final RPCs and placeholders
- `docs/SUPABASE_RPC_IMPLEMENTATION_PLAN.md` - Complete implementation plan

### 🚀 Production Readiness
- ✅ All critical RPC functions implemented
- ✅ Complete order lifecycle working
- ✅ Multi-store architecture validated
- ✅ Role-based security enforced
- ✅ Audit logging complete
- ✅ Ready for UI integration
- ⚠️ Shopify integration functions are placeholders (to be implemented)
- ⚠️ Staff authentication to be configured

### 🔄 Migration Path
1. Apply SQL files in order: 005 → 006 → 007 → 008 → 009 → 010 → 011 → 012 → 013
2. Verify all functions created successfully
3. Test with sample data
4. Configure authentication
5. Connect UI to new RPCs

---

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
