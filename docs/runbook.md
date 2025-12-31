# Runbook (Production Incidents)

Practical, copy-pasteable steps to diagnose and recover.
Stage model: **Filling → Covering → Decorating → Packing → Complete**.
**Unassigned** is not a stage (it means `assignee_id IS NULL`).
All mutations go through **SECURITY DEFINER RPCs**; clients are read-only via RLS.

---

## 0) Severity & Ownership

- **P1 – Production down / orders blocked**
  - Examples: webhook ingestion failing for both stores; scans can't change stage; DB outage.
  - **Goal:** restore service quickly (temporary measures OK).
- **P2 – Degraded**
  - Examples: worker backlog growing; one store failing webhooks; dashboard slow (>p95 300ms).
- **P3 – Minor**
  - Examples: a single RPC idempotency edge; one view slow for some users.

**On-call:** `<add name>` • **Escalation:** `<add Slack channel>`.

---

## 1) 10-Minute Triage Checklist

**A. What's broken?**
- Can we **ingest** a test order? (staging)
- Can we **print** barcode and **scan** to complete Filling?
- Is the **dashboard/queue** loading?

**B. Quick signals**

```bash
# Webhook + worker signals (Edge logs / monitoring)
# replace with your provider's log query if needed
```

```sql
-- DB health (psql or SQL editor)
-- Worker backlog by status
select status, count(*) from public.work_queue group by status;

-- Oldest pending minutes
select coalesce(extract(epoch from (now()-min(created_at)))/60, 0) as oldest_min
from public.work_queue where status='pending';

-- Orders present? latest row timestamps
select max(created_at) from public.orders_bannos;
select max(created_at) from public.orders_flourlane;
```

**C. Decide the lane**
- **App/UI issue** → roll back app first.
- **Edge/webhook issue** → pause webhooks, fix HMAC/secrets, replay.
- **DB/migrations** → compensate/restore path below.

---

## 2) P1 – App/UI Rollback (DB healthy)

1. Communicate in Slack: "P1 investigating – app" (timestamp + symptoms).
2. Rollback app code:

```bash
git revert <bad-commit-or-tag>
npm run deploy:prod
```

3. Smoke (staging or prod if safe): queue loads, print barcode, complete Filling, start/complete Packing.
4. Watch Sentry/Slack for 15–30 min.
5. Post update in Slack (resolved + follow-ups).

---

## 3) P1 – Edge/Webhook Failure

Typical causes: missing metafield, wrong store token, route disabled, database errors.

**Freeze amplification**
- Disable the webhook route temporarily (Shopify will retry later).

**Verify**
- Check Supabase Edge Function logs for error codes.
- In Shopify Admin → Webhooks → Recent deliveries (see error messages).

**Fix**
- Verify secrets:
  - `SHOPIFY_BANNOS_TOKEN`, `SHOPIFY_FLOURLANE_TOKEN`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Verify Shopify Flow is creating `ordak.kitchen_json` metafield.
- Redeploy the Edge function after updating secrets.

**Recover**
- Re-enable route.
- In Shopify Admin replay failed deliveries.

**Sanity**
- Ingest a test order end-to-end; confirm `orders_*` tables updated.

---

## 4) P1 – DB / Migration Problem

**Freeze writes**
- Disable webhook routes.
- Announce read-only (if needed).

**Compensate if possible**
- Prefer forward compensation: add back dropped columns as nullable; avoid destructive down in prod.

**Restore path (PITR)**
1. Pick a timestamp before incident (UTC).
2. Supabase: Restore to a new project at that time.
3. Point staging env to the restored DB → run smoke tests / sanity SQL:

```sql
select 'bannos' as store, count(*) from public.orders_bannos
union all
select 'flourlane', count(*) from public.orders_flourlane;
```

4. Cut over production: update `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; rotate keys; redeploy.
5. Re-enable webhooks and replay; monitor Sentry/Slack 30–60 min.

(Full details in `backup-recovery.md`.)

---

## 5) Worker Backlog / Inventory Not Updating

Symptoms: `work_queue` growing or `oldest_min > 15`.

**Inspect**

```sql
select status, count(*) from work_queue group by status;
select coalesce(extract(epoch from (now()-min(created_at)))/60,0) as oldest_min
from work_queue where status='pending';

-- Stuck locks > 15 min
select * from work_queue
where status='pending' and locked_at < now() - interval '15 min';
```

**Remediate**
- Increase concurrency / instance count for the worker.
- Unlock stuck rows (use carefully):

```sql
update work_queue set locked_at=null, locked_by=null
where status='pending' and locked_at < now() - interval '15 min';
```

- Backoff tune: ensure exponential; cap retries.
- Reconcile job if ATS drift is suspected.

---

## 6) Stage/RPC Issues

**Invalid stage errors:**

Confirm current stage and call the correct RPC order:
- **Filling**: `handle_print_barcode` → `complete_filling`
- **Covering**: `complete_covering`
- **Decorating**: `complete_decorating`
- **Packing**: `start_packing` → `complete_packing`
- **QC return**: `qc_return_to_decorating` (from Packing; admin from Complete if policy allows).

**Idempotency**
- Re-prints/scans should return `already_done=true` and not move timestamps backward.

---

## 7) Assignment / "Unassigned" Cards Wrong

**Definition:** Unassigned = `assignee_id IS NULL` for the row's current stage.

**Check**

```sql
-- Counts by stage (example for Bannos)
select stage, count(*) from public.orders_bannos
where assignee_id is null and stage <> 'Complete'
group by stage order by stage;
```

If counts differ from UI, check the UI query / RPC (`get_unassigned_counts`, `get_unassigned_list`).

---

## 8) Monitoring & Alerts (quick)

- **Queue p95 > 300ms** for 5 min → investigate slow RPC/DB.
- **Webhook 5xx > 1%** over 10 min or repeated store failures → verify secrets and route.
- **Worker backlog > 500** or oldest > 15 min → scale worker + unlock policy.
- **LCP p75 > 3s** → front-end regression.

(Thresholds and dashboards in `performance-slas.md`.)

---

## 9) Comms Templates

**Start**
> P1 – Investigating. Symptom: `<short>`. Started at `<time>`. Next update in 15 min.

**Mitigation**
> Mitigating by `<action>`. ETA for verification `<time>`.

**Resolved**
> Resolved at `<time>`. Root cause: `<short>`. Follow-ups: `<1-3 bullets with owners+dates>`.

---

## 10) After Action

Within 48h:
1. Timeline (UTC)
2. Root cause analysis
3. What helped / what didn't
4. Concrete follow-ups (owners + due dates)
5. Update tests / monitoring / docs if gaps found

---

## Appendix – Handy SQL

```sql
-- Orders by stage (both stores example)
select 'bannos' store, stage, count(*) from public.orders_bannos group by stage
union all
select 'flourlane', stage, count(*) from public.orders_flourlane group by stage;

-- Latest successful stage events (if used)
select order_id, action, at from public.stage_events order by at desc limit 50;
```
