# RPC Surface

This document lists all **SECURITY DEFINER RPCs** exposed to the app and the Edge Functions.  
Model matches the simplified stage flow: **Filling → Covering → Decorating → Packing → Complete** (no `_pending`/`_in_progress` statuses). All writes go through RPCs; **no direct table writes**.

---

## Conventions

- **Order ID (`id`):** human-readable, store-prefixed (`bannos-12345`, `flourlane-67890`).  
- **Auth:**  
  - **Client app** uses Supabase client with user auth (token signed by **anon** key). RPCs enforce role checks internally.  
  - **Edge Functions** use **service role** key (webhooks, migrations, reconciliation).  
- **Idempotency:** write RPCs only set timestamps if `NULL`; repeat calls return `already_done=true`.  
- **Errors:** RPCs return structured errors with `code` + `message`. We use a small set:
  - `INVALID_STAGE`, `ALREADY_DONE`, `PERMISSION_DENIED`, `NOT_FOUND`, `BAD_INPUT`, `CONFLICT`

Return envelopes:

```ts
type Ok<T> = { ok: true; data: T }
type Err    = { ok: false; code: string; message: string }

type RpcResult<T> = Ok<T> | Err
