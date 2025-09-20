# Dev Kickoff — Ordak v2 (Complete Pack)

## Starting Point Reality Check

✅ UI components: already built (50+ in src/components)

✅ Documentation: present (/docs with architecture & runbooks)

✅ TypeScript: configured (with @ts-nocheck on 4 UI files to unblock; will tighten later)

✅ Routing: implemented (app routes scaffolded)

✅ Tailwind v4: configless setup working (@import "tailwindcss")

✅ Supabase env: present (.env.local + GitHub secrets for CI)

✅ CI: green on dev (type-check, security; build runs on PR/main)

✅ README: production-ready (scripts, diagrams, contribution rules)

## Repo & Branching

**Repository:** bannoscakes-ordak-ui (protected)

**Branches:**
- main → production, protected
- dev → active development
- feature/* → short-lived branches, merged via PR

**Ruleset:**
- Require PRs into main and dev
- Required checks: type-check, build, security scan
- Require one approval
- Solo workflow: approvals may be self-approved for PRs into dev and main

**Commit Tags** (prefix in commit messages):
- `docs:` documentation-only
- `chore:` CI / housekeeping
- `feat:` features
- `fix:` bugfixes

## Version Management

- **Current:** v0.1.0-alpha (mock implementation complete)
- **Next:** v0.2.0-beta (Supabase integration, RPC/RLS active)
- **Upcoming:** v0.3.0-beta (Shopify webhooks, inventory sync)
- **Target:** v1.0.0 (production release with full automation)

**Version Bumps:**
- Patch (0.0.x): Bug fixes, minor UI tweaks
- Minor (0.x.0): New features, significant improvements
- Major (x.0.0): Breaking changes, major refactors

## Tech Stack

### Frontend
- React 18 + Vite + TypeScript
- Tailwind CSS v4 (configless)

### Backend (Supabase)
- PostgreSQL (orders, staff, inventory, stage history)
- Edge Functions (Shopify ingest, cleanup)
- RPCs (all writes gated through SECURITY DEFINER)
- RLS (row-level security on every table)

### Infra / CI
- GitHub Actions (type-check, build, lint, test, security scan)
- Railway (Edge functions) & Vercel/Netlify (frontend) for staging + production

## File & Folder Scaffolding
src/
components/         # shared UI
features/           # feature slices
scanner/          # barcode scan handlers & overlay
orders/           # order grid/cards
staff/            # staff dashboards & workspaces
lib/                # helpers (supabase client, utils)
pages/              # route views
mocks/              # mock-data and mock RPCs (for local dev)
docs/
architecture.md
data-flows.md
RLS-RPC-checklist.md
IMPLEMENTATION_PLAN.md

## Supabase / Backend Rules

- **No direct writes** from the frontend → all mutations via RPCs only
- RPCs must use **SECURITY DEFINER** with input validation and guard logic
- RLS policies: **default deny**; selectively enable via role checks
- **Webhooks:**
  - Shopify orders/create → validate → insert into queue
  - Dead-letter table for invalid payloads
  - Inventory OOS fallback: mark pending + notify Supervisor

## Development Flow

1. Create a feature branch (`feature/scan-handler`, etc.)
2. Implement UI and call RPCs (no direct table writes)
3. Local checks:
```bash
   npm run type-check
   npm run lint
   npm run build

Commit & push → open PR into dev
CI runs (type-check, build, security); fix anything red
Merge PR into dev
Periodically PR dev → main with release notes when staging is green

Environment Configuration
Development (.env.local)
envVITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_URL=http://localhost:5173
Production (.env.production)
envVITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_URL=https://ordak.yourdomain.com
VITE_SENTRY_DSN=
VITE_POSTHOG_KEY=
Edge Functions (.env)
envSUPABASE_SERVICE_ROLE_KEY=
SHOPIFY_BANNOS_TOKEN=
SHOPIFY_FLOURLANE_TOKEN=
SHOPIFY_WEBHOOK_SECRET=
SLACK_WEBHOOK_URL=
Deployment Guide
Prerequisites

Node 18+
Supabase project
Vercel/Netlify account (frontend)
Railway account (Edge functions/backend)

Staging
Frontend (Vercel/Netlify):

Import GitHub repo bannoscakes-ordak-ui
Framework: Vite | Build: npm run build | Output: dist
Set env vars (VITE_*)
Deploy from dev

Edge Functions (Railway):

New project → Deploy from GitHub (or separate Edge repo if split)
Set env vars (SUPABASE_SERVICE_ROLE_KEY, Shopify tokens, webhook secret, Slack hook)
Verify health (200s, logs clean)

Production

Mirror staging setup with production secrets and main branch
Gate promotion via PR dev → main only when staging is green

Success Criteria (Sprint 0 Exit)

 Repo structure complete
 Branch protections enforced
 CI pipeline green on dev
 Supabase env variables configured
 Docs synced in /docs (plan, architecture, flows, runbooks)
 At least one feature merged via feature → dev flow
 Staging deployment live
 PR merged dev → main

Immediate Next Steps

Confirm .env.local is present with valid Supabase keys
Run npm run type-check && npm run build locally and resolve any errors
Stage deploy: Vercel/Netlify (frontend) + Railway (Edge functions)
Open PR dev → main after staging passes checks
Add short README section linking to this plan and /docs contents

Appendix A — Mock Implementation (Completed)
Purpose
Enable complete UI flows without backend writes, supporting demos and rapid iteration.
What's mocked

src/mocks/mock-data.ts — canonical mock data for orders, staff, metrics
src/mocks/rpc.ts — RPC shims that simulate server behavior
src/features/scanner/ — working scanner with stage progression against mocks

UI wired to mocks

QueueTable with Print/Complete actions
ScannerOverlay advancing stages
Dashboard metrics cards pulling from mock data
Staff/Supervisor workspaces functional with mock state

Exit plan (to go live)

Replace imports from src/mocks/rpc.ts with real RPC client
Flip a USE_MOCKS=false feature flag (or delete mocks)
Run docs/RLS-RPC-checklist.md to validate RPC/RLS paths
Verify in staging before merging to main


Document Version: 1.0.0
Last Updated: Semptember 2025
Status: Ready for Implementation