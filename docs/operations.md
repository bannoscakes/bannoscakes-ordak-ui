# Operations

Practical runbook for daily ops: environments, secrets, deploys, webhooks, workers, monitoring, backups, and incident response.  
Stage model: **Filling → Covering → Decorating → Packing → Complete**. All writes via **SECURITY DEFINER RPCs**.

---

## Environments

- **Local (dev)**: Vite dev server + a dev Supabase project.
- **Staging**: mirrors prod schema; used for verification before releases.
- **Production**: protected `main` branch deploys; backups with PITR (7 days).

### Branch & CI
- Work on `dev` → review → merge to `main`.
- CI must pass tests & migrations before merge.

---

## Secrets & Config

Keep secrets out of the client. Client uses **anon** key; Edge Functions use **service role**.

**Required (examples, see `.env.example`):**
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` *(Edge only)*
- `SHOPIFY_BANNOS_TOKEN`, `SHOPIFY_FLOURLANE_TOKEN`
- `SHOPIFY_WEBHOOK_SECRET`
- `SLACK_WEBHOOK_URL`
- (optional) `SENTRY_DSN`, `POSTHOG_KEY`

> Rotate secrets when staff leave or if leaked. Prefer environment-level config (Vercel project vars, Supabase secrets).

---

## Deploy Playbooks

### A) Database / RPCs (Supabase)
```bash
# Apply migrations
npx supabase migration up

# Create a new migration
npx supabase migration new <name>

# Local dev reset (never in prod)
npx supabase db reset
B) Edge Functions (webhooks, workers)
Replace <func> with your function name, e.g. orders-webhook, inventory-worker.

bash
Copy code
# Local serve a function (dev)
npx supabase functions serve <func>

# Deploy a function
npx supabase functions deploy <func>
C) Frontend
bash
Copy code
# Build locally
npm run build

# Deploy (wire this to your target provider)
npm run deploy:staging   # or
npm run deploy:prod
Post-deploy smoke (prod & staging):

Open app → load queue/dashboard.

Ingest a test order (staging) → barcode print → complete Filling → start/complete Packing.

Check Sentry/Slack for errors.

Webhooks (Shopify)
Each store uses its own token + HMAC secret.

Verify signatures in Edge using SHOPIFY_WEBHOOK_SECRET.

Replay from Shopify Admin if an event fails (use dedupe by order_gid).

If you must pause webhooks (maintenance), disable the route in Edge or in Shopify Admin, then re-enable and replay.

Quick checks

Verify latest delivery status in Shopify.

Edge logs show 200 with timings; 5xx means Shopify will retry.

Workers & Queues
Table: work_queue (topics: inventory_push, reconcile, etc.)

Worker (Edge/cron) loop:

Select pending eligible items: status='pending' AND (next_retry_at IS NULL OR next_retry_at<=now())

Lock one (locked_at, locked_by), process, push to Shopify

On success → status='done'

On error → status='error', increment retry_count, set next_retry_at (backoff)

SQL snippets

sql
Copy code
-- Backlog by status
select status, count(*) from work_queue group by status;

-- Stuck locks (>15m)
select * from work_queue
where status='pending' and locked_at < now() - interval '15 minutes';

-- Unlock everything for emergency (use with care)
update work_queue set locked_at=null, locked_by=null where status='pending';
Monitoring & Alerts
Sentry: exceptions from Edge RPCs/webhooks/worker.

Slack: critical alerts (webhook failures, worker backlog growth).

PostHog: feature usage (prints, scans, assignments).

Health checks

/edge/health → up + DB ping latencies

Worker heartbeat: last processed at, items/min, error rate

Severity

P1 (prod down): follow Incident Procedure (below).

P2 (degraded): mitigate (scale backoff, pause a feature), fix within the day.

P3 (minor): plan in next release.

Backups & Recovery
Daily backups + PITR (7 days) in Supabase.

Restore plan (high level):

Restore to a new project at timestamp.

Point staging to the restored DB and verify.

If needed, cut over app env to restored DB (update connection + rotate secrets).

Announce read-only window while reconciling deltas.

Incident Procedure (quick)
Acknowledge: create incident thread (include timestamps, what changed).

Stabilize:

Roll back app: git revert last deploy → redeploy.

If schema-breaking caused it, apply compensating migration (see migration-order.md).

Pause webhooks if they amplify the incident; queue replays for after fix.

Communicate: post updates in Slack every 15–30 min until resolved.

Recover: re-enable webhooks; drain work_queue; verify orders can print/scan/complete.

Postmortem: doc the timeline, root cause, follow-ups.

Routine Ops
Key rotation: service role, Shopify tokens, webhook secret (every 90 days or on staff change).

Dependency updates: weekly in dev; deploy after passing tests.

Log review: check Sentry errors & worker backlog daily.

Release cadence: small, reversible changes; migrations minimal and idempotent.

Troubleshooting (quick)
Tailwind v4 build oddities → see checklists.md.

Supabase auth/connection → re-check URL/keys; confirm RLS isn’t blocking expected reads.

Webhook “invalid signature” → verify SHOPIFY_WEBHOOK_SECRET, shop domain mapping, replay.

Stage errors (INVALID_STAGE) → confirm current stage and use the correct RPC (Filling must end before Covering starts).

Inventory not syncing → see worker backlog; requeue stuck items.

Contacts
Primary on-call: [add name / email / phone]

Escalation: [add backup contact or Slack channel]

Runbook: see runbook.md for deep-dive emergency steps.