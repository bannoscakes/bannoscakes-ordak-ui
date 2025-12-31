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
```

---

## 2) Environment

Create a local env file and fill the values you have:

```bash
cp .env.example .env.local
```

**Required:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL` (e.g., `http://localhost:5173`)

**Edge-only** (set in your local shell or Edge functions settings):
- `SUPABASE_SERVICE_ROLE_KEY`
- `SHOPIFY_BANNOS_TOKEN`, `SHOPIFY_FLOURLANE_TOKEN`
- `SHOPIFY_WEBHOOK_SECRET`
- `SLACK_WEBHOOK_URL`

> Never commit secrets. Client uses anon key; Edge Functions use service role.

---

## 3) Run the App (dev)

```bash
npm run dev
# open the URL that Vite prints (usually http://localhost:5173)
```

---

## 4) Migrations & DB (when you need the DB locally)

```bash
# apply migrations against your dev Supabase project
npx supabase migration up

# create a new migration when you change schema
npx supabase migration new <name>

# dev-only reset (never in prod)
npx supabase db reset
```

---

## 5) Cursor Workflow

1. Open the repo in Cursor
2. Add the `/docs` folder as Context so models follow our rules
3. Use the `dev` branch for daily work; open PRs to `dev`; after review merge to `main`

> **Hotfix workflow reminder**
>
> Even for urgent fixes, never patch `dev` directly. Create a short-lived branch,
> push the commit, and open a focused PR (ideally touching only the files needed
> for the fix). Let the automated checks run on that PR; once they succeed the
> reviewer can merge it into `dev` and follow up with the normal promotion to
> `main`.

---

## 6) Branch & Commit Rules

**Branches:**
- `main` → production (protected)
- `dev` → integration/default
- `feature/<short-name>` → short-lived

**Conventional Commits** (examples):
- `feat(ui): show unassigned counts`
- `fix(rpc): prevent invalid stage transition`
- `docs(ops): add incident runbook`

If Husky is enabled, it will check commit messages and run quick lint/type checks.

---

## 7) Stage Model (how the app behaves)

Single enum stages: **Filling → Covering → Decorating → Packing → Complete**.

- **Filling** starts at barcode print (`handle_print_barcode`) → sets `filling_start_ts`
- **Filling** ends on scan (`complete_filling`) → sets `filling_complete_ts` → stage becomes Covering
- **Covering/Decorating** end on scan; **Packing** has start scan and complete scan
- **Unassigned** is not a stage: it's `assignee_id IS NULL` for the current stage

Read more in:
- `docs/overview.md` (big picture)
- `docs/rpc-surface.md` (all RPCs)
- `docs/schema-and-rls.md` (tables, RLS)
- `docs/data-flows.md` (ingest, inventory, queues)

---

## 8) First Task (practice)

Add a small note to `docs/overview.md` (e.g., clarify a term)

Commit:

```bash
git add docs/overview.md
git commit -m "docs(overview): clarify <your note>"
git push -u origin dev
```

Open a PR from `dev` (or your feature branch) if required by the flow.

---

## 9) Useful Commands

```bash
npm run dev                           # start app
npm run build                         # build app
npm run test                          # run tests (if configured)
npx supabase migration up             # apply DB migrations
npx supabase functions deploy <name>  # deploy an Edge function
```

---

## 10) Ops Contacts

- **On-call / primary**: `<add name/contact>`
- **Escalation channel**: `<add Slack channel>`
- **Runbook**: `docs/operations.md`
