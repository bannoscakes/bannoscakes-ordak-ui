# Onboarding

Welcome to **Ordak**. This guide gets you productive in under an hour with **Cursor**, **Supabase**, and our repo conventions.

---

## 0) Access & Prereqs

- **GitHub**: access to `bannoscakes/bannoscakes-ordak-ui`
- **Node**: v18+ (`node -v`)
- **npm**: v9+ (`npm -v`)
- **Supabase**: project URL + anon key + service role (for Edge only)
- **Shopify** (staging): store tokens + `SHOPIFY_WEBHOOK_SECRET` (if you run webhooks locally)

---

## 1) Clone & Install

```bash
git clone https://github.com/bannoscakes/bannoscakes-ordak-ui.git
cd bannoscakes-ordak-ui
npm install
2) Environment
Create a local env file and fill the values you have:

bash
Copy code
cp .env.example .env.local
Required:

VITE_SUPABASE_URL

VITE_SUPABASE_ANON_KEY

VITE_APP_URL (e.g., http://localhost:5173)

Edge-only (set in your local shell or Edge functions settings):

SUPABASE_SERVICE_ROLE_KEY

SHOPIFY_BANNOS_TOKEN, SHOPIFY_FLOURLANE_TOKEN

SHOPIFY_WEBHOOK_SECRET

SLACK_WEBHOOK_URL

Never commit secrets. Client uses anon key; Edge Functions use service role.

3) Run the App (dev)
bash
Copy code
npm run dev
# open the URL that Vite prints (usually http://localhost:5173)
4) Migrations & DB (when you need the DB locally)
bash
Copy code
# apply migrations against your dev Supabase project
npx supabase migration up

# create a new migration when you change schema
npx supabase migration new <name>

# dev-only reset (never in prod)
npx supabase db reset
5) Cursor Workflow
Open the repo in Cursor

Add the /docs folder as Context so models follow our rules

Use the dev branch for daily work; open PRs to dev; after review merge to main

6) Branch & Commit Rules
Branches:

main → production (protected)

dev → integration/default

feature/<short-name> → short-lived

Conventional Commits (examples):

feat(ui): show unassigned counts

fix(rpc): prevent invalid stage transition

docs(ops): add incident runbook

If Husky is enabled, it will check commit messages and run quick lint/type checks.

7) Stage Model (how the app behaves)
Single enum stages: Filling → Covering → Decorating → Packing → Complete.

Filling starts at barcode print (handle_print_barcode) → sets filling_start_ts

Filling ends on scan (complete_filling) → sets filling_complete_ts → stage becomes Covering

Covering/Decorating end on scan; Packing has start scan and complete scan

Unassigned is not a stage: it’s assignee_id IS NULL for the current stage

Read more in:

docs/overview.md (big picture)

docs/rpc-surface.md (all RPCs)

docs/schema-and-rls.md (tables, RLS)

docs/data-flows.md (ingest, inventory, queues)

8) First Task (practice)
Add a small note to docs/overview.md (e.g., clarify a term)

Commit:

bash
Copy code
git add docs/overview.md
git commit -m "docs(overview): clarify <your note>"
git push -u origin dev
Open a PR from dev (or your feature branch) if required by the flow

9) Useful Commands
bash
Copy code
npm run dev         # start app
npm run build       # build app
npm run test        # run tests (if configured)
npx supabase migration up     # apply DB migrations
npx supabase functions deploy <name>  # deploy an Edge function
10) Ops Contacts
On-call / primary: <add name/contact>

Escalation channel: <add Slack channel>

Runbook: docs/operations.md

sql
Copy code

## 3) Commit & push (only this file)
```bash
git add docs/onboarding.md
git commit -m "docs(onboarding): developer setup, Cursor workflow, stage model, and handy commands"
git push -u origin dev
When it appears on GitHub, say next and name the next file you want to create.





You said:
next ->testing.md with file create please


ChatGPT said:

Thought for 39s
Perfect — we’ll do only docs/testing.md: create → paste → commit → push.

1) Create the file (inside bannoscakes-ordak-ui)
bash
Copy code
mkdir -p docs
touch docs/testing.md
2) Open docs/testing.md in Cursor and paste this content
markdown
Copy code
# Testing

Testing plan for Ordak covering **Unit**, **Integration**, and **E2E** levels.  
Stage model: **Filling → Covering → Decorating → Packing → Complete**. All writes via **SECURITY DEFINER RPCs**.

---

## Test Levels

### 1) Unit (fast)
Scope: pure functions, small React components, and **RPC behavior** at function-level with a test DB.

Focus:
- **Idempotency**: calling the same RPC twice does not double-write (e.g., `handle_print_barcode` sets `filling_start_ts` once).
- **Invalid stage transitions**: `complete_covering` fails if `stage != 'Covering'` (returns `{ ok:false, code:'INVALID_STAGE' }`).
- **Permissions**: simulate role checks (worker vs supervisor vs admin).
- **Parsing/normalization**: `get_order_for_scan` normalizes `bannos-#####`, `flour-lane-#####`, QR payloads.

### 2) Integration (medium)
Scope: multiple modules + DB + Edge (no external Shopify calls; use fakes).

Focus:
- **Webhook ingestion**: HMAC verification, dedupe on `order_gid`, insert into correct store table, stage set to `Filling`.
- **Inventory hold**: `deduct_on_order_create` writes `inventory_txn`, updates `inventory_items.ats`, enqueues `work_queue`.
- **Queue/Dashboard queries**: `get_queue`, `get_orders_for_dashboard` filter/sort as expected.
- **Unassigned**: `get_unassigned_counts` & `get_unassigned_list` reflect `assignee_id IS NULL`.

### 3) End-to-End (slow)
Scope: a realistic flow using the app + Edge against a test Supabase project.

Scenario:
1. Ingest a test order via the webhook route (or a test helper).
2. **Filling**: print barcode → scan complete.
3. **Covering**: scan complete.
4. **Decorating**: scan complete.
5. **Packing**: scan start → scan complete → order goes to `Complete`.
6. Assertions: stage + timestamps updated; queue excludes completed; unassigned counts reflect assignments.

---

## Test Data & Fixtures

- **Factories/fixtures**:
  - Orders: minimal rows per store with `id`, `due_date`, `priority`, `order_json`.
  - Inventory: a few `inventory_items` with `ats` for holds/reconciliation.
  - Staff: `staff_shared` rows for Worker/Supervisor/Admin.
- **Cleanup**: truncate affected tables between tests to keep independence.

Example cleanup SQL (dev/test only):
```sql
truncate table public.orders_bannos, public.orders_flourlane restart identity cascade;
truncate table public.inventory_txn restart identity cascade;
truncate table public.work_queue restart identity cascade;
truncate table public.stage_events restart identity cascade;
What to Test (Checklist)
RPCs

handle_print_barcode

Sets filling_start_ts if null; second call → { already_done:true }.

Appends stage event (optional if using stage_events).

complete_filling → moves Filling → Covering; sets filling_complete_ts; rejects otherwise.

complete_covering, complete_decorating, start_packing, complete_packing

Happy path + invalid stage + idempotency.

qc_return_to_decorating

Allowed from Packing (and admin from Complete if policy allows); logs reason.

assign_staff

Assigns/changes assignee_id without touching stage.

set_storage

Updates storage; rejects invalid values if list-enforced.

get_order_for_scan

Accepts multiple string forms, returns normalized order subset.

get_unassigned_counts, get_unassigned_list

Reflects rows where assignee_id IS NULL by stage.

Edge/Webhooks

HMAC verification with SHOPIFY_WEBHOOK_SECRET.

Deduplication by order_gid.

On ingest: stage set to Filling, priority computed from due_date, inventory hold enqueued.

Queries

get_queue: excludes Complete; sorting priority DESC, due_date ASC, size ASC, shopify_order_number ASC.

get_orders_for_dashboard: correct period filtering.

Inventory Worker

Processes work_queue items; sets status=done on success, backoff on error; respects max_retries.

Running Tests
Adjust script names to match your package.json.

bash
Copy code
# All tests (default)
npm test

# Unit only
npm run test:unit

# End-to-end
npm run test:e2e
Recommended environment:

Point tests at a separate Supabase project (or schema) to avoid clobbering dev data.

Provide test secrets via .env.test or your CI environment.

Mocks & Fakes
Shopify Admin API: use a fake client/module that records requests instead of hitting the network.

Slack/Sentry/PostHog: stub functions or environment toggles (DISABLE_ANALYTICS=true) to prevent noise.

Time: freeze time for timestamp-sensitive RPC tests.

CI Expectations
On PRs: run unit + integration; E2E optionally nightly or on release candidates.

Fail the job if:

Migrations do not apply cleanly (npx supabase migration up).

Any test fails.

Artifacts: upload test reports / coverage (optional).

Minimal Example Cases (pseudo)
ts
Copy code
// handle_print_barcode
it('sets filling_start_ts once', async () => {
  await rpc.handle_print_barcode('bannos-123', userSupervisor)
  const t1 = await selectStart('bannos-123')
  await rpc.handle_print_barcode('bannos-123', userSupervisor)
  const t2 = await selectStart('bannos-123')
  expect(t1).toEqual(t2) // idempotent
})

// complete_filling invalid stage
it('rejects complete_filling when stage != Filling', async () => {
  await setStage('bannos-123','Covering')
  const r = await rpc.complete_filling('bannos-123', userSupervisor)
  expect(r.ok).toBe(false)
  expect(r.code).toBe('INVALID_STAGE')
})
Notes
Keep tests deterministic and fast; E2E can be slower but should be stable.

Prefer compensating migrations in test setups over destructive resets (except in dedicated test DBs).