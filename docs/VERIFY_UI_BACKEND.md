# UI ↔ Backend Verification — Master Checklist

**Purpose:** confirm every UI panel reads/writes through the expected RPCs/Views, with no direct table writes, and that Supabase realtime & envs are correct.

---

## 0) Prep

- [ ] Pull latest: `git checkout dev && git pull`
- [ ] Install & sanity: `npm ci && npm run type-check && npm run validate:architecture`
- [ ] Sentry DSN optional; no demo flags enabled.

---

## 1) Database Surface (existence)

Run these in Supabase SQL editor (dev project) and paste results under each box.

### 1.1 Core tables
```sql
select table_schema, table_name
from information_schema.tables
where table_schema='public'
  and table_name in (
    'orders_bannos','orders_flourlane',
    'stage_events','components','audit_log',
    'staff_shared','settings'
  )
order by table_name;
```

**Tables exist (tick items found):**
- [ ] orders_bannos
- [ ] orders_flourlane
- [ ] stage_events
- [ ] components
- [ ] audit_log
- [ ] staff_shared
- [ ] settings

### 1.2 Messaging
```sql
select table_name from information_schema.tables
where table_schema='public' and table_name in ('conversations','messages');
```

- [ ] conversations
- [ ] messages

### 1.3 Realtime publication
```sql
select pubname, schemaname, tablename
from pg_publication_tables
where pubname='supabase_realtime'
  and tablename in ('conversations','messages');
```

- [ ] conversations in publication
- [ ] messages in publication

---

## 2) RPCs & Views (queue, staff, inventory, messaging)

If you can't find a SQL file locally, use the DB itself to verify existence.

### 2.1 Queue / Dashboard

**Search in repo (shell):**
```bash
git grep -nE "get_queue|vw_queue|queue_view|vw_queue_minimal" supabase sql
```

**Check on DB:**
```sql
-- functions
select proname from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and proname in ('get_queue','get_recent_orders');

-- views
select schemaname, viewname
from pg_views where schemaname='public' and viewname like '%queue%';
```

- [ ] get_queue() exists (RPC or stable view wrapper)
- [ ] get_recent_orders() exists (or equivalent)
- [ ] Any queue view (e.g., vw_queue_minimal) exists

**Column check (assignee):**
```sql
-- add assignee_id to queue surface if missing
select column_name
from information_schema.columns
where table_schema='public' and table_name='vw_queue_minimal';
```

- [ ] assignee_id available to UI (if not: add to RPC/View)

*If missing entirely → create a forward-fix migration (see §7 stub).*

### 2.2 Staff
```sql
select proname from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and proname in (
  'get_staff','get_staff_stats','assign_staff_to_order'
);
```

- [ ] get_staff()
- [ ] get_staff_stats()
- [ ] assign_staff_to_order() (or equivalent)

### 2.3 Inventory
```sql
select proname
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and proname in ('get_components','get_low_stock_components','record_component_txn');
```

- [ ] get_components()
- [ ] get_low_stock_components()
- [ ] record_component_txn() (write via RPC only)

### 2.4 Messaging (already audited SECURITY DEFINER ✅)
```sql
select proname from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and proname in ('get_conversations','get_messages','send_message','mark_messages_read','get_unread_count','create_conversation');
```

- [ ] All 6 messaging RPCs exist and are SECURITY DEFINER (you already checked)

---

## 3) Frontend wiring (by page/component)

### 3.1 QueueTable / Dashboard

- [ ] src/components/QueueTable.tsx calls only RPCs (get_queue, assign_staff_to_order)
- [ ] No direct .from().insert|update|delete (guarded by CI, but double-check):
```bash
git grep -nE "\.from\(['\"].+['\"]\)\.(insert|update|delete)\(" src
```

### 3.2 MetricCards / ProductionStatus / RecentOrders

- [ ] All read via RPCs (get_queue, get_recent_orders, stats functions)
- [ ] Unassigned counts use assignee_id === null and RPC returns assignee_id

### 3.3 Monitor pages (Bannos/Flourlane)

- [ ] Data source uses store-scoped queue RPC or view
- [ ] Role routing still single-URL; monitor pages reachable via app state, not role URLs

### 3.4 Staff pages / analytics

- [ ] Staff list from get_staff()
- [ ] Analytics numbers from get_staff_stats()
- [ ] Any "Assign" action hits assign_staff_to_order RPC

### 3.5 Inventory components

- [ ] Components list via get_components()
- [ ] Low stock call via get_low_stock_components()
- [ ] Any mutation (add/adjust) through record_component_txn() (no direct writes)

### 3.6 Messaging

- [ ] UI uses get_conversations, get_messages, send_message, mark_messages_read, get_unread_count
- [ ] Realtime wired (no flicker; background refresh pattern in place)

---

## 4) Realtime & Environment

- [ ] Root loads / (no /false)
- [ ] Sign-in/out works instantly for Staff/Supervisor/Admin
- [ ] Realtime: send a message A→B → appears without refresh
- [ ] .env.local / staging env has: VITE_APP_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- [ ] Sentry: (optional) throw test error → appears in staging project

---

## 5) Tests & CI

- [ ] npm run test:e2e passes (auth routing + messaging send)
- [ ] CI has guard step "Guard RPC-only writes" and it runs before build
- [ ] Supabase preview job filtered to SQL-additions only (non-SQL PRs skip preview)

---

## 6) Findings / Gaps

Record anything missing or mismatched here with action:

| Area | Missing/Issue | Action | Owner | PR |
|------|---------------|--------|-------|-----|
| Queue RPC | assignee_id not returned | Add column to RPC/View | | |
| ... | ... | ... | ... | ... |

---

## 7) Forward-Fix Migration Stub (use only if something is missing)

Create `supabase/sql/0xx_queue_surface_fix.sql`:

```sql
-- Ensure queue view + RPC expose assignee_id
do $$
begin
  -- example: augment view if exists
  if exists (select 1 from pg_views where schemaname='public' and viewname='vw_queue_minimal') then
    execute $v$
      create or replace view public.vw_queue_minimal as
      select o.id, o.store, o.stage, o.title, o.priority, o.due_date, o.assignee_id
      from public.orders o
      -- add your filters/joins here
    $v$;
  end if;

  -- example: if you use an RPC
  create or replace function public.get_queue()
  returns table(
    id uuid, store text, stage text, title text, priority text, due_date timestamptz, assignee_id uuid
  )
  language sql
  security definer
  as $$
    select id, store, stage, title, priority, due_date, assignee_id
    from public.vw_queue_minimal;
  $$;

end$$;
```

**Never edit old migrations; always add a new forward-fix.**

---

## 8) Sign-off

- [ ] All boxes above checked or tracked in Findings table
- [ ] Commit this file: docs/VERIFY_UI_BACKEND.md
- [ ] If any fixes needed, open small PRs per gap (one PR per fix)

---

## Quick search helpers

```bash
# Where are queue calls?
git grep -n "get_queue" src supabase

# Messaging RPC calls in UI
git grep -nE "get_messages|send_message|get_conversations|mark_messages_read|get_unread_count" src

# Any view or RPC definitions in SQL
git grep -nE "create or replace view|create or replace function" supabase/sql
```
