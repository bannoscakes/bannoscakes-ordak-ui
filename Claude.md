# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ordak** is a production management system for Bannos Cakes bakery, built with React + Vite + Supabase. It manages cake orders through production stages (Filling → Covering → Decorating → Packing → Complete) for two stores: Bannos and Flourlane.

## Commands

```bash
# Development
npm run dev              # Start Vite dev server
npm run build            # Production build
npm run type-check       # TypeScript validation (run before PR)

# Testing
npm run test             # Run all tests with Vitest
npm run test:e2e         # Playwright end-to-end tests

# Database
npm run gen:types        # Regenerate TypeScript types from Supabase schema

# Edge Functions
npm run fn:dev:bannos    # Serve Bannos webhook function locally
npm run fn:dev:flourlane # Serve Flourlane webhook function locally
npm run fn:dev:worker    # Serve queue worker locally
```

## Architecture

### Single URL Architecture
All navigation uses `/?page=X` or `/?view=X` query parameters on the root path `/`. No separate routes exist. Role-based routing in `App.tsx` determines which workspace users see:
- **Staff** → `StaffWorkspacePage` (mobile-optimized, scanner-first)
- **Supervisor** → `SupervisorWorkspacePage` (queue oversight)
- **Admin** → `Dashboard` (full management)

### Data Flow
```
Shopify → Webhook → Edge Function → work_queue table → queue-worker → orders_bannos/orders_flourlane
                                                                              ↓
                                                            Frontend ← get_queue RPC
```

### Key Patterns

**RPC-Preferred Writes**: Most database writes go through `SECURITY DEFINER` RPCs in `src/lib/rpc-client.ts`. Some legacy writes (e.g., accessories) use direct table access with RLS.

**React Query Hooks**: Data fetching uses TanStack Query. Hooks are in `src/hooks/`:
- `useQueueByStore.ts` - Production queue data
- `useQueueMutations.ts` - Stage transitions, assignments
- `useSettingsQueries.ts` - Staff, storage locations
- `useInventoryQueries.ts` - Components, BOMs

**Store Separation**: Two stores (bannos/flourlane) have separate tables (`orders_bannos`, `orders_flourlane`) but share UI components via the `store` prop pattern.

**UI Components**: shadcn/ui components in `src/components/ui/`. Feature components use these primitives with Tailwind CSS.

## Database Rules

1. **Never apply migrations without explicit permission** - Create files in `supabase/migrations/`, then wait for review
2. **Migration naming**: Use `YYYYMMDDHHMMSS_description.sql` (full timestamp, not just date)
3. **SELECT queries are OK** for debugging via MCP
4. **Never run `supabase db push`** without explicit approval

## Workflow

1. Create feature branch from `dev` (e.g., `feature/add-cancel-order`)
2. One focused task per branch (~50 lines or less ideal)
3. Run `npm run type-check` before committing
4. Open PR for review - **never merge PRs yourself**
5. Never push directly to `dev` or `main`

## PR Workflow Rules

1. **Never auto-merge PRs** - Wait for explicit "merge" approval
2. Run Code Guardian + PR Reviewer before requesting merge
3. Fix ALL issues flagged by reviewers (not just critical)
4. Chrome extension UI test for frontend changes

## Supabase Project

- **Project ID**: `iwavciibrspfjezujydc`
- **Region**: ap-southeast-2
- Generate types: `supabase gen types typescript --project-id iwavciibrspfjezujydc > src/types/supabase.ts`

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Role-based routing, auth flow |
| `src/lib/rpc-client.ts` | All Supabase RPC wrappers |
| `src/components/Dashboard.tsx` | Admin view router |
| `src/components/QueueTable.tsx` | Production queue table (template for list views) |
| `src/components/inventory-v2/` | Inventory management (template for tabbed pages) |
| `supabase/migrations/` | Database migrations |
| `supabase/functions/` | Edge functions (webhooks, workers) |

## When Adding New Features

1. **Copy existing components** - Start with verbatim copy of similar component, then modify only what's different
2. **Use existing utilities** - `formatDate()`, `formatOrderNumber()`, existing badge styles
3. **Use existing hooks** - Check `src/hooks/` before creating new ones
4. **Match UI exactly** - Use same Card, Table, Badge, Tabs patterns from existing pages
5. **RPC for writes** - Add new functions to `rpc-client.ts`, never write directly to tables
