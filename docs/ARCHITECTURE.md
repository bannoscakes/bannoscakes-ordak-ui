# Architecture

High-level system architecture for Ordak production management system.

## System Overview

```mermaid
flowchart TB
    subgraph External["External Systems"]
        Shopify["🛒 Shopify Stores"]
        Bannos["Bannos Store"]
        Flourlane["Flourlane Store"]
        Shopify --> Bannos
        Shopify --> Flourlane
    end

    subgraph Users["User Browsers"]
        Staff["👷 Staff<br/>(Mobile/Scanner)"]
        Supervisor["👔 Supervisor<br/>(Queue Monitor)"]
        Admin["⚙️ Admin<br/>(Full Access)"]
    end

    subgraph Supabase["Supabase Backend"]
        subgraph Edge["Edge Functions"]
            WebhookBannos["shopify-webhooks-bannos"]
            WebhookFlourlane["shopify-webhooks-flourlane"]
            ProcessInbox["process-inbox"]
            QueueWorker["queue-worker"]
        end

        subgraph DB["PostgreSQL Database"]
            Orders["orders_bannos<br/>orders_flourlane"]
            Staff_DB["staff_shared"]
            Inventory["inventory_items<br/>bom"]
            WorkQueue["work_queue"]
            Messaging["conversations<br/>messages"]
        end

        Auth["🔐 Auth<br/>(Role-based RLS)"]
        Realtime["📡 Realtime<br/>Subscriptions"]
    end

    subgraph Frontend["React Frontend"]
        Router["Role-based Router"]

        subgraph Pages["Key Pages"]
            Queue["Queue View"]
            Monitor["Monitor Pages"]
            OrdersMgmt["Orders Management"]
            InventoryMgmt["Inventory"]
            Analytics["Analytics"]
            Settings["Settings"]
        end
    end

    %% External to Supabase
    Bannos -->|"orders/create webhook"| WebhookBannos
    Flourlane -->|"orders/create webhook"| WebhookFlourlane
    WebhookBannos --> ProcessInbox
    WebhookFlourlane --> ProcessInbox
    ProcessInbox --> Orders
    ProcessInbox --> WorkQueue
    QueueWorker --> WorkQueue
    QueueWorker --> Inventory

    %% Database connections
    Orders --> Realtime
    Messaging --> Realtime
    Auth --> DB

    %% Frontend connections
    Users --> Router
    Router --> Pages
    Pages -->|"RPC calls"| DB
    Realtime -->|"Live updates"| Pages
    Auth -->|"Session"| Router
```

## Data Flows

### 1. Order Ingestion (Shopify → UI)

```mermaid
sequenceDiagram
    participant S as Shopify
    participant W as Webhook Edge Function
    participant I as webhook_inbox
    participant P as process-inbox
    participant DB as PostgreSQL
    participant R as Realtime
    participant UI as React UI

    S->>W: POST orders/create
    W->>I: Insert raw payload
    W-->>S: 200 OK (fast response)

    P->>I: Poll unprocessed
    P->>DB: Insert order (stage=Filling)
    P->>DB: Enqueue inventory hold
    DB->>R: Broadcast change
    R->>UI: Push update
    UI->>UI: Re-render queue
```

### 2. Production Stage Transition (Scan → Update)

```mermaid
sequenceDiagram
    participant Staff as Staff (Scanner)
    participant RPC as SECURITY DEFINER RPC
    participant DB as PostgreSQL
    participant R as Realtime
    participant Mon as Supervisor Monitor

    Staff->>RPC: complete_filling(order_id)
    RPC->>RPC: Validate stage & role
    RPC->>DB: UPDATE stage='Covering'
    RPC->>DB: SET filling_complete_ts
    RPC-->>Staff: {ok: true}
    DB->>R: Broadcast change
    R->>Mon: Push update
    Mon->>Mon: Re-render queue
```

## Component Details

### Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `shopify-webhooks-bannos` | Shopify webhook | Receive Bannos orders |
| `shopify-webhooks-flourlane` | Shopify webhook | Receive Flourlane orders |
| `process-inbox` | Database webhook / cron | Parse orders, create records |
| `queue-worker` | Scheduled | Process inventory holds |

### Database Tables (Key)

| Table | Purpose |
|-------|---------|
| `orders_bannos` / `orders_flourlane` | Order records per store |
| `staff_shared` | Staff profiles & roles |
| `inventory_items` | Component stock levels |
| `bom` | Bill of Materials |
| `work_queue` | Async job queue |
| `conversations` / `messages` | Messaging system |

### Role Permissions

| Role | Access |
|------|--------|
| **Staff** | Own assignments, scan operations, messaging |
| **Supervisor** | All staff access + queue management, reassignment |
| **Admin** | Full access + settings, analytics, inventory |

### Frontend Pages

| Page | Primary Users | Purpose |
|------|---------------|---------|
| Queue View | Staff | Personal work queue |
| Monitor | Supervisor | Live production overview |
| Orders | Admin | Order management & search |
| Inventory | Admin | Stock & BOM management |
| Analytics | Admin | Production metrics |
| Settings | Admin | System configuration |

## Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Browser)                       │
│  • Anon key only (VITE_SUPABASE_ANON_KEY)                   │
│  • No direct table writes                                    │
│  • All mutations via RPC                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Auth + RLS                       │
│  • JWT contains role claim                                   │
│  • RLS policies check (select auth.uid())                    │
│  • Row-level access control                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 SECURITY DEFINER RPCs                        │
│  • check_user_role() validates permissions                   │
│  • Business logic enforced server-side                       │
│  • Audit trail via stage_events                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL                              │
│  • Tables protected by RLS (no direct client writes)         │
│  • Service role used only by Edge Functions                  │
└─────────────────────────────────────────────────────────────┘
```

## Production Stage Flow

```
┌──────────┐    ┌──────────┐    ┌────────────┐    ┌─────────┐    ┌──────────┐
│ Filling  │───▶│ Covering │───▶│ Decorating │───▶│ Packing │───▶│ Complete │
└──────────┘    └──────────┘    └────────────┘    └─────────┘    └──────────┘
     │               │                │                │
     ▼               ▼                ▼                ▼
• Print barcode  • Scan start    • Scan start    • Scan start
  (starts ts)    • Scan complete • Scan complete • QC check
• Scan complete                        ▲          • Set storage
                                       │          • Print packing slip
                                       │          • Scan complete
                                       │
                                  QC Return
                               (if issues found)
```

### Stage Details

| Stage | Start Action | End Action | Timestamps |
|-------|--------------|------------|------------|
| **Filling** | Print barcode | Scan complete | `filling_start_ts`, `filling_complete_ts` |
| **Covering** | Scan start | Scan complete | `covering_start_ts`, `covering_complete_ts` |
| **Decorating** | Scan start | Scan complete | `decorating_start_ts`, `decorating_complete_ts` |
| **Packing** | Scan start | Scan complete | `packing_start_ts`, `packing_complete_ts` |
| **Complete** | - | - | `completed_at` |

### Stage Workflow Details

1. **Filling**
   - Print barcode → sets `filling_start_ts`
   - Scan complete → sets `filling_complete_ts`, advances to Covering

2. **Covering**
   - Scan start → sets `covering_start_ts`
   - Scan complete → sets `covering_complete_ts`, advances to Decorating

3. **Decorating**
   - Scan start → sets `decorating_start_ts`
   - Scan complete → sets `decorating_complete_ts`, advances to Packing

4. **Packing**
   - Scan start → sets `packing_start_ts`
   - QC check → verify decoration quality
   - Set storage location
   - Print packing slip
   - Scan complete → sets `packing_complete_ts`, advances to Complete

5. **QC Return**
   - If issues found during Packing QC check
   - Returns order from Packing → Decorating
   - Logs reason for return

### Key Points

- Each stage has assigned staff (`assignee_id`)
- "Unassigned" = `assignee_id IS NULL` (not a separate stage)
- QC can return orders from Packing → Decorating
- All transitions logged with timestamps
- RPCs are idempotent (re-scanning returns `already_done: true`)
