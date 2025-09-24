# Flip to Real RPC — Ordak v2

This guide explains how to migrate **one RPC at a time** from mocks to the real backend safely, using the neutral facade (`src/lib/rpc.ts`) and the feature flag `VITE_USE_MOCKS`.

---

## Current state (baseline)
- Facade: `src/lib/rpc.ts` selects **mocks** while `VITE_USE_MOCKS=true`.
- Real module scaffold: `src/lib/rpc.real.ts` exports the same function names/signatures and currently **throws** (by design) to prevent accidental use.
- Guards:
  - CI step + shell script: blocks direct `@/mocks/rpc` imports.
  - Vitest guard: fails if any `from "@/mocks/rpc"` appears in `src/**`.
- Envs:
  - Staging (Preview on Vercel): `VITE_USE_MOCKS=true`
  - Production: will also start as `true` until real endpoints are wired & verified.

---

## Migration principles
1. **One RPC per PR** (small, reviewable): `get_queue` → `get_order_for_scan` → `advance_stage` → `handle_print_barcode`.
2. **Identical signatures** between `rpc.real.ts` and mocks: the facade remains stable; call sites don't change.
3. **No PII in logs**; redact customer info in errors.
4. **RLS first**: real writes must go through **SECURITY DEFINER** RPCs or server-side endpoints; never direct client writes.
5. **Flip with an env only** (`VITE_USE_MOCKS=false`), no code toggles.

---

## Per-RPC checklist (repeat for each RPC)
1. **Implement in `src/lib/rpc.real.ts`**  
   - Import your client(s) (e.g., Supabase).  
   - Map inputs/outputs to match the mock result shape.  
   - Return data; do not throw for happy-path.

2. **Local smoke**  
   - Keep `VITE_USE_MOCKS=true` (still hitting mocks).  
   - Run: `npm run build` and app flows as before.

3. **Staging verification toggle (temporary)**  
   - In **Vercel Preview env**, set `VITE_USE_MOCKS=false` **for a test deploy**.  
   - Verify the single migrated RPC in the UI (or via a minimal script).  
   - If anything misbehaves, set it back to `true`.

4. **Rollback is trivial**  
   - Flip env back to `true` → facade routes to mocks instantly.

5. **CI/Guards remain**  
   - No one can import `@/mocks/rpc` directly.  
   - The facade stays the only import point.

---

## Shapes & contracts

### `get_queue()`
- **Input:** optional filters (store/week) *(if any in mocks)*  
- **Output:** array of queue items with keys: `{ id, store, stage, title, priority, due_date, ... }`  
- **Note:** date handling is **date-only** in our system.

### `get_order_for_scan(barcode: string)`
- **Output:** minimally `{ id, store, stage, title }` + whatever the scanner UI needs.

### `advance_stage(orderId, context)` (write)
- Must call a **server-side function** with RLS-safe validation.  
- No direct client writes to tables.

### `handle_print_barcode(orderId)`
- Server event/logging only; do not leak PII to client logs.

---

## Supabase notes (if you use it)
- Reads: anon key OK for **read-only** views; prefer row-scoped policies.  
- Writes: through Edge Function or DB function with **SECURITY DEFINER**; never with anon key.

---

## Flip procedure (per environment)

### Staging (Vercel Preview)
1) Implement a real RPC and merge.  
2) In Vercel Preview env → set `VITE_USE_MOCKS=false`.  
3) Verify UI.  
4) If good, keep `false` or flip back to `true` until the next RPC is migrated.

### Production
- Start with `VITE_USE_MOCKS=true`.  
- Flip to `false` **after** all critical RPCs are implemented and staging proves green.  
- Rollback = set back to `true`.

---

## Monitoring & errors
- Wrap real RPCs with try/catch; return user-safe messages.  
- Sanitize logs (no customer names/addresses).

---

## Done criteria (for each RPC)
- Real implementation returns the same shape as mocks.  
- UI works with `VITE_USE_MOCKS=false` on staging.  
- Rollback is documented and tested (flip back to `true`).  
- CI + guard tests pass.

---

## Quick commands

Local sanity:
```bash
npm run build
npm run guard:rpc
npm run test -- --run
