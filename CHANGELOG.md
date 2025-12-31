## v0.20.0-beta — Orders Management, Security Hardening & Dead Code Cleanup (2025-12-31)

### 🎯 Overview
Major release introducing the Orders Management page with list view and real-time monitor updates. Comprehensive security hardening removes sensitive console.log statements, test database functions, and hardcoded credentials. Performance improvements optimize RLS policies using `(select auth.uid())` pattern. Dead code cleanup removes ~2,500 lines of unused code across 6 issues.

### ✨ New Features

#### Orders Management Page (PR #515, #518)
- **Database Infrastructure**: New `order_view_all` RPC for unified order listing across stores
- **List View**: Full orders management page with search, filters, and pagination
- **Stage Badge Colors**: Production stages display with color-coded badges

#### Real-time Monitor Updates (PR #523)
- **Live Updates**: Monitor pages now receive real-time order updates via Supabase subscriptions
- **Reduced Polling**: Eliminates need for manual refresh on supervisor dashboards

#### Split Order Display (PR #522)
- **Order Suffix**: Split orders now display suffix (-A, -B, etc.) for clear identification

### 🐛 Bug Fixes

#### Edit Order Field Mapping (PR #525)
- **Issue**: `cake_writing` field mapped incorrectly to `notes` in edit form
- **Fix**: Corrected field mapping to preserve cake writing instructions

#### Orders List Stage Display (PR #526)
- **Issue**: Orders list showed generic status instead of production stage
- **Fix**: Display actual production stages (Filling, Covering, Decorating, Packing, Complete)

#### Auth & Navigation Fixes (PR #510)
- **Multiple Issues**: Resolved auth flow bugs and navigation state issues (#498, #499, #500, #501)

#### Mock Data Removal (PR #511)
- **Issue**: QuickActions and SchedulePage contained mock data
- **Fix**: Removed mock data, components now use real data sources (#489, #490)

#### Dashboard Background Polling (PR #509)
- **Issue**: Dashboard continued polling when browser tab was inactive
- **Fix**: Polling stops when tab loses focus, resumes on focus (#502)

### 🔒 Security

#### Console.log Sensitive Data Removal (PR #529)
- **Risk**: Console statements logged potentially sensitive order/user data
- **Fix**: Removed or sanitized all console.log statements with sensitive data

#### Drop Test/Debug Database Functions (PR #538)
- **Risk**: Test functions (`test_order_soft_delete`, `debug_check_user_role`, etc.) left in production
- **Fix**: Dropped 7 test/debug functions that should never exist in production

#### Remove Hardcoded Credentials (PR #553)
- **Risk**: Test files contained hardcoded Supabase credentials
- **Fix**: Deleted `test_messaging_simple.js`, `test_connection.mjs`, `archive/test-sql/apply_schema.mjs`
- **Prevention**: Added `.gitignore` patterns for `test_*.mjs` and `test_*.js`

### ⚡ Performance

#### RLS Policy Optimization (PR #546)
- **Issue**: 22 RLS policies used `auth.uid()` causing repeated function calls
- **Fix**: Changed to `(select auth.uid())` pattern for single evaluation per query

#### Policy Consolidation (PR #547)
- **Issue**: Multiple permissive policies on same table caused performance warnings
- **Fix**: Consolidated into single policies per table using OR conditions

#### Drop Redundant Policies (PR #548)
- **Issue**: 15 `service_only` policies duplicated service-role access
- **Fix**: Dropped redundant policies (service role bypasses RLS by default)

#### Duplicate Index Removal (PR #545)
- **Issue**: `work_queue` table had duplicate index on `status` column
- **Fix**: Dropped redundant index, keeping the original

### 🔧 Refactoring

#### Direct Writes → RPCs (PR #527)
- **Change**: Replaced direct table writes with SECURITY DEFINER RPCs
- **Affected**: Soft delete operations now use `rpc_soft_delete_order`
- **Benefit**: Consistent security model, audit trail via RPC layer

#### Consolidate QueueItem Types (PR #513)
- **Issue**: Duplicate `QueueItem` interfaces in multiple files (#491)
- **Fix**: Extracted shared type to `src/types/queue.ts`

#### Add search_path to Functions (PR #544)
- **Issue**: Functions missing explicit `search_path` declaration
- **Fix**: Added `search_path = 'public'` to affected functions

### 🗑️ Dead Code Cleanup (~2,500 lines removed)

#### Drop Unused Views (PR #530)
- Removed 4 unused SECURITY DEFINER views and their supporting code
- Views: `dashboard_metrics`, `active_orders_by_stage`, `staff_assignments`, `recent_activity`

#### Delete Dead Code Files (PR #539)
- Removed 12 confirmed unused component/page files
- Total: ~800 lines of dead code

#### Remove Unused Auth Components (PR #540)
- Removed legacy auth components replaced by ModernLoginPage
- Files: `BadgeScanner.tsx`, `PinEntry.tsx`, legacy login components

#### Remove Unused Hooks (PR #541)
- Removed 8 hooks with zero imports
- Hooks: `useLocalStorage`, `useDebounce`, `useMediaQuery`, etc.

#### Drop Unused Database Functions (PR #542)
- Dropped 15 RPC functions with no frontend callers
- Functions: `get_dashboard_metrics`, `get_staff_workload`, etc.

#### Remove Unused RPC Wrappers (PR #543)
- Removed TypeScript wrappers for dropped database functions
- Cleaned up unused config exports

### 📚 Documentation

#### README & Overview Updates (PR #549)
- **README.md**: Added architecture diagram, improved quick start
- **docs/overview.md**: Updated system overview with current state

#### CLAUDE.md Improvements (PR #516)
- **Architecture**: Added data flow diagram
- **Workflow**: Clarified PR process and review requirements

#### Placeholder Standardization (PR #551, #554, #555)
- **Format**: All docs now use `<angle-bracket>` placeholder style
- **Security**: Removed hardcoded project ID from CLAUDE.md

### 📋 PRs in This Release
- PR #509: `fix: stop dashboard polling when tab is in background`
- PR #510: `fix: resolve auth/navigation bugs`
- PR #511: `fix: remove mock data from QuickActions and SchedulePage`
- PR #512: `docs: clarify that Claude should not merge PRs`
- PR #513: `chore: consolidate duplicate QueueItem interfaces`
- PR #515: `feat: Orders Management - Phase 1 (Database Infrastructure)`
- PR #516: `docs: improve CLAUDE.md with architecture and workflow guidance`
- PR #518: `feat: add Orders Management page with list view`
- PR #522: `fix: display order suffix (-A, -B) for split orders`
- PR #523: `feat: add real-time updates to Monitor pages`
- PR #525: `fix: correct field mapping for edit order`
- PR #526: `fix: Orders List shows actual production stages`
- PR #527: `fix: replace direct table writes with SECURITY DEFINER RPCs`
- PR #529: `fix: remove sensitive data from console.log statements`
- PR #530: `fix: drop unused SECURITY DEFINER views and dead code`
- PR #538: `fix: drop test/debug database functions (security)`
- PR #539: `fix: delete confirmed dead code files`
- PR #540: `fix: remove unused auth components`
- PR #541: `fix: remove unused hooks`
- PR #542: `fix: drop unused database functions`
- PR #543: `fix: remove unused RPC wrappers and config exports`
- PR #544: `fix: add search_path to functions missing it`
- PR #545: `fix: drop duplicate index on work_queue table`
- PR #546: `perf: fix auth_rls_initplan warnings in 22 RLS policies`
- PR #547: `perf: consolidate multiple permissive RLS policies`
- PR #548: `fix: drop redundant service_only policies`
- PR #549: `docs: update README and overview documentation`
- PR #551: `docs: standardize placeholder format`
- PR #553: `fix: remove test files with hardcoded credentials`
- PR #554: `docs: remove hardcoded project ID from CLAUDE.md`
- PR #555: `docs: standardize all placeholders`

### 📁 Key Files Modified

#### New Files
- `src/pages/OrdersPage.tsx` - Orders management list view
- `src/types/queue.ts` - Shared QueueItem type

#### Database
- `supabase/migrations/` - 15+ migrations for RLS optimization and cleanup

#### Security
- `.gitignore` - Added patterns to prevent credential exposure

### 🔧 Technical Notes

#### RLS Optimization Pattern
Changed from:
```sql
auth.uid() = user_id
```
To:
```sql
(select auth.uid()) = user_id
```
This evaluates `auth.uid()` once per query instead of once per row.

#### Dead Code Identification Process
Used combination of:
1. LSP findReferences for zero-import detection
2. Database query for RPC call counts
3. Grep for string-based function calls

---

## v0.19.0-beta — TypeScript Type Safety & React Query Migration (2025-12-23)

### 🎯 Overview
Major developer experience improvements with auto-generated TypeScript types from Supabase schema. All inventory tabs migrated to React Query. Touch targets and order card visibility improved for production floor.

### ✨ New Features

#### Supabase TypeScript Type Generation (PR #459, #464, #465, #467, #468)
- **Auto-generated types**: `npm run gen:types` generates `src/types/supabase.ts` from live database schema
- **RPC return types**: Key RPC functions now use generated return types instead of `any`
- **Queue hooks typed**: `useQueue`, `useBannosQueue`, `useQueueRealtime` use generated types
- **Component props typed**: Queue components use `Database['public']['Functions']` types
- **Documentation**: README updated with type regeneration instructions

#### Bulk Staff Assignment RPC (PR #450)
- **New RPC**: `bulk_assign_staff` for assigning multiple orders at once
- **Efficiency**: Single database call instead of multiple sequential updates

#### Inventory React Query Migration (PR #439, #440, #441, #443)
- **CakeToppersTab**: Migrated to React Query with proper cache invalidation
- **AccessoriesTab**: Migrated to React Query
- **ComponentsTab**: Migrated to React Query
- **BOMsTab**: Migrated to React Query
- **Removed**: Legacy `requestCache` and deprecated cached functions (PR #444)

### 🐛 Bug Fixes

#### Priority Calculation on Import (PR #453)
- **Issue**: Shopify orders imported without priority calculation
- **Fix**: Priority now calculated during import based on due date

#### Remove Unused Urgent Priority (PR #456)
- **Issue**: `priority_level` enum contained unused 'Urgent' value
- **Fix**: Removed 'Urgent' from enum, keeping only Low/Medium/High/Critical

#### Order Card Visibility (PR #447)
- **Issue**: Order cards had no visible borders, hard to distinguish
- **Fix**: Added subtle borders and shadow for better visual separation

#### Touch Target Improvements (PR #445, #446)
- **Base components**: Increased button/input heights to meet 44px minimum
- **Explicit overrides**: Small button variants explicitly set to 44px

#### Date Format Standardization (PR #434, #438)
- **Format**: All dates now display as dd/mm/yyyy
- **RecentOrders**: Fixed due date formatting in table

#### Stale Time Constants (PR #448)
- **Issue**: Magic numbers for staleTime in queue hooks
- **Fix**: Centralized constants for consistent cache behavior

### 🔧 Refactoring

#### DRY Queue Hooks (PR #449)
- **Shared types**: Common types extracted for queue hooks
- **Utilities**: Shared utility functions reduce code duplication

### 📋 PRs in This Release
- PR #434: `feat: standardize date display format to dd/mm/yyyy`
- PR #438: `fix: format due date in RecentOrders table`
- PR #439: `feat: migrate CakeToppersTab to React Query`
- PR #440: `feat: migrate AccessoriesTab to React Query`
- PR #441: `feat: migrate ComponentsTab to React Query`
- PR #443: `feat: migrate BOMsTab to React Query`
- PR #444: `chore: remove requestCache and deprecated cached functions`
- PR #445: `fix: increase touch target sizes for base UI components`
- PR #446: `fix: increase explicit small button overrides`
- PR #447: `fix: add visible borders and shadow to order cards`
- PR #448: `fix: use constants for staleTime in queue hooks`
- PR #449: `refactor: DRY up queue hooks with shared types`
- PR #450: `feat: add bulk staff assignment RPC endpoint`
- PR #453: `fix: calculate priority on Shopify order import`
- PR #456: `fix: remove unused Urgent value from priority_level enum`
- PR #459: `feat: add Supabase TypeScript type generation`
- PR #464: `feat: add return types to key RPC functions`
- PR #465: `feat: type queue hooks with generated Supabase types`
- PR #467: `feat: type components with generated Supabase types`
- PR #468: `docs: add type generation instructions to README`

### 📁 Key Files Modified

#### New Files
- `src/types/supabase.ts` - Auto-generated database types

#### Type System
- `src/lib/rpc-client.ts` - RPC functions with generated return types
- `src/hooks/useQueue.ts` - Typed with Supabase types
- `src/hooks/useBannosQueue.ts` - Typed with Supabase types
- `src/hooks/useQueueRealtime.ts` - Typed with Supabase types
- `src/components/QueueTable.tsx` - Props typed with database types

#### Inventory Components
- `src/components/inventory/CakeToppersTab.tsx` - React Query
- `src/components/inventory/AccessoriesTab.tsx` - React Query
- `src/components/inventory/ComponentsTab.tsx` - React Query
- `src/components/inventory/BOMsTab.tsx` - React Query

### 🔧 Technical Notes

#### Type Generation Workflow
After database migrations, run `npm run gen:types` to regenerate TypeScript types. This ensures compile-time type checking for all database operations.

#### React Query Benefits
- Automatic cache invalidation
- Background refetching
- Loading/error states built-in
- Devtools for debugging

---

## v0.18.0-beta — Modern Login Page (2025-12-20)

### 🎯 Overview
New modern login page with Ordak branding, improved accessibility, and mobile-first design. The login experience now matches the production floor aesthetic with proper touch targets and visual feedback.

### ✨ New Features

#### Modern Login Page with Ordak Branding (PR #409)
- **New design**: Dark theme login page with Ordak orange accents
- **Branding panel**: Left side showcases product features (desktop only)
- **Mobile branding**: Compact Ordak header visible on mobile devices
- **Loading spinner**: Visual feedback during authentication
- **Accessibility**: Password toggle with proper aria-label and 48px touch target

### 🐛 Bug Fixes

#### Login UX Improvements (PR #409)
- **Password toggle**: Touch target increased from ~36px to 48x48px
- **Badge scan button**: Disabled with "(Coming Soon)" instead of misleading toast
- **Role tabs removed**: Non-functional Staff/Supervisor tabs removed to avoid confusion
- **Mobile padding**: Responsive padding (16px → 24px → 48px) instead of fixed 48px
- **Error icon**: Increased from 16px to 20px for better visibility

### 📋 PRs in This Release
- PR #409: `feat: Modern login page with Ordak branding`

### 📁 Key Files Modified

#### New Components
- `src/components/Auth/ModernLoginPage.tsx` - Complete login page redesign
- `src/components/OrdakLogo.tsx` - SVG logo component with light/dark variants

#### Updated
- `src/App.tsx` - Integrated new login page

### 🔧 Technical Notes

#### Lazy-loaded Auth Service
The auth service is lazy-loaded at module level to avoid per-call dynamic imports, improving login performance on repeat submissions.

#### Responsive Design
- Mobile-first approach with responsive breakpoints
- Touch targets meet WCAG 2.1 standards (44px minimum)
- IBM Plex Sans font for branding consistency

---

## v0.17.0-beta — Touch Targets, Scanner UX & Bug Fixes (2025-12-19)

### 🎯 Overview
Focus on mobile usability and production floor UX. Touch targets now meet WCAG 2.1 accessibility standards (44px minimum). Scanner modal now shows correct action text. Bulk assign is fully functional. Fixed cache bug causing stale data after QC returns.

### ✨ New Features

#### Bulk Assign Staff Dropdown (PR #397)
- **Issue**: Bulk assign dropdown in QueueTable was not wired up
- **Fix**: Connected dropdown to staff list and assignment API
- **Staff filtering**: Only shows staff from current store (or "both" stores)
- **Error handling**: Toast notifications for success/failure

#### Scanner Start vs Complete Text (PR #399)
- **Issue**: Scan modal always showed "Confirm Completion" even for stages not yet started
- **Fix**: Shows "Confirm Start" for first scan, "Confirm Completion" for second scan
- **Logic**: Uses `covering_start_ts` and `decorating_start_ts` to determine state
- **Updated**: StaffWorkspacePage now passes timestamp fields to scanner

### 🐛 Bug Fixes

#### Touch Target Sizes - WCAG Compliance (PR #401, #403)
- **Issue**: Buttons, inputs, and tabs too small for production floor use (messy hands)
- **Standard**: WCAG 2.1 requires minimum 44x44px touch targets
- **Fixes**:
  - Default button height: 36px → 44px
  - Large button height: 40px → 48px
  - Icon button size: 36px → 44px
  - Tab list height: 36px → 48px
  - Input height: 36px → 44px
  - Overflow menu button: 32px → 44px with larger icon
  - Header search button aligned with input
  - Scanner overlay button gaps increased
  - Modal spinners: 16px → 24px for better visibility

#### QC Return Cache Bug (PR #404)
- **Issue**: Order still showed in Packing workspace after being sent back to Decorating
- **Root Cause**: `qcReturnToDecorating` didn't invalidate queue cache
- **Result**: Auto-refresh (every 30s) returned stale cached data
- **Fix**: Added `invalidateQueueCache()` call after QC return RPC

### 📋 PRs in This Release
- PR #397: `fix: wire up bulk assign staff dropdown in QueueTable`
- PR #399: `fix: show 'Confirm Start' vs 'Confirm Completion' in scan modal`
- PR #401: `fix: increase touch target sizes for mobile compliance`
- PR #403: `fix: improve touch targets and visibility for production floor UI`
- PR #404: `fix: invalidate queue cache after QC return to decorating`

### 📁 Key Files Modified

#### Frontend Components
- `src/components/ui/button.tsx` - Touch target size variants
- `src/components/ui/tabs.tsx` - Tab list height
- `src/components/ui/input.tsx` - Input height
- `src/components/Header.tsx` - Search button alignment
- `src/components/QueueTable.tsx` - Bulk assign wiring
- `src/components/ScannerOverlay.tsx` - Start/Complete text logic, button gaps
- `src/components/StaffWorkspacePage.tsx` - Timestamp fields for scanner
- `src/components/SupervisorWorkspacePage.tsx` - Button size fixes
- `src/components/OrderOverflowMenu.tsx` - Larger touch target
- `src/components/StaffAssignmentModal.tsx` - Larger spinners

#### RPC Client
- `src/lib/rpc-client.ts` - Cache invalidation for QC return

### 🔧 Technical Notes

#### Touch Target Standards
Production floor staff often have messy hands (flour, icing). Larger touch targets reduce mis-taps and improve workflow speed. All interactive elements now meet or exceed 44px minimum.

#### Cache Invalidation Pattern
When mutations change order data, call `invalidateQueueCache()` to ensure auto-refresh shows fresh data. This prevents the "ghost order" problem where orders appear in wrong stages.

---

## v0.16.0-beta — Packing Slip Printing & Real-Time Staff Status (2025-12-18)

### 🎯 Overview
Major improvements to the Packing stage with local packing slip printing and proper Shopify integration. Staff Overview now shows real-time shift status from the database. Multiple bug fixes for workspace display and production environment.

### ✨ New Features

#### Print Packing Slip (PR #383)
- **Local HTML printing**: Generates packing slip using HTML template (no Shopify redirect required)
- **Full order details**: Shows customer info, delivery date, products, accessories, shipping address, notes
- **Scannable barcode**: Renders Code 39 barcode for order identification
- **New RPC**: `get_order_v2` - Extended order data including `shipping_address` and `accessories`

#### View in Shopify Button Fix (PR #383)
- **Issue**: Button used incorrect URL format
- **Fix**: Now generates correct Shopify admin URL with proper store slug

#### Real-Time Staff Shift Status (PR #382)
- **Issue**: Staff Overview showed placeholder/estimated shift counts
- **Fix**: Queries actual `shifts` and `breaks` tables for real status
- **On Shift**: Active shift with no active break
- **On Break**: Active shift AND active break
- **Off Shift**: No active shift
- **New RPC**: `get_staff_with_shift_status`

#### Hide Staff/Supervisor Workspace from Sidebar (PR #381)
- Removed workspace links from dashboard sidebar (admin users)
- Staff/Supervisor users still access via their direct login
- Pages and components remain fully functional

### 🐛 Bug Fixes

#### Barcode Font Loading (PR #384)
- **Issue**: Barcode showed as plain text `*F18619*` instead of scannable stripes
- **Root Cause**: Print triggered before Google Font (Libre Barcode 39) finished loading
- **Fix**: Wait for `document.fonts.ready` before triggering print, with fallback timeout

#### Workspace Size & Delivery Display (PR #385)
- **Issue**: Size showed "Unknown" and Delivery method was blank
- **Root Cause**: `getRealisticSize()` expected `S/M/L` but database has `"Large"`, `"Medium"`, etc.
- **Root Cause**: Case-sensitive comparison `=== "delivery"` failed on `"Delivery"`
- **Fix**: Display database value directly, use case-insensitive comparison

#### Ambiguous Column in adjust_accessory_stock (PR #380)
- **Issue**: "column reference 'current_stock' is ambiguous" error when adjusting accessory stock
- **Fix**: Qualified column as `accessories.current_stock` in UPDATE SET clause

#### Hide Dev Pages in Production (PR #386, #387)
- **Issue**: Error Test and Barcode Test pages visible in production
- **Root Cause**: `process.env.NODE_ENV` doesn't work in Vite
- **Fix**: Use `import.meta.env.PROD` and `devOnly: true` flag

### 📋 PRs in This Release
- PR #380: `fix: resolve ambiguous column reference in adjust_accessory_stock`
- PR #381: `feat: hide Staff/Supervisor Workspace from dashboard sidebar`
- PR #382: `feat: wire Staff Overview to real shift data`
- PR #383: `feat: fix packing stage View in Shopify and Print Packing Slip buttons`
- PR #384: `fix: wait for barcode font to load before printing`
- PR #385: `fix: correct Size and Delivery display in workspace cards`
- PR #386: `fix: hide Error Test from sidebar in production`
- PR #387: `fix: hide Barcode Test from sidebar in production`

### 📁 Key Files Added/Modified

#### New Files
- `src/lib/packing-slip-service.ts` - Local packing slip HTML generation

#### Migrations
- `20251217085753_fix_adjust_accessory_stock_ambiguous_column.sql`
- `20251217102159_get_staff_with_shift_status.sql`
- `20251218100000_get_order_v2_with_shipping.sql`

#### Frontend
- `src/components/StaffOrderDetailDrawer.tsx` - Shopify URL fix, packing slip printing
- `src/components/StaffOverview.tsx` - Real shift status display
- `src/components/StaffWorkspacePage.tsx` - Size/delivery display fixes
- `src/components/SupervisorWorkspacePage.tsx` - Size/delivery display fixes
- `src/components/Dashboard.tsx` - Removed workspace nav items
- `src/components/Sidebar.tsx` - Dev-only page filtering
- `src/lib/rpc-client.ts` - New types and RPC functions

---

## v0.15.0-beta — QC Flow & Workspace Improvements (2025-12-17)

### 🎯 Overview
Complete overhaul of the QC (Quality Control) flow in Packing stage, with fixes for storage dropdown, Return to Decorating functionality, and workspace refresh behavior. Orders now properly unassign when returned to queue.

### ✨ New Features

#### Workspace Refresh on Stage Changes (PR #363, #372)
- Staff Workspace now auto-refreshes when orders complete via scanner
- Workspace refreshes after QC return to decorating
- Uses `onOrderCompleted` callback pattern for consistent behavior

#### Unassign Orders on Stage Completion (PR #367)
- Orders automatically unassign (`assignee_id = NULL`) when completing a stage
- Next stage picks up from unassigned queue
- Same pattern applied to QC return flow

### 🐛 Bug Fixes

#### Storage Dropdown Not Saving (PR #369)
- **Issue**: Storage location dropdown in Packing stage showed selection but never saved to database
- **Root Cause**: Parameter mismatch - frontend sent `p_storage_location` but RPC expected `p_storage`
- **Fix**: Corrected parameter name in `rpc-client.ts`

#### QC Return to Decorating RPC (PR #370)
- **Issue**: `qc_return_to_decorating` function used UUID type but orders use text IDs
- **Fix**: Rewrote function to accept `text` order_id and `text` store parameters
- **Fix**: Added proper table selection based on store (orders_bannos/orders_flourlane)

#### Stage Events Constraint (PR #371)
- **Issue**: `qc_return` event type not allowed by `stage_events_event_type_check` constraint
- **Fix**: Added `qc_return` to allowed event types: `assign`, `complete`, `print`, `start`, `qc_return`

#### Staff Workspace Showing Complete Orders (PR #373)
- **Issue**: Complete stage orders appeared in Staff Workspace, cluttering the view
- **Fix**: Added filter to exclude `stage = 'Complete'` from workspace query

#### QC Return Not Clearing Assignee (PR #374)
- **Issue**: When returning order to Decorating, it kept the original assignee
- **Fix**: Added `assignee_id = NULL` to the UPDATE statement
- Orders now go back to unassigned queue for any decorator to pick up

#### TOCTOU Race Condition Fix (PR #370)
- **Issue**: Check-then-update pattern allowed race conditions
- **Fix**: Atomic UPDATE with `WHERE stage = 'Packing'` clause prevents concurrent modifications

#### Migration Filename Sync (PR #376)
- **Issue**: Local migration filenames didn't match database versions, causing Supabase Preview failures
- **Fix**: Renamed migrations to match database timestamps

### 📋 PRs in This Release
- PR #363: `fix: workspace order refresh after scan completion`
- PR #367: `feat: unassign orders on stage completion`
- PR #369: `fix: correct setStorage RPC parameter names for Packing stage`
- PR #370: `fix: update qc_return_to_decorating RPC for text-based order IDs`
- PR #371: `fix: add qc_return to stage_events event_type constraint`
- PR #372: `fix: refresh workspace after QC return to decorating`
- PR #373: `fix: filter out Complete stage orders from Staff Workspace`
- PR #374: `fix: clear assignee_id when returning order to Decorating`
- PR #376: `fix: sync migration filenames with database versions`

### 📁 Key Files Added/Modified

#### Migrations
- `20251216235304_051_set_storage_rpc.sql` - Storage RPC fix
- `20251217003447_fix_qc_return_to_decorating.sql` - QC return function rewrite
- `20251217033221_add_qc_return_event_type.sql` - Event type constraint update
- `20251217033243_qc_return_clear_assignee.sql` - Clear assignee on QC return

#### Frontend
- `src/lib/rpc-client.ts` - Fixed `setStorage` parameter name
- `src/components/StaffOrderDetailDrawer.tsx` - Added `onOrderCompleted` callback
- `src/components/StaffWorkspacePage.tsx` - Filter Complete stage, pass callback
- `src/components/SupervisorWorkspacePage.tsx` - Pass callback to drawer

### 🔧 Technical Details

#### QC Return Flow
```
1. User selects QC issue (e.g., "Wrong spelling")
2. Clicks "Return to Decorating" button
3. RPC qc_return_to_decorating():
   - Validates order is in Packing stage
   - Atomic UPDATE: stage='Decorating', assignee_id=NULL
   - Clears decorating_complete_ts and packing_start_ts
   - Logs to stage_events with event_type='qc_return'
   - Logs to audit_log
4. Frontend calls onOrderCompleted to refresh workspace
5. Order appears in unassigned Decorating queue
```

#### Storage Dropdown Fix
```typescript
// Before (broken)
p_storage_location: storageLocation

// After (working)
p_storage: storageLocation
```

---

## v0.14.0-beta — Analytics Dashboard & Inventory Matching Improvements (2025-12-14)

### 🎯 Overview
Major analytics dashboard overhaul with real database data, new staff performance metrics by stage, and critical fixes for accessory/inventory matching to support both online and POS order formats.

### ✨ New Features

#### Real-Time Analytics Dashboard (PR #338)
- **Revenue & Orders**: Daily revenue and order count charts with date range selector (7d/30d/90d)
- **Top Products**: Top 5 products by order count with revenue breakdown
- **Weekly Forecast**: Stacked bar chart showing completed vs pending orders by day of week
- **Delivery/Pickup Breakdown**: Pie chart showing distribution of delivery methods
- New RPCs: `get_store_analytics`, `get_revenue_by_day`, `get_top_products`, `get_weekly_forecast`, `get_delivery_breakdown`

#### Staff Stage Performance Analytics (PR #339)
- Replaced mock "Skills & Training" tab with real "Staff Performance" data
- Shows orders completed per staff member broken down by stage (Filling, Covering, Decorating, Packing)
- "Top Performers by Stage" cards highlighting best performer for each stage
- New RPC: `get_staff_stage_performance`

### 🐛 Bug Fixes

#### POS Accessory Variant Separator (PR #342)
- **Issue**: POS orders use "+" separator (e.g., "Blue + Metallic") but inventory deduction only handled "/" separator
- **Fix**: Now handles both "/" (online) and "+" (POS) separators when parsing variant_title
- Improved NULL handling with NULLIF throughout

#### Exclude NULL from Top Products (PR #343)
- **Issue**: POS accessory-only orders have NULL product_title and appeared as "Unknown" in analytics
- **Fix**: Added `WHERE o.product_title IS NOT NULL` filter to `get_top_products` RPC

#### Stock Transactions Missing transaction_type (PR #345)
- **Issue**: `record_stock_adjustment` and inventory deduction INSERTs were missing required `transaction_type` column
- **Fix**: Added explicit `transaction_type` values ('adjustment', 'order_deduction') to all stock_transactions INSERTs

#### Accessory Variant Matching (PR #337)
- **Issue**: Accessories like "Pink Glitter Number Candles 6" weren't matching orders with variant_title "Pink Glitter / 6"
- **Fix**: Combine product title + variant suffix for matching (e.g., "Pink Glitter Number Candles" + "6")

#### app_role() Auth Fix (PR #340)
- **Issue**: `app_role()` failed when called from SECURITY DEFINER functions with restricted search_path
- **Fix**: Use fully qualified references (`public.auth_email()`, `public.staff_shared`)

#### Ambiguous Column Reference (PR #336)
- **Issue**: `claim_inventory_sync_items` RPC failed with "column reference 'status' is ambiguous"
- **Fix**: Use explicit column aliasing in RETURNING clause with CTE wrapper

### 🔒 Security Hardening

#### search_path Security (PR #334, #340)
- Updated all public functions to use `SET search_path = pg_temp, public`
- Prevents search_path injection attacks in SECURITY DEFINER functions
- Fully qualified references in auth functions

### 📋 PRs in This Release
- PR #334: `fix: set search_path for public functions (security hardening)`
- PR #336: `fix: resolve ambiguous column reference in claim_inventory_sync_items`
- PR #337: `fix: include variant_title in accessory matching`
- PR #338: `feat: wire analytics dashboards to real database data`
- PR #339: `feat: add staff stage performance analytics`
- PR #340: `fix: use fully qualified refs in app_role()`
- PR #341: `docs: update CLAUDE.md database rules`
- PR #342: `fix: handle POS accessory variant separator in inventory deduction`
- PR #343: `fix: exclude NULL product_title from top_products analytics`
- PR #345: `fix: add missing transaction_type to stock_transactions INSERTs`

### 📁 Key Files Added/Modified

#### Migrations
- `20251212_fix_claim_inventory_sync_ambiguous_column.sql`
- `20251213_fix_accessory_variant_matching.sql`
- `20251213b_analytics_rpcs.sql`
- `20251213c_staff_stage_performance_rpc.sql`
- `20251213140000_fix_app_role_qualified_refs.sql`
- `20251214_fix_pos_accessory_separator.sql`
- `20251214100000_exclude_null_from_top_products.sql`
- `20251214110000_fix_stock_transaction_type.sql`

#### Frontend
- `src/components/BannosAnalyticsPage.tsx` - Real data integration
- `src/components/FlourlaneAnalyticsPage.tsx` - Real data integration
- `src/components/StaffAnalyticsPage.tsx` - New Staff Performance tab
- `src/lib/rpc-client.ts` - New analytics RPC functions

### 🔧 Technical Details

#### New Analytics RPCs
| RPC | Purpose |
|-----|---------|
| `get_store_analytics` | Revenue, orders, avg value, pending today |
| `get_revenue_by_day` | Daily revenue/order chart data |
| `get_top_products` | Top N products by order count |
| `get_weekly_forecast` | Orders by day of week with status |
| `get_delivery_breakdown` | Pickup vs Delivery distribution |
| `get_staff_stage_performance` | Staff completions by stage |

#### Inventory Matching Logic
```
Online orders:  "Pink Glitter / 6" → extract "6" after "/"
POS orders:     "Blue + Metallic" → extract "Metallic" after "+"
Combined title: "Product Title" + " " + "Variant Value"
```

---

## v0.13.0-beta — Order Flow & Timestamp System Overhaul (2025-12-09)

### 🎯 Overview
Major overhaul of the order flow system, restoring critical timestamp logic that was accidentally removed, adding new stage start functionality for Covering and Decorating stages, and comprehensive system audit with documentation.

### ✨ New Features

#### Scanner Start/Complete Pattern (PR #320)

- Covering and Decorating stages now use first-scan-starts / second-scan-completes pattern
- Added `startCovering()` and `startDecorating()` RPC wrappers to frontend
- Updated `ScannerOverlay.tsx` to check timestamps before deciding which RPC to call
- Staff can now track when they START working on a stage, not just when they COMPLETE it

#### New Database Functions (PR #319)

- `start_covering(p_order_id, p_store)` - Sets `covering_start_ts` on first scan
- `start_decorating(p_order_id, p_store)` - Sets `decorating_start_ts` on first scan
- Both functions log to `stage_events` with `event_type='start'`

#### Order Flow Documentation

- Created comprehensive `docs/ORDER_FLOW_CHECKLIST.md`
- Documents all stages, timestamps, RPCs, and scanner behavior
- Verified all 7 sections of the order flow system

### 🐛 Critical Bugs Fixed

#### Timestamp Logic Restoration (PR #319 - Migration 089)

- **Issue**: Migration 053 accidentally removed timestamp logic from `complete_*` functions when adding `stage_events` logging
- **Impact**: Timestamps like `filling_complete_ts`, `covering_complete_ts`, etc. were never being set
- **Fix**: Restored timestamp setting in all `complete_*` UPDATE statements

#### Missing Start Timestamps (PR #319 - Migration 089)

- **Issue**: `covering_start_ts` and `decorating_start_ts` columns didn't exist
- **Fix**: Added both columns to `orders_bannos` and `orders_flourlane` tables

#### Print Barcode Not Setting Start Time (PR #319 - Migration 089)

- **Issue**: `print_barcode()` function had `filling_start_ts` logic commented out
- **Fix**: Restored the logic so first barcode print in Filling stage sets `filling_start_ts`

#### Stage Events Constraint (PR #319 - Migration 089)

- **Issue**: `stage_events.event_type` CHECK constraint didn't allow `'start'` value
- **Fix**: Updated constraint to include `'start'` event type

#### Queue Missing Timestamps (PR #320 - Migration 090)

- **Issue**: `get_queue` RPC didn't return `covering_start_ts` or `decorating_start_ts`
- **Fix**: Updated RPC to include these fields so scanner UI can make decisions

### 📋 PRs in This Release
- PR #319: `fix: restore timestamp logic for barcode printer and scanner`
- PR #320: `feat: wire up start_covering and start_decorating in scanner UI`

### 📁 Key Files Added/Modified

#### Migrations

- `supabase/migrations/089_restore_timestamp_logic.sql` - Restore all timestamp logic
- `supabase/migrations/090_add_start_timestamps_to_queue.sql` - Add timestamps to get_queue

#### Frontend

- `src/lib/rpc-client.ts` - Added `startCovering()` and `startDecorating()`
- `src/components/ScannerOverlay.tsx` - First-scan-starts / second-scan-completes logic

#### Documentation

- `docs/ORDER_FLOW_CHECKLIST.md` - Complete order flow verification checklist

### 🔧 Technical Details

#### Scanner Behavior After This Release

| Stage | First Scan | Second Scan |
|-------|------------|-------------|
| Filling | N/A (print_barcode sets start) | `completeFilling()` |
| Covering | `startCovering()` → sets `covering_start_ts` | `completeCovering()` |
| Decorating | `startDecorating()` → sets `decorating_start_ts` | `completeDecorating()` |
| Packing | N/A | `completePacking()` (single scan only) |

#### All RPCs are SECURITY DEFINER with

- Auth check (`auth.uid()` required)
- Order existence check
- Stage validation (idempotent - can't complete wrong stage)
- Timestamp setting
- Audit logging to `stage_events` and `audit_log`

---

## v0.12.0-beta — Inventory System & Cake Toppers (2025-12-08)

### 🎯 Overview
Major inventory system enhancements including Bill of Materials (BOM) management improvements, inventory consolidation to use the components table, and a new Cake Toppers inventory feature.

### ✨ New Features

**Cake Toppers Inventory (PR #310, #311, #312)**
- Added new `cake_toppers` table for tracking cake topper inventory
- Built dedicated Cake Toppers UI in the Inventory section
- Added delete functionality for cake toppers
- Fixed save hanging issue with proper async handling

**Bill of Materials (BOM) Improvements (PR #303, #304, #305, #307, #308)**
- Fixed BOM items not being saved when saving BOM
- Fixed BOM items not fetching when opening the editor
- Improved BOM dialog scroll layout with proper flex structure
- Keep Save button visible while scrolling through components

**Inventory Consolidation (PR #302)**
- Consolidated inventory tracking to use the `components` table as single source of truth
- Simplified data model for better maintainability

### 🐛 Bug Fixes

**Audit Log FK Violations (PR #301)**
- Fixed foreign key constraint violations when logging inventory changes
- Added graceful handling when user doesn't exist in `staff_shared` table

**Duplicate Migration Cleanup (PR #312)**
- Removed duplicate migration 081 that was causing deployment issues

### 📋 PRs in This Release
- PR #310: `feat: add cake toppers inventory table and UI (PR1)`
- PR #311: `fix: resolve cake toppers save hanging and add delete functionality`
- PR #312: `chore: remove duplicate migration 081`
- PR #309: `Claude/inventory system review`
- PR #308: `fix: fetch BOM items when opening editor`
- PR #307: `fix: BOM dialog scroll layout with proper flex structure`
- PR #305: `fix: BOM dialog scroll v2 - proper overflow handling`
- PR #304: `fix: BOM dialog scroll - keep Save button visible`
- PR #303: `fix: save BOM items when saving BOM`
- PR #302: `fix: consolidate inventory to use components table`
- PR #301: `fix: prevent inventory audit_log FK violations`

### 📁 Key Files Added/Modified
- `supabase/migrations/080_cake_toppers_table.sql` - New cake toppers table
- `src/components/inventory/CakeToppersInventory.tsx` - Cake toppers UI
- `src/components/inventory/BOMEditor.tsx` - BOM editing improvements
- `src/lib/rpc-client.ts` - New cake topper RPC functions

---

## v0.11.9-beta — Inventory Component Add/Edit Fix (2025-12-04)

### 🎯 Overview
Fixed critical bug in Inventory Components page where the "Add Component" and "Edit Component" forms would hang indefinitely with "Adding..." or "Saving..." buttons stuck, preventing any component management.

### 🐛 Critical Bugs Fixed

**RPC Call Hanging Issue (PR #295)**
- **Issue**: `upsertComponent` RPC call would intermittently hang, never resolving or sending a network request
- **Root Cause**: `upsertComponent` and `updateComponentStock` functions in `rpc-client.ts` were not wrapped with `withErrorHandling`, missing JWT refresh and retry logic
- **Fix**: Wrapped both functions with `withErrorHandling` wrapper to add:
  - JWT token refresh on expiration
  - Automatic retry logic
  - Standardized error handling
  - PostgreSQL error code mapping (added `ErrorCode.INV005` for duplicate SKU)

**Foreign Key Constraint Violation (PR #296)**
- **Issue**: `upsert_component` database function failed with `audit_log_performed_by_fkey` constraint violation
- **Root Cause**: Function tried to insert `auth.uid()` into `audit_log` without checking if user exists in `staff_shared` table
- **Fix**: Updated both `upsert_component` and `update_component_stock` to:
  - Check if user exists in `staff_shared` before audit log insert
  - Skip audit logging if user doesn't exist (graceful degradation)
  - Still complete the component operation successfully

**Button State Management Issues**
- **Issue**: "Adding..." and "Saving..." buttons would get stuck in loading state
- **Root Cause**: 
  1. `isSaving` state not reset when opening Add/Edit dialogs
  2. Edit form lacked duplicate submission guards
- **Fix**: 
  - Added `setIsSaving(false)` when opening Add/Edit dialogs
  - Added `isSaving` guard and disabled states to Edit form (matching Add form)
  - Added loading feedback ("Saving...") to Edit button
  - Added `type="button"` to prevent unintended form submissions

### 🔧 Technical Details

**Error Handling Enhancement**
```typescript
// Added to error-handler.ts
ErrorCode.INV005 = 'INV005' // Duplicate SKU or unique constraint violation

// Added to withErrorHandling in rpc-client.ts
case '23505': // PostgreSQL unique constraint violation
  appError = createError(ErrorCode.INV005, 'Duplicate entry...', ...)
```

**Database Function Safety Pattern**
```sql
-- Check if user exists before audit logging
IF v_user_id IS NOT NULL THEN
  SELECT EXISTS(
    SELECT 1 FROM public.staff_shared WHERE user_id = v_user_id
  ) INTO v_user_exists;
  
  IF v_user_exists THEN
    INSERT INTO public.audit_log (...) VALUES (...);
  END IF;
END IF;
```

### 📋 Files Modified
- `src/lib/rpc-client.ts` - Wrapped inventory RPCs with error handling, added PG error mapping
- `src/lib/error-handler.ts` - Added `ErrorCode.INV005` for duplicate SKU errors
- `src/components/inventory/ComponentsInventory.tsx` - Fixed button state management and duplicate submission protection
- `supabase/migrations/20251204082743_fix_inventory_audit_log.sql` - Safe audit logging pattern for both functions

### 📋 PRs in This Release
- PR #295: `fix: wrap inventory RPC calls with error handling to prevent hangs`
- PR #296: `fix: prevent audit_log foreign key constraint violations in inventory functions`

### 🔍 Lessons Learned
- **Stale Dev Servers**: Multiple debugging iterations were caused by running old dev server instances; always kill all processes and restart fresh
- **Browser Cache**: Hard refresh (Cmd+Shift+R) essential after code changes to load new JavaScript bundle
- **Environment Sync**: Verify testing environment (local vs production) and ensure code/database are in sync
- **Defensive Programming**: Always check foreign key constraints exist before inserting, use graceful degradation

---

## v0.11.8-beta — Edit Order Drawer Simplification (2025-12-02)

### 🎯 Overview
Simplified the Edit Order drawer by replacing complex searchable inputs with simple text fields, and fixed the broken "View Details in Shopify" button URL.

### 🔧 Changes

**Edit Order Drawer Simplification (PR #289)**
- **Product Field**: Changed from searchable combobox (`ProductCombobox`) to simple text input
- **Size Field**: Simplified to always show text input (removed variant dropdown logic)
- **Flavour Field**: Changed from dropdown to simple text input, now shows for both Bannos and Flourlane stores
- **Method & Storage**: Kept as dropdowns (unchanged)
- **Accessories & Notes**: Kept as free text (unchanged)

**View Details in Shopify Button Fix**
- **Issue**: Button used wrong URL format (`/orders/{number}`) and wrong ID type
- **Fix**: 
  - Use correct format: `https://admin.shopify.com/store/{slug}/orders/{id}`
  - Prefer `shopify_order_id` for direct link
  - Fallback to `shopify_order_number` with search query if ID unavailable
  - Added `shopifyOrderId` to `QueueItem` interface and data passthrough

### 🗑️ Code Removed (~100 lines)
- `ProductCombobox` component import
- `ProductData` imports (`Product`, `findProductByTitle`, `convertLegacySizeToVariant`)
- `getFlavours` RPC import and loading effect
- State variables: `sizeRequiresConfirmation`, `currentProduct`, `availableFlavours`
- Product change handler with variant validation
- Size confirmation logic

### 📋 Files Modified
- `src/components/EditOrderDrawer.tsx` (-158 lines, +65 lines)
- `src/components/QueueTable.tsx` (+2 lines)

### 📋 PRs in This Release
- PR #289: `fix: simplify Edit Order drawer fields and fix Shopify URL`

---

## v0.11.7-beta — Staff & Supervisor Workspace Fixes (2025-12-02)

### 🎯 Overview
Critical bug fixes for Staff Workspace and Supervisor Workspace "My Orders" sections. Both were incorrectly showing all orders instead of filtering by the logged-in user's assigned orders.

### 🐛 Critical Bugs Fixed

**Staff Workspace Filter (PR #287)**
- **Issue**: Staff Workspace showed 5 random unassigned orders instead of orders assigned to the logged-in staff member
- **Root Cause**: `getQueue()` calls missing `assignee_id` parameter, plus incorrect fallback logic
- **Fix**: 
  - Added `assignee_id: user.id` to all `getQueue()` and `getQueueCached()` calls
  - Removed client-side filtering and fallback logic that showed unassigned orders
  - Added user guard check in `loadStaffOrders()` function
  - Fixed stale closure bug in `useEffect` by adding `user?.id` to dependency array
- **Files Modified**: `src/components/StaffWorkspacePage.tsx`

**Supervisor Workspace Filter (PR #288)**
- **Issue**: Supervisor "My Orders" section showed 200 orders (all orders from both stores) instead of orders assigned to the supervisor
- **Root Cause**: Same bug as Staff Workspace - `getQueue()` calls missing `assignee_id` filter
- **Fix**:
  - Added `assignee_id: user.id` to `getQueue()` calls for both Bannos and Flourlane stores
  - Added user guard check in `loadSupervisorOrders()` function
  - Fixed `useEffect` dependency array to include `user?.id` (prevents stale closure)
  - Updated empty state message with helpful guidance
- **Files Modified**: `src/components/SupervisorWorkspacePage.tsx`

### 🔧 Technical Details

**Stale Closure Prevention**
Both workspaces had a `useEffect` with empty dependency array `[]` that captured the initial `loadOrders` function before `user` was loaded. This caused the auto-refresh interval to repeatedly call a stale version where `user?.id` was undefined. Fixed by:
1. Adding `if (!user?.id) return;` guard in useEffect
2. Adding `user?.id` to dependency array to re-establish interval when user loads

**Database-Level Filtering**
Orders are now filtered at the database level via the `p_assignee_id` parameter in the `get_queue` RPC, rather than client-side filtering. This is more efficient and respects RLS policies.

**Empty State Messages**
- Staff: "No orders assigned to you yet. Orders will appear here when a supervisor assigns them to you"
- Supervisor: "No orders assigned to you yet. Use the Queue buttons above to view and assign orders"

### 📋 PRs in This Release
- PR #287: `fix: filter staff workspace by logged-in user`
- PR #288: `fix: filter supervisor workspace by logged-in user`

---

## v0.11.6-beta — Order Monitoring System & Environment Configuration (2025-12-01)

### 🎯 Overview
Complete implementation of automated order monitoring system with email alerts, plus comprehensive bug fixes for dashboard auto-refresh, monitor displays, and webhook HMAC validation. This release adds critical production monitoring capabilities to detect when order processing stops.

### 🚀 Major Features Added

**Order Monitoring System (PR #284, #285)**
- **Edge Function**: `order-monitor` - Checks both stores for order processing stalls
- **Email Alerts**: Sends alert via Resend API when no orders processed in 2 hours
- **Cron Job**: Runs every 30 minutes via `pg_cron`
- **Configurable**: `ALERT_EMAIL` environment variable for alert recipient
- **Production Ready**: Comprehensive error handling, null count validation, pinned dependencies

**Monitoring Features:**
- Queries `orders_bannos` and `orders_flourlane` for orders in last 2 hours
- Sends email alert if either store has 0 orders (during business hours)
- Returns JSON with counts and alert status
- Validates environment variables with fail-fast error responses
- Checks database query errors and null counts

### 🐛 Critical Bugs Fixed

**Dashboard Auto-Refresh (PR #282)**
- **Duplicate Refresh Mechanisms**: Removed legacy `setInterval` in `Dashboard.tsx`
- **Background Polling**: Added `refetchIntervalInBackground: true` to TanStack Query hooks
- **Spinner Timing**: Fixed `handleRefresh` to await actual query completion
- **Issue**: PR #281 added `refetchInterval` but old `loadDashboardStats` still ran every 30s
- **Fix**: Removed entire legacy refresh system, updated header to use `useInvalidateDashboard`

**Monitor Display Format (PR #283)**
- **Wrong Order Numbers**: Kitchen monitors showed internal IDs (`bannos-25073`) not Shopify numbers (`#B25073`)
- **Root Cause**: Used `order.human_id` (internal format) instead of `shopify_order_number`
- **Fix**: Updated `BannosMonitorPage.tsx` and `FlourlaneMonitorPage.tsx` to prioritize `shopify_order_number`
- **Format**: Now displays `#B25073` for Bannos, `#F19070` for Flourlane

**HMAC Validation Logging (PR #281)**
- **Safe Rollout**: Added HMAC validation to Shopify webhook handlers (log-only, no blocking)
- **Issue**: HMAC validation was disabled after initial webhook stabilization
- **Fix**: Added `verifyHmac()` function to both webhook Edge Functions
- **Validation**: Logs `[HMAC] PASS` or `[HMAC] FAIL` with reason and order ID
- **Non-blocking**: Continues processing regardless of HMAC result (safe deployment)

### 🔧 Technical Details

**Order Monitor Edge Function** (`supabase/functions/order-monitor/index.ts`)
- Environment variable guards for `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Pinned supabase-js dependency to `@2.43.0` for reproducible builds
- Consolidated error checking for database queries (errors and null counts)
- Resend API error handling with status code checking
- Consistent `Content-Type: application/json` headers on all responses
- Comprehensive try/catch with detailed error logging

**Database Migration** (`supabase/migrations/20251201_order_monitor_cron.sql`)
- Creates `pg_cron` and `pg_net` extensions if not exist
- Schedules cron job every 30 minutes (`*/30 * * * *`)
- Uses `service_role_key` for proper authentication
- Calls order-monitor Edge Function via HTTP POST
- Documented limitation of hardcoded URLs in pg_cron (inherent constraint)

**Dashboard Changes** (`src/hooks/useDashboardQueries.ts`, `src/components/Dashboard.tsx`, `src/components/Header.tsx`)
- Added `DASHBOARD_REFETCH_INTERVAL = 30_000` constant
- Added `refetchInterval` and `refetchIntervalInBackground` to all dashboard queries
- Modified `useInvalidateDashboard` to use `queryClient.refetchQueries` and return Promise
- Removed legacy `loadDashboardStats` function and `setInterval` mechanism
- Updated `Header.tsx` to await `invalidateDashboard()` for accurate spinner timing

**Monitor Display Updates** (`src/components/BannosMonitorPage.tsx`, `src/components/FlourlaneMonitorPage.tsx`)
- Changed `humanId` assignment to prioritize `shopify_order_number`
- Format: `order.shopify_order_number ? \`#B\${order.shopify_order_number}\` : (order.human_id || order.id)`
- Ensures kitchen staff see readable order numbers instead of internal IDs

**HMAC Validation** (`supabase/functions/shopify-webhooks-bannos/index.ts`, `supabase/functions/shopify-webhooks-flourlane/index.ts`)
- Added `verifyHmac()` utility function using Web Crypto API
- Reads raw request body before parsing JSON
- Compares computed HMAC-SHA256 with `x-shopify-hmac-sha256` header
- Logs validation result with order context
- Non-blocking: continues processing regardless of validation result

### 🔐 Security & Configuration

**pg_cron URL Hardcoding**
- ⚠️ **Known Limitation**: pg_cron runs inside database and cannot access environment variables
- Hardcoded production URL required for cron job to call Edge Function
- Matches existing pattern used by `process-webhooks-bannos` and `process-webhooks-flourlane`
- Comprehensive documentation added to migration file explaining limitation
- Alternative approaches (Database Webhooks, GitHub Actions, client polling) not suitable for time-based monitoring

**Environment Variables**
- `ALERT_EMAIL` - Configurable alert recipient (defaults to `panos@bannos.com.au`)
- `RESEND_API_KEY` - Email sending via Resend API
- `SUPABASE_URL` - Database connection
- `SUPABASE_SERVICE_ROLE_KEY` - Database authentication
- `SHOPIFY_WEBHOOK_SECRET_BANNOS` - HMAC validation for Bannos webhooks
- `SHOPIFY_WEBHOOK_SECRET_FLOURLANE` - HMAC validation for Flourlane webhooks

### 📊 Production Results

**Order Processing (Last 2 Hours - 2025-12-01)**
- ✅ Bannos: 6 new orders processed
- ✅ Flourlane: 4 new orders processed
- ✅ Total: 10 orders successfully processed

**Webhook Processing**
- ✅ Bannos: 0 unprocessed, 909 total processed
- ✅ Flourlane: 0 unprocessed, 1,140 total processed
- ✅ No backlog - All webhooks caught up

**Cron Jobs (All Active)**
- ✅ `process-webhooks-bannos` - Every 2 minutes
- ✅ `process-webhooks-flourlane` - Every 2 minutes (offset 1 min)
- ✅ `order-monitor` - Every 30 minutes (NEW!)

**Edge Functions (All ACTIVE)**
- ✅ `shopify-webhooks-bannos` (v22) - HMAC logging enabled
- ✅ `shopify-webhooks-flourlane` (v22) - HMAC logging enabled
- ✅ `order-monitor` (v6) - Deployed with all error handling

### 🔗 References
- **PR #281**: feat: add HMAC validation logging for Shopify webhooks
- **PR #282**: fix: restore 30-second auto-refresh for dashboard queries
- **PR #283**: fix: prioritize shopify_order_number for monitor display
- **PR #284**: feat: add order monitoring with email alerts
- **PR #285**: fix: use ALERT_EMAIL env var and document pg_cron URL limitation
- **Merged**: 2025-12-01
- **Branches**: `feature/hmac-logging`, `fix/dashboard-auto-refresh`, `fix/monitor-display`, `feature/order-monitoring`, `fix/order-monitor-env-vars` → `dev`

### 🎯 Impact

**Before:**
- ❌ No monitoring for order processing failures
- ❌ Dashboard auto-refresh duplicated (wasteful API calls)
- ❌ Kitchen monitors showed cryptic internal IDs
- ❌ HMAC validation disabled (security concern)
- ❌ Manual refresh spinner timing inaccurate

**After:**
- ✅ Automated monitoring alerts if order processing stops
- ✅ Efficient single-source auto-refresh every 30 seconds
- ✅ Kitchen staff see readable order numbers (#B25073)
- ✅ HMAC validation logged for security auditing
- ✅ Refresh spinner accurately reflects loading state
- ✅ Comprehensive error handling prevents silent failures

**System Reliability:**
- ✅ Will detect and alert on order processing stalls within 30 minutes
- ✅ Email alerts sent to configurable recipient
- ✅ Database query failures caught and reported
- ✅ Null count validation prevents false negatives
- ✅ Resend API failures logged and handled

---

## v0.11.3-beta — Dashboard Performance & Monitor Display Fix (2025-11-27)

### 🎯 Overview
Major performance improvements to dashboard with TanStack Query implementation, eliminating loading flashes on tab switches. Fixed kitchen monitor displays to show readable order numbers for staff.

### ⚡ Performance Improvements
- **TanStack Query**: Replaced manual fetch/useState with React Query for all dashboard data
- **Stale-While-Revalidate**: Shows cached data instantly, refreshes in background
- **Shared Queries**: `MetricCards` and `ProductionStatus` share single cached request
- **Tab Prefetching**: Hovering over Bannos/Flourlane tabs preloads data before click
- **No Skeleton Flash**: Cached data displays immediately on tab switch

### 🐛 Bugs Fixed
- **Monitor Order Numbers**: Kitchen monitors showed `#Bbann...` instead of `#B25073`
- **Root Cause**: Used internal `order.id` (e.g., `bannos-25073`) instead of `shopify_order_number`
- **Shopify URL Fix**: Order drawer now opens correct Shopify admin URL using `shopify_order_id`

### 🔧 Technical Details

**New Files:**
- `src/lib/query-client.ts` - TanStack Query client configuration
- `src/hooks/useDashboardQueries.ts` - Custom hooks for dashboard data fetching

**Components Updated:**
- `App.tsx` - Added QueryClientProvider
- `DashboardContent.tsx` - Added tab prefetching on hover
- `MetricCards.tsx` - Migrated to useQueueStats hook
- `ProductionStatus.tsx` - Migrated to useQueueStats hook
- `UnassignedStations.tsx` - Migrated to useUnassignedCounts hook
- `RecentOrders.tsx` - Migrated to useRecentOrders hook, fixed Shopify URL
- `BannosMonitorPage.tsx` - Fixed order number display
- `FlourlaneMonitorPage.tsx` - Fixed order number display

### 🔗 References
- **PR #276**: perf: use cached RPC calls to reduce duplicate API requests
- **PR #277**: perf: implement TanStack Query for dashboard data fetching
- **PR #278**: fix: display correct order numbers in monitors and drawer
- **Merged**: 2025-11-27

---

## v0.11.2-beta — Order Accessories Storage & Display (2025-11-27)

### 🎯 Overview
Fix missing order accessories (candles, balloons, toppers) that were identified but never stored. Accessories now persist to database and display in order detail drawer. For split orders (multiple cakes), accessories attach to first order only.

### 🐛 Bug Fixed
- **Missing Accessories**: Order B24720 and others showed no accessories despite Shopify having candles/toppers
- **Root Cause**: `process-inbox` identified accessories but never stored them (collected but discarded)

### ✅ Added
- **Database Column**: `accessories jsonb` column on `orders_bannos` and `orders_flourlane`
- **Processor Update**: `formatAccessories()` helper populates accessories field
- **Split Order Logic**: Accessories only on first order (A) for multi-cake orders
- **UI Display**: `OrderDetailDrawer` now shows accessories from database

### 🔧 Technical Details

**Migrations Applied:**
- `072_add_accessories_column.sql` - Add `accessories jsonb` to both order tables
- `073_update_get_order_with_accessories.sql` - Update RPC to return accessories

**Edge Function Updated:**
- `process-inbox/index.ts` - Added `formatAccessories()` and populates field

**UI Updated:**
- `OrderDetailDrawer.tsx` - Displays accessories with variant info and quantity

**Backfill:**
- One-time SQL backfill populated accessories for existing orders from `order_json`

### 📊 Data Format
```json
[
  {"title": "Rainbow Tall Candles", "quantity": 1, "price": "4.90", "variant_title": null},
  {"title": "Metallic Rainbow Number Candles", "quantity": 1, "price": "4.50", "variant_title": "3"}
]
```

### 🔗 References
- **PR #273**: fix: store and display order accessories
- **Merged**: 2025-11-27

---

## v0.11.1-beta — Webhook Automation Documentation (2025-11-24)

### 🎯 Overview
Comprehensive documentation for webhook automation setup without hardcoded credentials. Provides safe alternatives for processing webhook backlog and automating future webhook processing using Supabase Database Webhooks.

### 📋 Documentation Added

#### New Guide: `docs/WEBHOOK_AUTOMATION_SETUP.md`
- Complete setup guide for webhook automation
- Explains security risks of hardcoded credentials in migrations
- Recommends Supabase Database Webhooks (environment-specific)
- Provides safe alternatives for backlog processing

### 🔒 Security Improvements

#### Why NOT pg_cron with hardcoded URLs:
- ❌ Cross-environment contamination (dev/staging calling production)
- ❌ Broken jobs on key rotation (hardcoded JWT becomes invalid)
- ❌ Security risk (credentials committed to version control)

#### Recommended Solution:
- ✅ Supabase Database Webhooks (configured per environment in dashboard)
- ✅ No hardcoded credentials
- ✅ Environment-specific (each env has own webhooks)
- ✅ Triggers immediately on new webhook inserts
- ✅ No cross-environment contamination

### 🔧 Alternative Solutions for Backlog

#### For Existing 1,141 Unprocessed Webhooks:

#### Option 1: Local Script
- Uses environment variables (`$SUPABASE_URL`, `$SUPABASE_ANON_KEY`)
- Includes validation for required environment variables
- No hardcoded production URLs

#### Option 2: GitHub Actions Workflow
- Uses GitHub Secrets for credentials
- Scheduled or manual trigger
- Environment-specific configuration

### 📊 Current Status

#### Backlog at time of documentation:
- Bannos: 454 unprocessed webhooks
- Flourlane: 687 unprocessed webhooks
- Total: 1,141 webhooks

#### Recommendation:
1. Set up Database Webhooks in Supabase Dashboard (for future webhooks)
2. Run manual backlog processing script until backlog is cleared
3. Once backlog is cleared, Database Webhooks handle all new orders automatically

### ✅ Testing Queries

#### Check unprocessed webhooks:
```sql
SELECT 
  'bannos' as store, COUNT(*) as unprocessed 
FROM webhook_inbox_bannos WHERE processed = false
UNION ALL
SELECT 'flourlane', COUNT(*) 
FROM webhook_inbox_flourlane WHERE processed = false;
```

#### Check recent orders (both stores):
```sql
SELECT 'bannos' as store, COUNT(*) as recent_orders 
FROM orders_bannos 
WHERE created_at > NOW() - INTERVAL '10 minutes'
UNION ALL
SELECT 'flourlane', COUNT(*) 
FROM orders_flourlane 
WHERE created_at > NOW() - INTERVAL '10 minutes';
```

### 📦 Files Added

- `docs/WEBHOOK_AUTOMATION_SETUP.md` - Complete automation setup guide (159 lines)

### 🔗 References

- **PR #267**: docs: enable automatic webhook processing
- **Merged**: 2025-11-24 05:19:23Z
- **Branch**: `feature/auto-webhook-processing` → `dev`

### 🎯 Impact

#### Before:
- ❌ Risk of hardcoded credentials in migrations
- ❌ Unclear how to automate webhook processing
- ❌ No guidance on safe backlog processing

#### After:
- ✅ Clear security guidelines documented
- ✅ Safe automation approach via Database Webhooks
- ✅ Multiple safe options for backlog processing
- ✅ No credentials in version control

---

## v0.11.0-beta — Inbox Processor with Image Extraction (2025-11-24)

### 🎯 Overview
Complete implementation of the webhook inbox processor that processes raw webhook payloads from `webhook_inbox_bannos` and `webhook_inbox_flourlane` tables into structured orders with product images fetched from Shopify Admin API. Handles both GraphQL (Bannos) and REST (Flourlane) webhook formats seamlessly.

### 🚀 Major Features Added

**Inbox Processor Edge Function** (`process-inbox`)
- Reads unprocessed webhooks from inbox tables
- Normalizes GraphQL webhooks to REST-like structure
- Extracts order data: customer name, product details, delivery info, notes
- Fetches product images from Shopify Admin API using variant IDs
- Creates orders in `orders_bannos` and `orders_flourlane` tables
- Handles order splitting for multi-quantity line items
- Marks webhooks as processed after successful creation

**Dual Format Support**
- **GraphQL Format** (Bannos Store):
  - Handles `lineItems.edges` structure
  - Converts GraphQL GIDs to numeric IDs
  - Maps `customAttributes` (`key`/`value`) to REST `properties` (`name`/`value`)
  - Extracts variant IDs from `gid://shopify/ProductVariant/...` format
- **REST Format** (Flourlane Store):
  - Handles standard `line_items` array
  - Uses native `variant_id` and `product_id` fields
  - Preserves properties in `name`/`value` format

**Image Fetching System**
- Queries Shopify Admin API GraphQL endpoint
- Uses `productVariant(id:)` query to get product images
- Fetches `originalSrc` (full-resolution image URL)
- Stores image URL in `product_image` column
- **Success Rate**: 100% for both stores

### 🐛 Critical Bugs Fixed

**1. Wrong Field Names for Variant ID**
- **Problem**: Passing `product_id` instead of `variant_id` for REST webhooks
- **Fix**: Check both `cakeItem.variant_id` (REST) and `cakeItem.product_id` (GraphQL normalized)
- **Impact**: Flourlane images now fetch correctly

**2. GraphQL customAttributes Field Mismatch**
- **Problem**: GraphQL uses `{key, value}` but code expected `{name, value}`
- **Fix**: Map `customAttributes` to `properties` with proper field transformation
- **Impact**: Future GraphQL webhooks with properties will extract correctly

**3. shopify_order_id Type Mismatch**
- **Problem**: Attempting to store GID string (`gid://shopify/Order/...`) in `bigint` column
- **Fix**: Extract numeric ID from GID using regex `.match(/\d+/)?.[0]`
- **Impact**: Orders now insert successfully without type errors

**4. Missing item_qty Field**
- **Problem**: `item_qty` column always NULL despite existing in schema
- **Fix**: Set `item_qty: 1` for all orders (each represents 1 unit)
- **Impact**: Quantity tracking now functional

**5. Unhelpful Error Messages**
- **Problem**: Errors logged as `[object Object]`
- **Fix**: Serialize error objects to JSON strings in error handler
- **Impact**: Database errors now visible and actionable

### ✅ Data Quality

**Bannos Store (GraphQL format)**
- ✅ 100% success rate processing webhooks
- ✅ 100% image fetch success rate (recent orders)
- ✅ All required fields populated correctly
- ✅ `shopify_order_id` extracted from GID format
- ✅ Ready for customAttributes when present

**Flourlane Store (REST format)**
- ✅ 100% success rate processing webhooks
- ✅ 100% image fetch success rate (recent orders)
- ✅ Flavour data extracted correctly (e.g., "Writing On Cake: ...")
- ✅ All required fields populated correctly
- ✅ `shopify_order_id` as native numeric ID

### 🔧 Technical Details

**Order Splitting Logic**
- Identifies cake items vs accessories
- Splits multi-quantity line items into separate orders
- Suffixes: A, B, C, D... for multiple cakes
- Total amount only on first order (A)
- Each split order gets `item_qty: 1`

**Field Mapping**
- `customer_name` - From customer object or shipping address
- `product_title` - From first cake line item
- `flavour` - From line item properties
- `size` - From variant title
- `delivery_method` - "Pickup" or "Delivery" based on shipping address
- `delivery_date` - From note attributes or tags
- `product_image` - Fetched from Shopify Admin API
- `item_qty` - Always 1 (split orders represent 1 unit each)
- `order_json` - Complete normalized webhook payload

**Shopify Admin API Integration**
- Query: `productVariant(id: $id) { product { images(first: 1) { edges { node { originalSrc } } } } }`
- Authenticated with `SHOPIFY_ADMIN_TOKEN_BANNOS` and `SHOPIFY_ADMIN_TOKEN_FLOURLANE`
- Constructs GID: `gid://shopify/ProductVariant/${variantId}`
- Returns full-resolution image URL from Shopify CDN

### 📊 Production Results

**Last Hour (Nov 24, 2025)**
- **Bannos**: 23 orders processed, 73.9% with images, 26.1% with item_qty
- **Flourlane**: 23 orders processed, 78.3% with images, 26.1% with item_qty
- **Recent orders (after fix)**: 100% success rate for both stores

**Sample Orders Verified**
- Bannos: `bannos-23798` (Claire Johnston - kPop Demon Birthday Cake)
- Flourlane: `flourlane-18316` (Tyra Mcrae - Fancy Ribbon Vintage Burgundy Cake)
- All fields populated: customer, product, image, delivery method, item_qty

### 🔐 Security & Configuration

**Environment Variables Required**
- `SHOPIFY_ADMIN_TOKEN_BANNOS` - Shopify Admin API token for Bannos store
- `SHOPIFY_ADMIN_TOKEN_FLOURLANE` - Shopify Admin API token for Flourlane store
- Both stores can use identical token (multi-store access token)

**RLS & Permissions**
- Processor runs with service role (bypasses RLS)
- Writes to orders tables via direct inserts
- Reads from inbox tables without restrictions
- Admin API tokens stored in environment variables (not database)

### 📦 Files Modified

**New Edge Function**
- `supabase/functions/process-inbox/index.ts` - Complete processor implementation

**Key Functions**
- `normalizeWebhook(payload)` - Converts GraphQL to REST structure
- `fetchProductImage(variantId, store)` - Queries Shopify Admin API
- `processOrderItems(shopifyOrder, store)` - Handles order splitting
- `isCakeItem(item)` - Categorizes line items
- `extractCustomerName()`, `extractDeliveryDate()`, `extractDeliveryMethod()`, etc.

### 🎯 Integration

**Manual Trigger**
```bash
curl -X POST https://{project}.supabase.co/functions/v1/process-inbox \
  -H "Authorization: Bearer {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{"store": "bannos", "limit": 10}'
```

**Automated Processing** (Future)
- Cron job to run every 5 minutes
- Processes all unprocessed webhooks
- Marks successful webhooks as processed
- Logs errors for manual review

### ✅ Quality Assurance

- ✅ Type check passes (`npm run type-check`)
- ✅ No linter errors
- ✅ Both stores tested end-to-end
- ✅ Image fetching working 100%
- ✅ All required fields populated
- ✅ Order splitting logic verified
- ✅ Error handling comprehensive

### 📈 Impact

**Before This Release**
- Webhooks sat unprocessed in inbox tables
- No product images in orders
- Manual order creation required
- No GraphQL webhook support

**After This Release**
- ✅ Automatic webhook processing
- ✅ Product images fetched automatically
- ✅ Both GraphQL and REST formats supported
- ✅ Complete order data extraction
- ✅ 100% success rate for both stores
- ✅ Ready for production automation

### 🔗 References

- **PR #265**: feat: add inbox processor with image extraction
- **Merged**: 2025-11-24 04:18:03Z
- **Branch**: `feature/inbox-processor` → `dev`
- **Commits**: 14 commits squash-merged with all bug fixes

### 🎉 MASSIVE WIN

This completes the webhook processing pipeline:
1. ✅ Shopify webhooks → inbox tables (never-fail handlers)
2. ✅ Inbox processor → structured orders (this release)
3. ✅ Product images → Shopify Admin API (this release)
4. ✅ Dual format support → GraphQL + REST (this release)

**The system is now fully automated for order ingestion from both Shopify stores!**

---

## v0.10.4-beta — Post-PR #233 Cleanup & Production Metrics Fix (2025-11-13)

### 🎯 Overview
Follow-up fixes after PR #233 (auth flickering). Cleaned up TypeScript errors, optimized React dependencies to prevent unnecessary re-renders and stale closures, and fixed Production Status metrics to show only assigned orders (active work) instead of all orders.

### 🐛 Bugs Fixed

**PR #234: TypeScript Cleanup**
1. **Unused `didRoute` state variable** - Removed from RoleBasedRouter
2. **Unused `role` parameter** - Removed from `redirectToRoleLanding` function
- Fixed 2 TypeScript TS6133 errors introduced in PR #233

**PR #235: React Dependency Optimizations (4 bugs)**
1. **Unnecessary Re-renders (App.tsx)** - Removed `children` from FadeTransition dependency array
   - Children change on every parent render causing effect to run unnecessarily
2. **Double-Fetch Loop (QueueTable.tsx)** - Removed `hasInitiallyLoaded` from fetchQueueData deps
   - State change triggered infinite fetch loop
3. **Stale Closure (QueueTable.tsx)** - Converted `hasInitiallyLoaded` from state to ref
   - Callback always saw stale `false` value, showed wrong loading UI
4. **Stale Loading State on Store Switch** - Reset ref when store changes
   - Switching Bannos ↔ Flourlane showed subtle refresh instead of full skeleton

**PR #236: Production Status Metrics**
- **Misleading "In Production" counts** - Production Status showed ALL orders (assigned + unassigned)
- Updated `get_queue_stats` RPC to count only assigned orders (`AND assignee_id IS NOT NULL`)
- Production Status now shows actual active work, not waiting work

### ✅ Added
- Migration `067_fix_production_status_counts.sql` - Fixed stage count queries
- Debug logging system for React dependency issues (removed after fix)
- Ref-based pattern for `hasInitiallyLoaded` to prevent stale closures

### ❌ Removed
- Unused `didRoute` state variable and setters (2 locations)
- Unused `role` parameter from `redirectToRoleLanding()`
- `children` from FadeTransition dependency array
- `hasInitiallyLoaded` state (converted to ref)
- Debug SQL queries and console logs after verification

### 🔧 Changed
- **App.tsx**: Simplified router logic, removed unused variables
- **QueueTable.tsx**: Ref-based loading state with store change reset
- **get_queue_stats RPC**: Stage counts now filter by `assignee_id IS NOT NULL`

### 📊 Impact

**Before Fix:**
- Production Status: "Filling: 15 units" (misleading - all unassigned)
- Status badge: "Active" (wrong - nothing being produced)
- Metrics: "In Production: 15" (includes waiting orders)

**After Fix:**
- Production Status: "Filling: 0 units" (correct - no assigned orders)
- Will show "5 units" when 5 orders are assigned
- Metrics: "In Production: 0" (only counts active work)
- Clearer distinction between waiting vs active work

### 🔧 Technical Details
- **Migrations**: `067_fix_production_status_counts.sql`
- **Files Modified**: 
  - `src/App.tsx` - Removed unused variables (PR #234)
  - `src/components/QueueTable.tsx` - Ref pattern and store reset (PR #235)
  - `supabase/migrations/042_queue_orders.sql` - Updated via migration 067 (PR #236)
- **Components Affected**:
  - ProductionStatus.tsx - Shows accurate active work counts
  - MetricCards.tsx - "In Production" metric more meaningful
  - Dashboard displays - Clearer production vs waiting distinction

### 📦 Files Changed
- `src/App.tsx` - TypeScript cleanup (6 deletions, 2 insertions)
- `src/components/QueueTable.tsx` - Ref pattern and optimizations (10 insertions, 6 deletions)
- `supabase/migrations/067_fix_production_status_counts.sql` - Production metrics fix

### 🔗 References
- PR #234: TypeScript cleanup
- PR #235: React optimizations (merged after conflict resolution and dependency fixes)
- PR #236: Production status metrics fix
- Base: PR #233 (auth flickering - completed before session)

---

## v0.10.3-beta — React Performance: Fix Stale Closures & Hard Reloads (2025-11-13)

### 🎯 Overview
Fix critical React hooks issues causing app to require manual refreshes. Resolves stale closures in data fetch functions, adds JWT auto-recovery, removes hard reloads after auth transitions, and fixes messaging race conditions. Users can now navigate and update data seamlessly without manual page refreshes.

### 🐛 Critical Issues Fixed

**1. Dashboard Stats Stale Closure**
- `loadDashboardStats` not wrapped in useCallback
- 30-second interval called old function version
- Stats didn't update without manual refresh
- **Fix**: Wrapped in useCallback with stable dependencies

**2. QueueTable Stale Closure**  
- `fetchQueueData` missing from useEffect dependencies
- Queue didn't refresh when filters changed
- **Fix**: Wrapped in useCallback with `[store, storageFilter, showErrorWithRetry]`

**3. JWT Expiry Forced Manual Refresh**
- Session expiry threw error requiring page reload
- No auto-recovery mechanism
- **Fix**: Added `supabase.auth.refreshSession()` before failing

**4. Messaging Stale Closures**
- loadConversations, loadMessages, loadUnreadCount recreated on every render
- eslint-disable comments hid real dependency issues
- **Fix**: Wrapped all in useCallback, removed eslint-disable, proper dependencies

**5. Hard Reloads Lost App State**
- `window.location.reload()` after sign-in/sign-out
- Heavy-handed navigation losing state
- **Fix**: React state updates and PopStateEvent for navigation

**6. Ineffective Debounce Pattern**
- Debounce returned cleanup but caller didn't use it
- Multiple timeouts fired instead of just one
- **Fix**: useRef to track and clear previous timeout

**7. Memory Leaks from Unmounted Timers**
- Debounce timer not cleaned up on unmount
- setTimeout fired after component destroyed
- **Fix**: Added useEffect cleanup for timer

**8. Stale Message Updates (Race Condition)**
- Earlier loadMessages could overwrite newer conversation
- Fast switching showed wrong messages
- **Fix**: useRef to track selected conversation, guard state updates

### ✅ Added
- Automatic JWT session refresh in RPC error handler
- useCallback wrappers for all data-fetching functions
- useRef pattern for proper debounce implementation
- Cleanup effects for timers to prevent memory leaks
- Stale state guards for async operations

### ❌ Removed
- window.location.reload() calls (3 locations)
- eslint-disable-next-line comments for exhaustive-deps
- Duplicate function definitions in messaging components
- Duplicate updateAuthState calls in auth.ts

### 🔧 Changed
- loadDashboardStats: async function → useCallback
- fetchQueueData: async function → useCallback  
- Messaging functions: async functions → useCallback
- Navigation: hard reload → PopStateEvent
- JWT error message: "refresh page" → "sign in again"

### 📊 Impact
- ✅ App updates automatically without manual refresh
- ✅ 30-second stat intervals work correctly
- ✅ JWT tokens auto-refresh seamlessly
- ✅ Auth transitions smooth (no reload jarring)
- ✅ Messaging updates in real-time
- ✅ No memory leaks from abandoned timers
- ✅ No stale data from race conditions

### 🔧 Technical Details
- **Migration**: None (frontend-only changes)
- **Files Modified**: 8 files
  - Dashboard.tsx, QueueTable.tsx
  - MessagesPage.tsx, MainDashboardMessaging.tsx
  - rpc-client.ts, auth.ts
  - StaffPage.tsx, ProtectedRoute.tsx

### 📦 Files Changed
- `src/components/Dashboard.tsx` - useCallback for loadDashboardStats
- `src/components/QueueTable.tsx` - useCallback for fetchQueueData
- `src/lib/rpc-client.ts` - JWT auto-recovery with refreshSession()
- `src/components/messaging/MessagesPage.tsx` - useCallback wrappers, debounce fix
- `src/components/MainDashboardMessaging.tsx` - useCallback wrappers, debounce fix
- `src/lib/auth.ts` - Remove hard reload after signOut
- `src/components/StaffPage.tsx` - PopStateEvent navigation
- `src/components/Auth/ProtectedRoute.tsx` - Remove reload after login

### 🔗 References
- PR #230 (merged to dev, 8 commits)
- Issue: Users reporting frequent need to manually refresh app

---

## v0.10.2-beta — Weekly Calendar Monitors for Kitchen Displays (2025-11-13)

### 🎯 Overview
Implement weekly calendar monitors for Bannos and Flourlane kitchen wall displays. Replaces mock data with real orders from get_queue RPC, displays orders as stage-colored pills grouped by due date across a Monday-Sunday weekly view.

### ✅ Added
- **Weekly Calendar Layout**: 7-day grid (Monday-Sunday) with vertical separators
- **Real Data Integration**: Fetches orders via `getQueue` RPC (limit 5000)
- **Stage-Colored Pills**: Order badges colored by production stage
  - Filling → Blue
  - Covering → Purple
  - Decorating → Pink
  - Packing → Orange
  - Complete → Green
- **Week Navigation**: Arrow buttons to navigate previous/next weeks
- **Dynamic Date Range**: Header updates to show current week dates
- **New Year Week Handling**: Shows both years when week spans New Year (e.g., "Dec 29, 2025 - Jan 04, 2026")
- **Timezone-Safe Dates**: Uses local timezone formatting instead of UTC
- **Auto-Reset**: Returns to current week when switching between monitors
- **Structured Error Logging**: Includes RPC name, store, date range, error details

### 🐛 Critical Bugs Fixed

**1. Timezone Date Shifts**
- toISOString() caused date shifts in non-UTC timezones
- **Fix**: formatDateLocal() using getFullYear(), getMonth(), getDate()

**2. Missing Orders (500 Limit)**
- Only first 500 orders fetched, future weeks empty
- **Fix**: Increased limit to 5000, added date range filtering

**3. Duplicate API Calls on Mount**
- First useEffect set state triggering second useEffect
- **Fix**: Removed redundant useEffect

**4. Invalid Date Handling**
- No validation for malformed due_date timestamps
- **Fix**: Check Number.isNaN(due.getTime()) before processing

**5. Loading Layout Shift**
- Skeleton used gap-4 but content used gap-1
- **Fix**: Matched skeleton grid spacing

**6. Order Date UTC Mismatch**
- Compared UTC order dates with local week boundaries
- **Fix**: Convert order.due_date to local before comparison

### ❌ Removed
- All mock data arrays (bannosWeekData, flourlaneWeekData)
- Unused priority/status helpers (getPriorityColor, getStatusIcon)
- Delivery time displays (not in system)
- stats prop from monitor components

### 🔧 Changed
- Monitor view: Card-based layout → Calendar grid layout
- Data source: Mock arrays → getQueue RPC
- Date display: Static "Sep 01 - Sep 06" → Dynamic current week
- Order pills: Large cards with details → Compact colored badges
- Grid: 6 columns → 7 columns (Mon-Sun)

### 📊 Impact
- ✅ Kitchen monitors show real orders from database
- ✅ Orders grouped by actual due dates
- ✅ Week navigation for planning future/past weeks
- ✅ Stage colors match existing UI design patterns
- ✅ Timezone-safe (works in any timezone)
- ✅ Handles New Year week transitions properly
- ✅ No layout shifts during loading

### 🔧 Technical Details
- **Data Flow**: getQueue RPC → Group by due_date → Display in week grid
- **Date Calculations**: getCurrentWeekStart(), getWeekDates(), formatDateLocal()
- **Color System**: Uses existing stage color classes (bg-50, border-200, text-700, dot-500)
- **Performance**: Fetches 5000 orders once, filters client-side by week
- **State Management**: currentWeekStart state triggers refetch on navigation

### 📦 Files Changed
- `src/components/BannosMonitorPage.tsx` - Complete rebuild (405→295 lines)
- `src/components/FlourlaneMonitorPage.tsx` - Complete rebuild (397→295 lines)
- `src/components/Dashboard.tsx` - Remove stats prop

### 🔗 References
- PR #229 (merged to dev, single clean commit)
- Issue: Monitors not functional, showing mock data only

---

## v0.10.1-beta — RLS Coverage Complete: System Tables (2025-11-12)

### 🎯 Overview
Complete 100% RLS coverage by enabling Row-Level Security on remaining system tables (component_txns, processed_webhooks, dead_letter, work_queue, users). Eliminates all Supabase Studio Advisor "RLS Disabled" warnings and ensures comprehensive database security across entire public schema.

### ✅ Added
- **RLS on System Tables**:
  - `component_txns` - Admin-only transaction history (2 policies)
  - `processed_webhooks` - Admin-only webhook tracking (2 policies)
  - `dead_letter` - Admin-only error queue (2 policies)
  - `work_queue` - Admin-only job monitoring (2 policies)
  - `users` - Users see own, Admin sees all (4 policies, conditional)
- **Table Permissions**: GRANT statements for all system tables

### 🔒 Security Model
- **Admin**: Can view all system tables (debugging, monitoring)
- **Supervisor/Staff**: No access to system tables (internal use only)
- **Service Role**: Bypasses RLS automatically (Edge Functions, workers)

### 📊 Impact
- ✅ 100% RLS coverage on public schema (all tables protected)
- ✅ No more Supabase Advisor warnings for missing RLS
- ✅ System tables Admin-only (Staff cannot query via console)
- ✅ Complete defense-in-depth security
- ✅ Edge Functions and workers unaffected (service role bypass)

### 🔧 Technical Details
- **Migration**: `066_rls_remaining_tables.sql` (283 lines)
- Uses `current_user_role()` helper (consistent with migration 065)
- Conditional checks for optional tables (safe for all environments)
- Idempotent (safe to run multiple times)
- All policies block direct writes (service role only)

### 📦 Files Changed
- `supabase/migrations/066_rls_remaining_tables.sql` - System tables RLS
- `PR_RLS_REMAINING_TABLES.md` - PR documentation

### 🔗 References
- Migration 065: Core tables RLS
- Migration 058: Inventory tables RLS (already had some coverage)
- PR #226 (merged to dev)

---

## v0.10.0-beta — Task 16: Row-Level Security (RLS) Implementation (2025-11-12)

### 🎯 Overview
Complete implementation of Row-Level Security (RLS) on all core database tables with role-based access control. Adds defense-in-depth security at the database layer to prevent unauthorized data access even if UI security is bypassed (developer console, compromised credentials). Migration includes 2 SECURITY DEFINER helper functions, 44 RLS policies across 15+ tables, and comprehensive GRANT statements.

### ✅ Added
- **Helper Functions** (SECURITY DEFINER to prevent infinite recursion):
  - `current_user_role()` - Returns user's role without triggering RLS
  - `is_conversation_participant(uuid)` - Checks conversation membership without recursion
- **RLS Policies on Core Tables**:
  - `orders_bannos`, `orders_flourlane` - Role-based SELECT/UPDATE/DELETE (4 policies each)
  - `settings` - Admin/Supervisor read, Admin write (2 policies)
  - `staff_shared` - Users see own record, Admin sees all (2 policies)
  - `audit_log` - Admin read-only, authenticated insert, immutable (4 policies)
- **RLS Policies on System Tables**:
  - `webhook_inbox_bannos`, `webhook_inbox_flourlane` - Admin only (2 policies each)
  - `shopify_sync_runs` - Admin only (2 policies)
  - `boms`, `bom_items` - All read, Admin write (4 policies each)
- **RLS Policies on Messaging Tables** (conditional if exist):
  - `conversations` - Participant-scoped access (1 policy)
  - `messages` - Participant-scoped access (1 policy)
  - `conversation_participants` - Privacy-protected (2 policies)
  - `message_reads` - Privacy-protected (2 policies)
- **RLS Policies on Optional Tables** (conditional if exist):
  - `components` - All read, Admin write (4 policies)
  - `order_photos` - All read, RPC write (4 policies)
- **Table Permissions** - GRANT statements for all protected tables

### 🔒 Security Model
- **Admin**: Full access to all tables (SELECT/UPDATE/DELETE)
- **Supervisor**: View/manage all orders, read-only settings
- **Staff**: View/update assigned orders only, no access to settings/audit logs
- **Service Role**: Automatically bypasses RLS (Edge Functions, webhooks)

### 🐛 Critical Bugs Fixed (8 total)
1. **Missing Tables**: audit_log doesn't exist in all environments
   - Fixed: Wrapped in conditional `DO $$ IF EXISTS` check
2. **Infinite Recursion #1**: staff_shared policies querying staff_shared
   - Fixed: Created `current_user_role()` SECURITY DEFINER helper
3. **Infinite Recursion #2**: conversation_participants self-reference
   - Fixed: Created `is_conversation_participant()` SECURITY DEFINER helper
4. **FOR ALL Blocking**: `FOR ALL` policies blocking SELECT operations
   - Fixed: Split into separate INSERT/UPDATE/DELETE policies
5. **Privacy Leak**: conversation_participants missing RLS
   - Fixed: Added participant-scoped SELECT policy
6. **Privacy Leak**: message_reads missing RLS
   - Fixed: Added participant-scoped SELECT policy
7. **Staff Recursion**: staff_shared policies still had inline subqueries
   - Fixed: All policies now use helper functions
8. **Missing Permissions**: No table-level GRANT statements
   - Fixed: Added GRANT SELECT/INSERT/UPDATE/DELETE for all tables

### 🛡️ Attack Scenarios Prevented
1. ✅ Staff cannot see unassigned orders via developer console
2. ✅ Staff cannot view Shopify API tokens in settings
3. ✅ Staff cannot delete or modify audit trail
4. ✅ Staff cannot enumerate conversation participants
5. ✅ Staff cannot view message read status of others
6. ✅ External hacker with Staff credentials = contained damage

### 🔧 Technical Details
- **Migration**: `065_enable_rls.sql` (688 lines)
- **Helper Functions**: Use SECURITY DEFINER to bypass RLS and prevent recursion
- **Policy Pattern**: Separate policies for SELECT/INSERT/UPDATE/DELETE (no FOR ALL)
- **GRANT Statements**: Required alongside RLS policies for operations to succeed
- **Scanner Compatibility**: Staff can UPDATE assigned orders (RPCs need this)
- **Service Role Bypass**: Edge Functions automatically bypass all RLS

### ✅ Quality Assurance
- Migration is idempotent (uses `DO $$` blocks, `IF NOT EXISTS` checks)
- All 8 critical bugs caught and fixed during review
- Zero recursion (verified with helper function architecture)
- Comprehensive testing checklist provided
- Rollback script documented

### 📊 Impact
- ✅ Database-level access control now active
- ✅ API tokens visible to Admin/Supervisor only
- ✅ Audit logs tamper-proof (no deletes, Admin read-only)
- ✅ Staff workspace scanner operations still work
- ✅ Edge Functions and webhooks unaffected (service role bypass)
- ✅ Compromised Staff account damage limited to assigned orders

### 📦 Files Changed
- `supabase/migrations/065_enable_rls.sql` - Complete RLS implementation
- `PR_TASK_16_RLS.md` - PR documentation with verification steps

### 🔗 References
- Master_Task.md - Task 16: Enable RLS Policies ✅
- PR #224 (merged to dev, 8 commits with bug fixes)

---

## v0.9.9-beta — Task 12: Shopify Admin API Order Sync (2025-11-11)

### 🎯 Overview
Complete fix of Task 12 Shopify Integration with Admin API order sync. Removed unnecessary catalog sync (BOMs handle inventory), switched from Storefront API to Admin API, and resolved 7 critical bugs discovered during implementation and review.

### ✅ Added
- **Admin API Token Validation**: `test_admin_token(p_store, p_token)` RPC
  - Validates Shopify Admin API access token
  - Tests token with shop query
  - Returns shop metadata (name, email, domain, currency)
  - Creates sync run record for audit trail
- **Order Sync from Shopify**: `sync_shopify_orders(p_store)` RPC
  - Fetches unfulfilled orders from Shopify Admin API
  - Filters by due date tags (future orders only)
  - Skips past-due and existing orders
  - Inserts to webhook_inbox for processing
  - Returns detailed sync statistics
- **Sync History Tracking**: `get_sync_log(p_store, p_limit)` RPC
  - Query past sync operations
  - View success/error status and counts
- **Edge Functions (Complete)**:
  - `test-shopify-token` - Admin API validation with shop query
  - `sync-shopify-orders` - Order sync with pagination and filtering
- **Frontend Integration**:
  - Settings page "Test Admin API Token" button
  - Settings page "Sync Orders" button with progress tracking
  - RPC client functions invoke Edge Functions properly

### 🐛 Critical Bug Fixes (7 total)
1. **Timezone Drift**: Due dates appear past due in negative UTC offset timezones
   - Fixed: Use `setUTCHours()` instead of `setHours()` for consistent UTC comparison
2. **Order Sync Silent Failure**: Edge Function never invoked
   - Fixed: Frontend now calls `supabase.functions.invoke('sync-shopify-orders')`
3. **Token Test Incomplete**: Edge Function never invoked
   - Fixed: Frontend now calls `supabase.functions.invoke('test-shopify-token')`
4. **Body Consumption (test-shopify-token)**: Error tracking broken by `req.clone().json()`
   - Fixed: Parse `run_id` outside try block, reuse in catch handler
5. **Body Consumption (sync-shopify-orders)**: Error tracking broken by `req.clone().json()`
   - Fixed: Parse `run_id` outside try block, reuse in catch handler
6. **Order Number Corruption**: `.replace('#', '').replace('B', '')` corrupts order #1B23 → 123
   - Fixed: Use regex `.replace(/^#?B?/, '')` to only remove leading prefix
7. **Outdated API Version**: Hardcoded 2024-10 (no longer supported)
   - Fixed: Configurable via `SHOPIFY_API_VERSION` env var, defaults to 2025-01

### ❌ Removed
- **Catalog Sync**: Removed `connect_catalog()` RPC (not needed - BOMs handle inventory)
- **Storefront API**: Removed `test_storefront_token()` RPC (wrong API)
- **UI Clutter**: Removed "Connect & Sync Complete Catalog" button from Settings

### 🔧 Changed
- **Token Storage Key**: Uses `'shopifyToken'` (matches webhook configuration)
- **API Endpoint**: Admin API GraphQL (`/admin/api/{version}/graphql.json`)
- **Store URLs**: Fixed to correct Shopify domains
  - Bannos: `bannos.myshopify.com`
  - Flourlane: `flour-lane.myshopify.com` (with hyphen)
- **Settings Page Labels**: Updated to reference Admin API (not Storefront)
- **RPC Client**: `testAdminToken()` replaces `testStorefrontToken()`
- **API Version**: Configurable with environment variable for easy upgrades

### 📋 Technical Details
- **Migration**: `063_fix_shopify_integration.sql`
- **Order Sync Flow**:
  1. Fetch ALL unfulfilled orders from Shopify (paginated)
  2. Parse due dates from tags (format: "Fri 14 Nov 2025")
  3. Filter: Skip orders without due dates, past-due, or already imported
  4. Insert to webhook_inbox for processing by existing webhook worker
  5. Update sync_runs table with detailed statistics
- **Token Test Flow**:
  1. Save token to settings table
  2. Test Admin API with shop query
  3. Return shop metadata on success
  4. Update sync_runs with validation result
- **Filtering Rules**:
  - ✅ Import: Orders with future due dates
  - ❌ Skip: No due date in tags
  - ❌ Skip: Due date is today or past
  - ❌ Skip: Order already exists in database

### ✅ Quality Assurance
- All TypeScript checks pass
- Build successful (no new errors)
- 7 critical bugs identified and fixed
- Timezone-safe date handling
- Proper error tracking and recovery
- No request body consumption issues

### 🚀 Deployment
**Required:**
1. Apply migration: `supabase db push`
2. Deploy Edge Functions: `supabase functions deploy test-shopify-token sync-shopify-orders`

**Optional Configuration:**
- Set `SHOPIFY_API_VERSION` environment variable for custom API version (defaults to 2025-01)

### 📊 Impact
- ✅ Manual order import now functional for first-time setup
- ✅ Token validation actually works (not just stub)
- ✅ Timezone-safe filtering prevents incorrect "past due" skips
- ✅ Error tracking properly updates sync run status
- ✅ Order numbers preserved correctly (no corruption)
- ✅ Future API upgrades require only env var change
- ✅ No confusion about catalog sync (removed entirely)

### 📦 Files Changed
- `supabase/migrations/063_fix_shopify_integration.sql` - New RPCs
- `supabase/functions/test-shopify-token/index.ts` - Complete Admin API validation
- `supabase/functions/sync-shopify-orders/index.ts` - Order sync with all bug fixes
- `src/lib/rpc-client.ts` - Updated client functions with Edge Function invocation
- `src/components/SettingsPage.tsx` - UI updates for Admin API

**Initial Implementation:**
- **PR #217** - Admin API switch, 7 critical bugs fixed
- **PR #218** - Documentation updates

**Follow-up Bug Fixes (14 additional bugs found during testing):**
- **PR #219** - Settings data cross-contamination (6 bugs)
- **PR #220** - Status/UI cross-contamination + race conditions (5 bugs)
- **PR #221** - JSONB token extraction (2 bugs)
- **PR #222** - audit_log FK violation (1 bug)

**Total:** 21 bugs fixed, 6 PRs merged, 2 migrations (063, 064)

### 🐛 Complete Bug List (21 Total)

**From PR #217 (Implementation):**
1-7. Initial 7 bugs (timezone, Edge Function invocation, body consumption, order sanitization, API version)

**From PR #219 (Data Isolation):**
8. shopifyToken cross-contamination
9. flavours cross-contamination  
10. storage cross-contamination
11. monitor.density cross-contamination
12. monitor.autoRefresh cross-contamination
13. dueDates.defaultDue cross-contamination

**From PR #220 (Status Isolation):**
14. Sync status cross-contamination
15. hasUnsavedChanges persists
16. newBlackoutDate persists
17-18. Race conditions (in-flight requests)

**From PR #221 (Token Extraction):**
19. JSONB token not extracted
20. String(object) corruption

**From PR #222 (Database):**
21. audit_log FK violation

### 🔗 References
- Master_Task.md - Task 12 (21 bugs documented)
- TASK_12_FIX_COMPLETE.md - Initial implementation
- TASK_12_FINAL_STATUS.md - Complete verification

---

## v0.9.8-beta — Master Task Tier 1-2 + Partial Tier 3 (2025-11-08 to 2025-11-11)

### 🎯 Overview
Completed all Tier 1 (Critical) and Tier 2 (High Priority) tasks, plus 3 of 5 Tier 3 (Medium) tasks from Master_Task.md audit (Tasks 1-11, 13-15). This represents fixing all MVP blockers and implementing core feature set for production launch. Total: 14 tasks completed across 4 days. Task 12 documented separately in v0.9.9-beta due to extensive bug fixes. Task 16 (RLS Policies) remains in Tier 3 as not started.

### ✅ Tier 1: Critical Blockers (Tasks 1-6) - Nov 8-9

**Task 1: Update Order TypeScript Interface** (2025-11-08)
- Added missing fields to `QueueMinimalRow` and `CompleteMinimalRow` types
- Fields: `priority`, `assignee_id`, `storage`, `status`
- Impact: UI can now display priority badges, assignee names, storage chips, status indicators

**Task 2: Add Flavour Column** (2025-11-08)
- Migration `050_add_flavour_column.sql`
- Added `flavour` column to both `orders_bannos` and `orders_flourlane` tables
- Impact: Filling stage dropdown now saves flavour selection

**Task 3: Fix Stage Naming Drift** (2025-11-08)
- Fixed inconsistent stage names throughout UI
- Changed: `packaging` → `packing`, `quality` → removed, `ready` → `complete`
- Files: `QueueTable.tsx`, `Dashboard.tsx`, `types/db.ts`
- Impact: Queue grouping and stage progression now work correctly

**Task 4: Implement set_storage RPC** (2025-11-08)
- Migration `051_set_storage_rpc.sql`
- Created `set_storage(p_store, p_order_id, p_storage)` RPC
- Impact: Storage location feature now fully functional

**Task 5: Implement print_barcode RPC** (2025-11-09)
- Migration `054_print_barcode_rpc.sql`
- Created `print_barcode(p_store, p_order_id)` RPC
- Returns JSON payload for thermal printer
- Logs print events to stage_events table
- Impact: Barcode printing workflow now functional

**Task 6: Create stage_events Table** (2025-11-08)
- Migrations `052_stage_events_rebuild.sql`, `053_add_stage_events_logging.sql`
- Created production-ready `stage_events` table
- Updated 5 RPCs to log events: `complete_filling`, `complete_covering`, `complete_decorating`, `complete_packing`, `assign_staff`
- Impact: Analytics and timeline features now have proper data foundation

### ✅ Tier 2: High Priority Features (Tasks 7-11) - Nov 10

**Task 7: Verify Shift/Break RPCs** (2025-11-10)
- Migration `055_shifts_breaks_system.sql`
- Created `shifts` and `breaks` tables
- Implemented 5 RPCs: `start_shift`, `end_shift`, `start_break`, `end_break`, `get_current_shift`
- Impact: Staff Workspace shift controls now functional

**Task 8: Add Completion Timestamp Columns** (2025-11-10)
- Migration `056_add_completion_timestamps.sql`
- Added 4 timestamp columns to both orders tables: `filling_complete_ts`, `covering_complete_ts`, `decorating_complete_ts`, `packing_complete_ts`
- Impact: Stage duration tracking and analytics now work

**Task 9: Implement Inventory Deduction Flow** (2025-11-10)
- Migration `058_inventory_foundation.sql`
- Created `deduct_inventory_for_order()` and `restock_order()` RPCs
- Created dormant `flip-shopify-oos` Edge Function (ready for activation)
- Feature flag in Settings page (defaults to OFF)
- Impact: Inventory tracking foundation complete, ready to enable

**Task 10: Add Missing Staff Columns** (2025-11-10)
- Migration `057_add_staff_approval_columns.sql`
- Added `approved` (boolean) and `hourly_rate` (numeric) to `staff_shared` table
- Impact: Staff approval workflow and payroll calculations now possible

**Task 11: Add Storage Filter to Queue Tables** (2025-11-10)
- Updated `QueueTable.tsx` with storage filter dropdown
- Server-side and client-side filtering
- Fetches storage locations from Settings
- Impact: Can filter queues by storage location

### ✅ Tier 3: Medium Priority (Tasks 12-15) - Nov 10-11

**Task 12: Shopify Integration RPCs** (2025-11-11) - See v0.9.9-beta above for complete details

**Task 13: Implement Time & Payroll RPCs** (2025-11-11)
- Migration `060_time_payroll_rpcs.sql`
- Created 3 RPCs: `get_staff_times`, `get_staff_times_detail`, `adjust_staff_time`
- Wired TimePayrollPage to real database
- Impact: Time & Payroll page now shows real shift data with pay calculations

**Task 14: Implement QC Photo System** (2025-11-11)
- Migration `061_qc_photos_system.sql`
- Created `order_photos` table
- Created 3 RPCs: `upload_order_photo`, `get_order_photos`, `get_qc_review_queue`
- Impact: QC photo tracking foundation complete (UI wiring deferred)

**Task 15: Create Dedicated Complete Page** (2025-11-10)
- Migration `059_find_order_universal_search.sql`
- Created `find_order(p_search)` RPC - universal search across all stages
- Created `get_complete()` RPC for backward compatibility
- Wired header search bar and QuickActions
- Impact: Better than spec - one search finds orders in any stage

### 📊 Statistics
- **Tasks in This Release:** 14 (Tasks 1-11, 13-15)
- **Task 12:** Documented separately in v0.9.9-beta
- **Combined Total:** 15 tasks completed
- **Tier 1 (Critical):** 6/6 = 100% ✅
- **Tier 2 (High):** 5/5 = 100% ✅
- **Tier 3 (Medium):** 4/5 = 80% (Task 16 not started)
- **Tier 4 (Architectural):** 0/4 = 0%
- **Overall Progress:** 15/20 = 75%

### 🚀 Production Impact
- ✅ All MVP blockers resolved
- ✅ Complete feature set implemented
- ✅ Staff approval workflow ready
- ✅ Time tracking and payroll ready
- ✅ QC photo system foundation ready
- ✅ Inventory deduction ready (feature flagged)
- ✅ Shopify order sync functional
- ✅ All critical bugs fixed (7 in Task 12 alone)

### 📦 Migrations Applied
- `050_add_flavour_column.sql`
- `051_set_storage_rpc.sql`
- `052_stage_events_rebuild.sql`
- `053_add_stage_events_logging.sql`
- `054_print_barcode_rpc.sql`
- `055_shifts_breaks_system.sql`
- `056_add_completion_timestamps.sql`
- `057_add_staff_approval_columns.sql`
- `058_inventory_foundation.sql`
- `059_find_order_universal_search.sql`
- `060_time_payroll_rpcs.sql`
- `061_qc_photos_system.sql`
- `062_shopify_integration.sql` (replaced by 063)
- `063_fix_shopify_integration.sql`

### 🔗 References
- Master_Task.md - All Tier 1-3 tasks marked complete
- Individual task documentation in completion notes
- PR #217 (Task 12 with 7 bug fixes)

---

## v0.9.7-beta — Webhook Resilience & Raw Storage Architecture (2025-11-05)

### Added
- **Raw Payload Storage Tables**: New inbox tables for webhook resilience
  - `webhook_inbox_bannos` - Stores raw Shopify payloads from Bannos store
  - `webhook_inbox_flourlane` - Stores raw Shopify payloads from Flourlane store
  - Schema: `id text PRIMARY KEY`, `payload jsonb NOT NULL`, `processed boolean NOT NULL DEFAULT false`
  - Indexes on unprocessed records for efficient Stage 2 processing
- **Never-Fail Webhook Handlers**: Ultra-simplified Edge Functions (~35 lines each)
  - Accept all orders without validation or blocking
  - Store raw JSON payload immediately
  - Always return 200 OK to Shopify
  - No schema dependencies or processing logic
- **Backup Files**: Preserved original webhook logic for future reference
  - `supabase/functions/shopify-webhooks-bannos/index.BACKUP-with-splitting.ts`
  - `supabase/functions/shopify-webhooks-flourlane/index.BACKUP-with-splitting.ts`
- **Documentation**: Business logic reference for future Stage 2 implementation
  - `docs/webhook-splitting-logic-reference.md` - Complete categorization and splitting rules

### Changed
- **Webhook Philosophy**: Shifted from "process on arrival" to "store first, process later"
  - Stage 1 (Current): Webhooks dump raw data to inbox tables
  - Stage 2 (Future): Backend processor extracts data using Liquid templates
- **Error Handling**: Eliminated all failure modes
  - No tag-based blocking
  - No schema validation
  - No metafield requirements
  - No duplicate detection (upsert with `onConflict: 'id'`)
- **ID Generation**: More resilient fallback logic
  - Format: `bannos-${shopifyOrder.order_number || shopifyOrder.id}`
  - Handles missing `order_number` gracefully

### Removed
- ❌ All order processing logic from webhooks
- ❌ Tag-based test order blocking
- ❌ Schema-dependent field extraction
- ❌ Direct writes to `orders_bannos/orders_flourlane` tables
- ❌ Metafield parsing and validation
- ❌ Order splitting and categorization logic (preserved in backup files)

### Fixed
- **Schema Mismatch Errors**: Webhooks no longer fail due to missing database columns
- **Blocking Logic Issues**: Removed all order rejection logic
- **Duplicate Order Logging**: Changed from `insert` to `upsert` for cleaner logs
- **Migration Conflicts**: Resolved `schema_migrations_pkey` duplicate key error

### Technical Details
- **Migration**: `039_webhook_inbox_tables.sql`
  - Created minimal inbox tables
  - Added partial indexes for unprocessed records
  - Applied manually to production database
- **Deployment**: Both Edge Functions deployed and active
  - Bannos: `https://{project}.supabase.co/functions/v1/shopify-webhooks-bannos`
  - Flourlane: `https://{project}.supabase.co/functions/v1/shopify-webhooks-flourlane`
- **Data Flow**: Shopify → Edge Function → `webhook_inbox_*` → (Stage 2 processor - future)

### Status
- ✅ Webhooks accepting all orders successfully
- ✅ Raw data stored in inbox tables
- ✅ Zero failures, zero blocking
- ✅ Original logic preserved for future use
- ⏸️ Stage 2 processor (Liquid templates + backend logic) deferred to post-launch

### Branch History
- **PR #174**: Initial never-fail webhook implementation (reverted)
- **PR #175**: Raw storage attempt (reverted)
- **PR #176**: Full rollback to PR #174 state
- **PR #177**: Schema fix attempt (reverted)
- **PR #178**: Database restore to clean state
- **PR #179**: Backup original splitting logic
- **PR #180**: Create inbox tables migration
- **PR #181**: Simplified webhook handlers (final implementation)

### Next Steps
- Task 8b: Implement Stage 2 processor (deferred to post-launch)
  - Liquid template integration
  - Order splitting and categorization
  - Processing from inbox → orders tables
  - Mark records as processed

---

## v0.9.6-beta — Shopify Webhooks: Metafield-Driven Implementation (2025-11-03)

### Added
- **Metafield-Driven Webhooks**: Simplified order ingestion using Shopify Flow metafields
  - Single source of truth: `ordak.kitchen_json` metafield
  - No complex parsing of order attributes or properties
  - Direct field mapping from structured JSON
  - Simple date parsing: `new Date(data.delivery_date).toISOString().split('T')[0]`
- **Separate Store Functions**: Independent Edge Functions for each store
  - `shopify-webhooks-bannos` → `orders_bannos`
  - `shopify-webhooks-flourlane` → `orders_flourlane`
  - Complete isolation (if one fails, other continues)
  - No shop domain routing logic needed
- **Race-Condition-Proof Idempotency**: Atomic duplicate detection
  - Uses `return=representation` to detect if row was actually inserted
  - Empty response = duplicate ignored → skip RPCs
  - Prevents duplicate stock deduction and order splits
- **Stock Deduction & Order Split Integration**: Calls RPCs only if new order inserted
  - `deduct_on_order_create(order_gid, payload)` - Best-effort, non-blocking
  - `enqueue_order_split(order_gid, payload)` - Best-effort, non-blocking
  - No cascading failures

### Removed
- ❌ HMAC verification (not needed with Shopify Flow)
- ❌ `normalize.ts` function and complex extraction logic
- ❌ Property blacklist enforcement
- ❌ Tag fallbacks for dates
- ❌ Notes aggregation logic
- ❌ `processed_webhooks` table
- ❌ Shop domain routing
- ❌ Query parameters (`?store=`)

### Fixed
- **Race Condition in Idempotency**: Eliminated separate GET check, uses atomic `return=representation`
- **Metafield Missing Handling**: Returns 500 (not 400) to trigger Shopify retry
- **Due Date Fallback**: Removed fallback logic - expects metafield to always have valid date

### Changed
- **Error Message for Missing Metafield**: Changed to "Metafield not ready yet, will retry"
- **Comments**: Simplified to match ultra-simple implementation
- **Module Structure**: Single file per store
  - `shopify-webhooks-bannos/index.ts` - Bannos store handler
  - `shopify-webhooks-flourlane/index.ts` - Flourlane store handler

### Technical Details
- **Data Source**: 100% from `ordak.kitchen_json` metafield
  - `customer_name`: `data.customer_name`
  - `notes`: `data.order_notes`
  - `delivery_method`: `data.is_pickup ? "pickup" : "delivery"`
  - `product_title`: `data.line_items[0].title`
  - `flavour`: `data.line_items[0].properties["Gelato Flavours"]`
  - `due_date`: Parse `data.delivery_date` to YYYY-MM-DD
- **Idempotency**: Single-layer, atomic protection
  - `Prefer: resolution=ignore-duplicates,return=representation`
  - Check `insertedRows.length === 0` to detect duplicate
  - Only call RPCs if row was actually inserted
- **Deployment**: Two independent functions
  - Bannos: `https://{project}.supabase.co/functions/v1/shopify-webhooks-bannos`
  - Flourlane: `https://{project}.supabase.co/functions/v1/shopify-webhooks-flourlane`

### Status
- ✅ **Phase 5 Shopify Integration = COMPLETE**
- ✅ Metafield-driven implementation deployed
- ✅ Race condition eliminated
- ✅ Ultra-simplified codebase (~50% less code)
- ✅ No authentication secrets needed
- ✅ Ready for production

### Deployment Notes
**Required Environment Variables:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - For RPC calls
- `SUPABASE_ANON_KEY` - For PostgREST

**Shopify Configuration:**
1. Create Shopify Flow to generate `ordak.kitchen_json` metafield on order creation
2. Configure webhooks in each store:
   - Bannos: `https://{project}.supabase.co/functions/v1/shopify-webhooks-bannos`
   - Flourlane: `https://{project}.supabase.co/functions/v1/shopify-webhooks-flourlane`

**Branch:** `feat/webhook-metafield-refactor`  
**PR:** #169  
**Merged:** 2025-11-03  
**Commits:** 4 commits squash-merged
1. refactor: create separate webhooks for Bannos/Flourlane using metafields
2. fix: eliminate race condition with atomic return=representation check
3. docs: update all webhook documentation to match metafield implementation
4. refactor: simplify webhook code - remove fallbacks and verbose comments

---

## v0.9.5-beta — Shopify Webhooks Edge Function Stabilized (2025-11-01)

### Fixed
- **Shopify Webhooks Edge Function Boot Error**: Resolved 503 Service Unavailable errors caused by complex logic in the full webhook handler
- **Import Resolution**: Switched from import map aliases (`std/`) to direct Deno URLs for reliable Edge Function deployment
- **RFC 9110 Compliance**: Added `Allow: GET, POST` header to 405 Method Not Allowed responses

### Changed
- Replaced full `shopify-webhooks` Edge Function with minimal working version
- Backed up original full implementation to `index_full_backup.ts` for future restoration
- Added comprehensive JSDoc documentation to meet 80% coverage requirement

### Technical Details
- **Root Cause**: Worker boot error in Supabase Edge Functions due to syntax/runtime error in complex HMAC validation logic
- **Solution**: Deployed minimal handler (GET/POST → 200 OK, others → 405) to unblock infrastructure
- **Next Steps**: Debug and restore full HMAC verification, idempotency, and order splitting logic from backup

### Status
- ✅ Edge Function deployed and responding correctly
- ✅ Infrastructure validated (Deno imports, Supabase runtime working)
- ✅ Shopify webhooks connected for Bannos and Flourlane stores
- ⚠️ **CRITICAL**: Full webhook processing logic temporarily disabled (backed up for restoration)
- 🔴 **URGENT**: Restore full HMAC validation and order splitting workflow (Task 7b)

### Security Note
**Current minimal handler accepts all POST requests without validation.** This is a temporary state to unblock infrastructure. Task 7b (restore full handler) is now HIGHEST PRIORITY since webhooks are actively sending data.

**Branch:** `fix/shopify-webhooks-boot-error`  
**PR:** #157  
**Merged:** 2025-11-01

---

## v0.9.4-beta — Inventory System Complete (2025-10-27)

### Added
- SECURITY DEFINER write-side RPCs:
  - `tx_component_adjust(uuid,numeric,text,uuid,jsonb)` — Generic adjustment (+/-)
  - `tx_component_receive(uuid,numeric,uuid,jsonb)` — Receive/purchase (inbound)
  - `tx_component_consume(uuid,numeric,uuid,jsonb)` — Consume (outbound)
  - `tx_component_reserve(uuid,numeric,uuid,jsonb)` — Reserve stock for order
  - `tx_component_release(uuid,numeric,uuid,jsonb)` — Release reserved stock
- Internal `_log_component_txn()` wrapper for dynamic logger compatibility (tries existing logger, falls back to direct insert)
- All read-side RPCs from migration 034 now stable and preview-safe

### Status
- **Phase 4 Inventory & BOMs = Fully Complete ✅**
- All five inventory tabs now live-connected to Supabase
- No mock data required
- All CI checks passing

---

## v0.9.2-beta — Webhook → Queue → Workers stabilized (2025-10-27)

### Added
- Edge Function `shopify-webhooks` (per-store HMAC verify, idempotency by (id, shop_domain)).
- RPC `enqueue_order_split(...)` → writes to `work_queue(topic,payload,status)` (no mock data).
- Worker #1 `process_webhook_order_split(limit)`:
  - Splits verified orders to `kitchen_task_create` child jobs (one per cake unit).
  - Suffixing A–Z, then AA, AB…; accessories only on A.
  - Deterministic store routing via `payload.shop_domain`.
- Worker #2 `process_kitchen_task_create(limit)`:
  - Materializes Filling_pending tickets in `stage_events`.
  - Deterministic idempotency: order UUID derived from webhook/job (stable on retry).
  - Validates inputs + payload (`task_suffix`, bounds for `p_limit`/`p_lock_secs`).

### Schema
- `processed_webhooks`: (id, shop_domain, topic, received_at, status, http_hmac, note).
- `work_queue`: (id uuid, created_at, topic, payload jsonb, status, …); indexes on `(status, topic, created_at desc)` and `(topic, created_at desc)`.
- `stage_events` hardened:
  - Columns: `order_id uuid not null`, `shop_domain text not null`, `stage text not null`, `status text not null`, `task_suffix text not null`, `created_at`.
  - Composite unique index `stage_events(order_id, shop_domain, stage, task_suffix)`.
  - Forward-fix migrations (028, 031–033) ensure table creation, backfill, NOT NULL, and UUID correctness across envs.
- Inventory read-side RPCs:
  - `get_components` (bounded, active/all)
  - `get_boms` (optional store filter; returns items with component details)
  - `get_accessory_keywords` (joined to component)
  - `get_product_requirements` (joined to component)
  - `get_stock_transactions` (preview-safe; bounded; filters for since/component/order/type)
- Bootstrap guards for missing tables (`components`, `boms`, `bom_components`, `accessory_keywords`, `product_requirements`) using `CREATE TABLE IF NOT EXISTS` for fresh preview environments.

### Notes
- No mock data introduced; all workers are no-op until real Shopify webhooks arrive.
- Functions declared in `supabase/config.toml` for auto-deploy; Node TS excludes Deno functions to keep CI noise low.

## v0.9.1-beta — Webhook Enqueue + Split Worker + Stage-Ticket Worker (2025-01-27)
### Added
- **Enqueue RPC**: `enqueue_order_split` → `work_queue(topic, payload, status)`
- **Worker #1**: `process_webhook_order_split` → `kitchen_task_create` (A-Z, AA…; accessories on A)
  - Robust alpha suffix helper (`public.alpha_suffix`) for Excel-like column naming
  - Input validation for payload fields
  - Early exit for orders with no cake items
- **Worker #2**: `process_kitchen_task_create` → `stage_events` Filling_pending (idempotent)
  - Bounds checking for SECURITY DEFINER inputs (p_limit: 1-100, p_lock_secs: 1-3600)
  - Unique index `stage_events_order_shop_stage_suffix_uidx` for guaranteed idempotency
  - Explicit `ON CONFLICT` target for stage ticket insertion
- **Queue Worker Edge Function**: URL switch `?task=kitchen` triggers stage-ticket RPC
- **Indexes**: `work_queue_status_topic_created_idx`, `work_queue_status_topic_created_idx2`
- **TypeScript Config**: Deno functions excluded from Node TS checks (`tsconfig.json`)
- **CI Improvements**: `.eslintignore` for Deno functions, audits, SQL files

### Fixed
- React list keys (missing `key` props in mapped arrays)
- TypeScript hard errors (implicit `any` types, type mismatches)
- Error notification handling (preserve description in toast options)

### Next
- Connect Shopify webhooks per store (when ready with ordak.com.au)
- (Optional) Admin monitor for `processed_webhooks`, `work_queue`, `dead_letter`

## v0.9.0-beta — Webhooks Baseline & Enqueue (2025-01-24)
### Added
- Edge Function `shopify-webhooks` with Shopify HMAC verification.
- Per-store idempotency via `processed_webhooks` (PK: (id, shop_domain)), status CHECK (`ok|rejected|error`).
- Early validation & consistent failure paths (missing headers → 400, HMAC fail → rejected, RPC fail → error + dead_letter).
- SECURITY DEFINER RPC `enqueue_order_split(...)` and `work_queue` table (+ index).
- `supabase/config.toml` declaration for auto-deploy.

### Next
- Worker that consumes `work_queue` and creates A/B/C tasks per `orders-splitting.md` (accessories on -A, stable suffixes).

## [v0.9.0-beta] – 2025-10-21
### Major
- **Analytics UI Refactor & Cleanup**
  - Replaced all mock data and static charts with live-empty states.
  - Introduced new shared components:
    - `AnalyticsKPI` – standardized KPI tile rendering.
    - `KpiValue` – consistent numeric formatting with unit types (`percent`, `count`, `currency`, `raw`).
    - `ChartContainer` – single `ResponsiveContainer` wrapper; consistent empty-state handling.
  - Added `useAnalyticsEnabled()` hook and feature flag in `config/flags.ts`.
  - Added `toNumberOrNull()` parser in `lib/metrics.ts` for safe numeric conversion.
  - Unified “No data yet” captions (only show when KPI value is empty).
  - Ensured React hook rules are followed (moved `useAnalyticsEnabled` out of `.map()` loops).
  - Fixed multiple JSX structure bugs:
    - Removed duplicate/invalid `ResponsiveContainer` nesting.
    - Corrected KPI card closures causing `Unterminated regular expression` build errors.
  - Verified full build + deployment: ✅ CI / ✅ Supabase Preview / ✅ Vercel / ✅ CodeRabbit.

### Minor
- Ignored `.code-workspace` files to prevent local pull conflicts.
- Confirmed orders wipe migration (v0.8.1) fully clears `orders_*` tables and dependents.
- Synced `dev` branch to include analytics changes and environment clean slate.

**Total PRs:** `#117` (Analytics UI Cleanup), `#116` (Orders Wipe Guarded)  
**Author:** Panos  
**Status:** ✅ Merged to `dev`

## [v0.8.0-beta] - 2025-01-13 - Authentication System Lockdown & Dev Environment Hardening

### 🔒 Authentication System Lockdown
- **Session Persistence Control**: Added `VITE_SUPABASE_PERSIST_SESSION` environment variable for explicit control
- **Auto-Login Prevention**: Disabled demo/auto-login flags in development environment
- **Demo Mode Gating**: Supervisor demo login now requires `MODE === 'demo'` (never true in dev)
- **Storage Management**: Sign-out properly clears both localStorage and sessionStorage
- **Auth Hydration Gate**: Maintained proper loading states during authentication initialization

### 🛡️ Development Environment Hardening
- **Port Enforcement**: Dev server locked to `localhost:3000` with `--strictPort` (fails if busy)
- **No Port Hopping**: Eliminated silent fallback to 3001/3002 ports
- **HMR Alignment**: Fixed port mismatch between server and Hot Module Replacement client
- **Robust Port Validation**: Improved `VITE_DEV_PORT` handling to prevent server failures
- **Single URL Architecture**: All users access root path with role-based internal routing

### 🔧 Configuration Improvements
- **Environment Variables**: Added comprehensive `.env.example` with port discipline
- **Script Updates**: Updated `dev` and `preview` scripts to respect `VITE_DEV_PORT`
- **Vite Configuration**: Enhanced with `loadEnv` support and proper port handling
- **Type Safety**: Maintained TypeScript compatibility throughout auth system

### 📋 Security Enhancements
- **No Surprise Logins**: Eliminated auto-login from stored sessions in development
- **Explicit Authentication**: All authentication now requires explicit user action
- **Session Control**: Clear separation between development and production session behavior
- **Demo Mode Isolation**: Demo features completely isolated from development workflow

### 🎯 Developer Experience
- **Predictable Behavior**: Consistent port usage and authentication flow
- **Clear Error Messages**: Port conflicts now fail loudly with clear error messages
- **Environment Clarity**: Clear distinction between development and production configurations
- **Debugging Support**: Maintained comprehensive logging for authentication flow debugging

---

## [v0.7.0-beta] - 2025-02-01 - Messaging System Integration & Optimistic Updates

### 🎯 Overview
Complete integration of the messaging system with type-safe optimistic updates, background loading patterns, and proper realtime configuration. This release ensures a smooth, flicker-free messaging experience with instant feedback and proper message reconciliation.

### ✅ Type-Safe Optimistic Messages
- **Server/Client ID Separation**: `ServerMessage` with server `id`, `OptimisticMessage` with client `clientId`
- **Type Guards**: `isOptimistic()` helper for safe optimistic message detection
- **Base Message Types**: `MessageId`, `BaseMessage`, and union `Message` type
- **Backward Compatibility**: Maintained compatibility with existing UI components

### ✅ Background Loading Pattern
- **No Loading Flicker**: Background updates for realtime listeners
- **Foreground vs Background**: Loading spinners only for user-initiated actions
- **Conversation Refresh**: Background updates on new messages
- **Unread Count Updates**: Silent badge updates without UI disruption

### ✅ Optimistic Message Reconciliation
- **Instant Feedback**: Messages appear immediately with `uuid` clientId
- **Server Reconciliation**: Replace optimistic with server ID after RPC success
- **Error Handling**: Remove optimistic messages on failure with toast notification
- **Background Refresh**: Update conversation list without loading spinner

### ✅ Supabase Configuration
- **Realtime Publication**: Idempotent migration ensures publication exists
- **Preview Environment**: Guarded publication setup for fresh environments
- **Health Check**: Prevents "Service health check failed" errors
- **Tables Verified**: `conversations` and `messages` in realtime publication

---

## [v0.6.0-beta] - 2025-01-30 - Single URL Architecture & Authentication Fixes

### 🎯 Overview
Complete implementation of single URL architecture with role-based routing, fixing all authentication issues and implementing comprehensive safeguards to prevent regression. This is a critical architectural improvement that simplifies user experience and eliminates URL-based routing confusion.

### ✅ Phase 1: Single URL Architecture Implementation
- **Unified URL Structure**: All users access same URL (`/`) regardless of role
- **Role-Based Routing**: Interface determined by user role, not URL path
- **Eliminated Role-Specific URLs**: Removed `/workspace/staff`, `/workspace/supervisor`, `/dashboard` patterns
- **Simplified Navigation**: Single URL for all users with automatic role-based interface switching
- **Improved UX**: No confusion about which URL to use for different roles

### ✅ Phase 2: Authentication & Sign-Out Fixes
- **Fixed React Rules of Hooks Violation**: Resolved "Rendered more hooks than during the previous render" error
- **Added Sign-Out to Admin Dashboard**: Admin users can now sign out from the dashboard
- **Unified Sign-Out Experience**: All roles (Staff, Supervisor, Admin) have working sign-out functionality
- **Session Management**: Proper session handling with automatic role-based routing after login
- **Authentication Flow**: Clean login → role-based interface → sign-out → login cycle

### ✅ Phase 3: Comprehensive Safeguards & Documentation
- **Automated Tests**: `src/tests/single-url-architecture.test.tsx` prevents regression
- **ESLint Rules**: Custom rules catch forbidden role-specific URL patterns
- **Validation Scripts**: Pre-commit validation ensures architecture compliance
- **Complete Documentation**: `docs/SINGLE_URL_ARCHITECTURE.md` with examples and guidelines
- **NPM Scripts**: `npm run validate:architecture` for comprehensive validation

### ✅ Phase 4: Critical Bug Fixes
- **Double URL Change Triggering**: Fixed navigateToQueue function causing duplicate URL change events
- **Infinite Redirect Loops**: Added infinite loop prevention in role-based routing
- **Incorrect URL Classification**: Fixed overly broad dashboard condition that misclassified queue pages
- **Merge Conflicts**: Resolved conflicts between dev branch and feature branches
- **TypeScript Compliance**: All changes pass type checking and linting

### 🔧 Technical Implementation
- **App.tsx Rewrite**: Complete restructuring of routing logic for single URL architecture
- **RoleBasedRouter Component**: Centralized role-based routing with proper hook management
- **Header Component Updates**: Added sign-out functionality to Admin Dashboard header
- **Dashboard Component**: Updated to receive and pass through sign-out props
- **Authentication Service**: Enhanced with proper session management and error handling

### 🛡️ Safeguards Implemented
- **Pre-commit Validation**: `scripts/validate-single-url.sh` blocks violating commits
- **Automated Testing**: Tests ensure single URL architecture cannot be broken
- **Code Quality**: ESLint rules prevent introduction of forbidden patterns
- **Documentation**: Comprehensive guide for maintaining the architecture
- **Validation Commands**: Easy-to-use npm scripts for ongoing validation

### 🎯 User Experience Improvements
- **Simplified URLs**: All users access `localhost:3000/` (or production domain)
- **Role-Based Interfaces**: Staff see Staff Workspace, Admin see Dashboard, Supervisor see Supervisor Workspace
- **Consistent Sign-Out**: Working sign-out button in all interfaces
- **No URL Confusion**: Single URL eliminates "which URL should I use?" questions
- **Seamless Navigation**: Role-based routing works automatically after login

### 📊 Impact
- **Eliminated URL-based routing complexity**
- **Fixed all authentication and sign-out issues**
- **Implemented bulletproof safeguards against regression**
- **Improved user experience with simplified navigation**
- **Enhanced maintainability with comprehensive documentation**

---

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
