# Performance & SLAs

Targets and operating rules so the system stays fast and reliable.

---

## Targets (SLOs)

| Area | Target | Scope / Notes |
|---|---|---|
| **Queue load** | **p95 < 200ms** | From dashboard/queue request to response (server time). |
| **Order creation** | **p95 < 500ms** | From webhook receive → DB commit (Edge timing). |
| **Inventory push** | **p95 < 2s** | Worker time to push ATS/OOS update to Shopify. |
| **Webhook success** | **≥ 99.5%** | After built-in retries; alert on rolling 10-min error rate > 1%. |
| **Uptime (app + Edge)** | **99.9% / month** | Max downtime ≈ 43.8 min / month. |
| **Dashboard freshness** | **≤ 1s staleness** | After a scan/print, UI reflects state within 1 second. |
| **Front-end UX** | **LCP p75 < 2.5s, INP p75 < 200ms** | On production devices / network. |
| **Worker backlog** | **< 500 pending** | Or **oldest pending < 15 min**; alert if exceeded. |

> SLA = external promise, SLO = our target, SLI = the measured metric. Error budget for 99.9% uptime ≈ **0.1%** of the month.

---

## What we measure (SLIs)

- **Server latency**: p50/p95/p99 for queue, dashboard, and RPC endpoints.
- **Webhook pipeline**: receive → validate → dedupe → insert; success rate and latency.
- **Worker throughput**: items/min, backlog size, oldest pending age, retry rate.
- **DB health**: slow queries (>100ms), locks, row counts.
- **Front-end**: LCP, INP, CLS (from RUM via PostHog).
- **Errors**: Sentry issue rate per endpoint/function.

---

## Instrumentation

- **Edge/Server**: log structured timings `{ route, stage, t_ms, ok }`.  
- **DB**: keep lightweight `stage_events` and optional `api_logs` table for timings.  
- **Front-end**: PostHog Web Vitals plugin (LCP/INP).  
- **Alerts**: Slack webhook for threshold breaches.

Example `api_logs` (optional):
```sql
create table if not exists public.api_logs (
  id bigserial primary key,
  at timestamptz default now(),
  route text,
  ok boolean,
  t_ms int,
  meta jsonb default '{}'::jsonb
);
create index if not exists idx_api_logs_route_time on public.api_logs (route, at desc);
```

Compute latency quickly:

```sql
-- p95 today for queue route
select percentile_cont(0.95) within group (order by t_ms)
from public.api_logs
where route='GET /queue' and at::date = current_date;
```

---

## Alert Thresholds (Slack)
Queue p95 > 300ms for 5 min

Webhook 5xx > 1% over 10 min or consecutive failures for one store

Worker backlog > 500 or oldest pending > 15 min

DB slow queries > 50/min above 100ms

Front-end LCP p75 > 3s over last 1h

Dashboards (suggested)
Latency (p50/p95) by route (queue, dashboard, each RPC)

Webhook: success %, dedupe %, latency

Worker: backlog, items/min, retry/error counts

Front-end: LCP/INP trends

Incidents: count, MTTR

Load & Stress Testing
Tools: k6 or autocannon for HTTP; seed DB with 5–20k orders.

Scenarios:

Queue polling at 10–50 RPS.

Webhook bursts (20–100/min for 5 min).

Worker spikes (1k pending) until backlog clears.

Pass criteria: latencies stay within targets; no error rates > 1%; backlog drains within SLA.

Tuning Playbook
DB

Use partial indexes already defined for unassigned and queue queries.

Periodically run EXPLAIN ANALYZE on slow queries.

Avoid N+1 reads from the UI: batch queries, return what you need in one RPC.

Edge/Worker

Make RPCs idempotent; prefer now() set in SQL, not JS.

Control concurrency and backoff; cap retries; dedupe by dedupe_key.

Front-end

Keep bundle < 300 kB gzipped; lazy-load heavy charts; cache GETs; list virtualization.

Memoize expensive components; avoid unnecessary re-renders on scan events.

Reporting Cadence
Daily: scan Slack alerts; glance at backlog/latency dashboards.

Weekly: email/post a short perf summary (top slow endpoints, action items).

Monthly: SLA report (uptime, error budget burn, incidents).

## Quick SQL Snippets

```sql
-- Worker backlog by status
select status, count(*) from public.work_queue group by status;

-- Oldest pending item age
select coalesce(extract(epoch from (now()-min(created_at)))/60, 0) as oldest_min
from public.work_queue where status='pending';

-- Webhook success rate (if logged in api_logs)
select 100.0*avg(case when ok then 1 else 0 end) as success_pct
from public.api_logs
where route='POST /webhook/orders/create' and at > now() - interval '10 minutes';
```

---

## Uptime Budget Reference
Availability	Allowed downtime / month
99.9%	43.8 minutes
99.95%	21.9 minutes
99.99%	4.4 minutes