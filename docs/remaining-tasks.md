# Remaining Tasks to Ship v1.0
Last updated: 2025-10-12

This document reconciles the plan in `/docs` with current source under `src/` to list what’s left to build and integrate before v1.0. Sources: PROJECT_STATUS, UI_INTEGRATION_GUIDE, vertical slices, RPC surface, and code scan of components/hooks/lib.

## Snapshot
- Backend (DB/RPC, RLS, Edge): Complete per docs; RPC client present in `src/lib/rpc-client.ts`.
- Auth (Supabase): Implemented (`src/lib/auth.ts`, `src/contexts/AuthContext.tsx`, `components/Auth/*`, wired in `src/App.tsx`).
- Core UI integration: Mostly wired (queues, stats, inventory, settings) with a few TODO gaps (scanner, shift tracking, staff assignment, deletes).
- Shopify UI flows: Token test/sync flows are simulated; real connect/sync UI needs RPCs/wiring.
- Messaging: Implemented (RPCs + realtime); light integration polish left.
- Observability & testing: Minimal; needs adding.

## Priority Backlog
P0 – Must-have to operate daily workflow
1) Scanner → stage completion (wire to RPCs)
   - Files: `src/components/ScannerOverlay.tsx`
   - Do: Replace simulated scan/confirm with `getOrderForScan`, then call stage RPCs (`completeFilling|Covering|Decorating|Packing`, `qcReturnToDecorating`).
   - Accept: Correct stage transitions; errors surfaced; success toasts; refresh upstream lists.
2) Staff assignment from queues
   - Files: `src/components/QueueTable.tsx`, optionally `src/components/OrderDetailDrawer.tsx`
   - Do: Implement bulk/single assignment using `assignStaff`/`unassignStaff`; fetch staff via `getStaffList`.
   - Accept: Multi-select assign works; UI reflects assigned vs unassigned; errors handled.
3) Shift/time tracking in workspaces
   - Files: `src/components/StaffWorkspacePage.tsx`, `src/components/SupervisorWorkspacePage.tsx`
   - Do: Use `getStaffMe`, `getCurrentShift`, `startShift`, `endShift`, `startBreak`, `endBreak` to replace local timers.
   - Accept: Shift state persists/reloads; break gating enforced; errors handled.
4) Order details integration cleanup
   - Files: `src/components/OrderDetailDrawer.tsx`
   - Do: Fetch single order via `getOrder` (not list+find), add `setStorage` and optional `assignStaff` actions.
   - Accept: Drawer shows authoritative data; storage/assignment actions persist.

P1 – Completeness and operator UX
5) Monitor and dashboard correctness
   - Files: `src/components/MetricCards.tsx`, `ProductionStatus.tsx`, `UnassignedStations.tsx`
   - Do: Remove remaining TODOs; ensure `getQueueStats`/`getUnassignedCounts` mapped correctly; empty states.
   - Accept: No TODOs; numbers consistent with DB.
6) Inventory admin polish and deletes
   - Files: `src/components/inventory/*`
   - Do: Implement delete flows once RPCs exist (e.g., keywords/requirements delete); confirm `updateComponentStock`, BOM upserts OK.
   - Accept: Create/update/delete across Components, BOMs, Keywords, Requirements, Transactions, Tools.
7) Settings save surface parity
   - Files: `src/components/SettingsPage.tsx`
   - Do: Confirm `get/set` for flavours, storage, printing, monitor density; surface validation; debounce or optimistic UI.
   - Accept: Round-trip reflects DB; validation and failure states clear.

P2 – Shopify integration UI and advanced features
8) Shopify connect/sync UI (front-end)
   - Files: `src/components/SettingsPage.tsx`, `src/lib/rpc-client.ts` (if RPCs exposed)
   - Do: Replace simulated “Test Connection/Sync” with RPCs (e.g., `test_storefront_token`, `connect_catalog`, `sync_shopify_orders`) when available.
   - Accept: Successful token validation; sync progress with real numbers/log link; error surfacing.
9) Printing flows
   - Files: `src/lib/barcode-service.ts`, buttons in workspace/detail components
   - Do: Use `handlePrintBarcode` from UI locations; confirm printing settings use store config.
   - Accept: Print triggers RPC; errors surfaced; printer settings respected.
10) Messaging UX polish
   - Files: `src/components/messaging/*`, `src/hooks/useRealtimeMessages.ts`
   - Do: Ensure subscriptions mount once; unread counts badging; read markers via `markMessagesRead`.
   - Accept: New messages live-update; read state persists; no duplicate channels.

P3 – Quality, observability, and readiness
11) Error handling & telemetry
   - Files: `src/lib/error-handler.ts`, app root init
   - Do: Wire Sentry/PostHog (keys already in `.env` docs) behind feature flags; centralize capture in error handler; add `ErrorBoundary` at app shell.
   - Accept: Errors captured in Sentry locally when DSN present; pageviews/INP/LCP to PostHog when key present.
12) Tests
   - Unit: pure mappers/adapters; queue grouping; error handler.
   - Integration: RPC client happy-paths with a test project; scanner flow end-to-end (mock camera).
   - E2E: Print → scan → stage transitions; assignment; inventory CRUD.
   - Accept: `npm run test` stable locally/CI; critical paths covered.
13) Type safety hardening
   - Files: `src/components/*` with `// @ts-nocheck`
   - Do: Remove `@ts-nocheck`, add types from `types/db`; narrow `any`; export component props.
   - Accept: `npm run type-check` passes without suppressions.
14) Performance polish
   - Do: memoization, virtualization in large lists (`QueueTable`), avoid re-render storms on polling.
   - Accept: Meets front-end SLOs in `docs/performance-slas.md`.

## Component Checklist (by file)
- `src/components/ScannerOverlay.tsx` — Replace simulated flow with `getOrderForScan` + stage RPCs; success/error states; close-loop refresh.
- `src/components/QueueTable.tsx` — Implement bulk/single `assignStaff`/`unassignStaff`; drive counts by `getUnassignedCounts`; confirm grouping logic vs server stage names.
- `src/components/OrderDetailDrawer.tsx` — Fetch via `getOrder`; add `setStorage`, `assignStaff`; keep Shopify link.
- `src/components/EditOrderDrawer.tsx` — Already uses `updateOrderCore`; ensure save disables reflect pending; toast errors.
- `src/components/StaffWorkspacePage.tsx` — Wire shift/break RPCs; assigned to me query (filter by `assignee_id`); scanner entry point.
- `src/components/SupervisorWorkspacePage.tsx` — Same shift RPCs; implement print via `handlePrintBarcode`; queue shortcuts use SPA routing helper.
- `src/components/MetricCards.tsx` — Remove TODO; ensure stats map to labels; fallback when null.
- `src/components/inventory/*` — Confirm CRUD paths; add deletes when RPCs exist (`AccessoryKeywords`, `ProductRequirements` show TODOs).
- `src/components/SettingsPage.tsx` — Replace simulated Shopify connect/sync with RPCs; maintain current get/set settings features.
- `src/components/MainDashboardMessaging.tsx` + `messaging/*` — Ensure realtime channels lifecycle; unread counts + mark read.

## Cross-cutting
- Access control: Apply `withAuth` to sensitive pages as needed; current App gate is OK.
- Single-URL routing: Current `App.tsx` role-router is correct; avoid URL-based branching.
- Feature flags: `VITE_USE_MOCKS` honored via `src/lib/config.ts`; production must disable.

## Acceptance Gates before v1.0
- P0 items verified in staging with real data across both stores.
- SLOs at/near targets (queue p95 < 200ms, UI Web Vitals within goals).
- No `@ts-nocheck` in core components; type-check green.
- Smoke: ingest test order → print barcode → complete stages via scanner → appears in Complete; staff assignment works.

## Suggested Order of Execution
1) P0: scanner, assignment, shifts, order detail.
2) P1: dashboard/metrics correctness, inventory deletes, settings polish.
3) P2: printing hooks, messaging polish, Shopify UI once RPCs ready.
4) P3: telemetry, tests, type safety, perf polish.

## Post-merge Checks
Run locally and in CI:
```bash
npm run type-check && npm run build
```