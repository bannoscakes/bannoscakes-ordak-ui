# Backup & Recovery

Disaster-readiness for Ordak. Goals: keep data safe, restore fast, and make cutovers predictable.

- **Stage model:** Filling → Covering → Decorating → Packing → Complete  
- **Writes:** via SECURITY DEFINER RPCs only  
- **Back end:** Supabase (managed Postgres + optional Storage)  

---

## Objectives

- **RPO (data loss tolerance):** ≤ 24h (typical via PITR < 24h; tighter possible if needed)  
- **RTO (time to recover):** ≤ 4h (target; measured during drills)  
- **Retention:** PITR window **7 days** (managed by Supabase). Optional cold exports below.

---

## What’s Backed Up

- **Database (Postgres)**: Managed by Supabase with **PITR** (Point-in-Time Recovery) covering the last **7 days**.  
- **Schema & Migrations**: In Git (repo `bannoscakes-ordak-ui`, `/supabase/migrations/**`).  
- **Edge Functions**: In Git; redeployed on restore.  
- **App**: In Git; redeployed on restore.  
- **Storage (if used)**: Supabase Storage buckets (e.g., `order_photos`). Plan below covers optional exports.

> Secrets (service role, Shopify tokens, webhook secret) are **not** in backups; they live in environment config (Vercel/Supabase project settings).

---

## Routine Backups (managed + optional)

- **Managed PITR (default):** enabled in Supabase → allows restore to any timestamp in last **7 days**.  
- **Optional weekly cold export (recommended):**
  - Dump schema-only: keep lightweight `schema.sql` in repo (already via migrations).
  - Monthly data export (selected tables) to encrypted cloud storage (optional).

---

## Verify Backups (weekly quick check)

1. Confirm PITR window is **7 days** in Supabase project settings.  
2. Run a **schema sanity** on production: do expected tables/enums exist?  
3. Confirm the latest **migration** directory exists in Git and matches production schema version.

---

## Recovery Runbook (Database)

> Use this when data is corrupted, deleted, or you need to roll back to a safe point.

### 0) Stabilize / Freeze Writes
- Put the app in **read-only** (if available) or temporarily **disable** write paths:
  - Disable webhook routes in Edge (Shopify will retry).
  - Announce maintenance banner to staff.

### 1) Choose a Restore Point
- Pick a **timestamp** (UTC) before the incident (e.g., 10–30 minutes earlier).

### 2) Restore to a New DB
- In Supabase: **Restore to a new project** (or fork/clone with PITR timestamp).  
- Name it clearly, e.g., `ordak-prod-restore-YYYYMMDD-HHMM`.

### 3) Wire Staging to the Restored DB
- Update **staging** environment variables to point to the restored DB URL/keys.  
- Run schema sanity checks and smoke tests against staging with the restored data:
  - Select counts by store:
    ```sql
    select 'bannos' as store, count(*) from public.orders_bannos
    union all
    select 'flourlane', count(*) from public.orders_flourlane;
    ```
  - Check last order ingested timestamps:
    ```sql
    select max(created_at) as last_bannos from public.orders_bannos;
    select max(created_at) as last_flourlane from public.orders_flourlane;
    ```
  - Validate RPC no-ops work (e.g., duplicate barcode print returns already_done).

### 4) Cut Over Production
- Update **production** environment variables (Vercel + Edge) to point to the restored DB:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - Edge-only: `SUPABASE_SERVICE_ROLE_KEY`
- **Rotate keys** (recommended when cutting over): new service role key, webhook secret.
- Re-enable **Shopify webhooks** and **replay** missed deliveries (Shopify Admin).  
- Redeploy Edge Functions and the frontend.

### 5) Post-Restore Checklist
- Ingest a test order → barcode print → complete Filling → start/complete Packing.  
- Confirm `get_queue` excludes completed orders; unassigned counts reflect assignments.  
- Watch Sentry and Slack for errors for at least 30–60 minutes.  
- Capture the actual **RTO** measured.

---

## Recovery Runbook (Storage) — if used

If using Supabase **Storage** for `order_photos` or media:

- **Backups (optional):** nightly export the bucket to an external encrypted bucket (script/cron).  
- **Restore:** sync back the files to a fresh bucket and ensure public policies/paths match.  
- **Integrity:** spot-check signed URL RPCs and a few images in the UI.

---

## “Small” Rollback (App Only)

If the database is healthy but a **release** broke behavior:

1. Roll back app:
   ```bash
   git revert <bad-commit-or-tag>
   npm run deploy:prod
   ```
2. If a migration was involved but can be left in place → deploy a code-only revert that is compatible.
3. Monitor Sentry and Slack.

---

## Exercises / Drills

- **Quarterly DR drill** (recommended): simulate DB loss, restore to a new project, point staging, run smoke tests; measure RTO.
- **Monthly**: verify PITR window and the ability to create a restore project.

---

## Roles & Responsibilities

- **Primary on-call**: `<add name/contact>`
- **Secondary/backup**: `<add name/contact>`
- **Escalation channel**: `<add Slack channel>`

---

## Data Retention (suggested)

- **PITR**: 7 days (managed)
- **Cold exports** (optional): Weekly for 4 weeks, Monthly for 6 months
- **Logs**: App logs in provider default window; export critical audit logs if required

---

## After-Action (Postmortem)

Within 48 hours of a real incident:

1. Timeline of events
2. Root cause
3. What worked / what didn't
4. Concrete follow-ups (owners + dates)

## Quick Commands / Checks

```sql
-- Orders present?
select count(*) from public.orders_bannos;
select count(*) from public.orders_flourlane;

-- Latest order ingestion by store:
select max(created_at) from public.orders_bannos;
select max(created_at) from public.orders_flourlane;

-- Work queue health:
select status, count(*) from public.work_queue group by status;
```

See `docs/operations.md` for day-to-day ops and incident response details.
