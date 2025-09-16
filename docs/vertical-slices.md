# Vertical Slices (Final)
**Version:** 1.0.0  
**Last Updated:** 2025-01-16  
**Status:** Production

Authoritative build order with clear acceptance criteria.  
Each slice is independently testable, adds visible value, and enforces roles/security from the start.  
Stage model: **Filling → Covering → Decorating → Packing → Complete** (single enum).  
**Filling starts at barcode print**, **scan ends Filling**. “Unassigned” = `assignee_id IS NULL`.

---

## Slice 0 — Auth and Roles **[2–3 days]**
**Done when**
- Supabase Auth configured.
- Role assignment works (**Admin**, **Supervisor**, **Staff**).
- JWT includes `user_role` claim.
- Users can log in and role appears in token (verified in app).

---

## Slice 1 — Manual Order Creation **[2–4 days]**
**Done when**
- Can create **test orders via UI** (no Shopify yet).
- Orders appear in queue with correct fields.
- **Priority** derived from `due_date`.
- Created order visible to staff with proper **RLS** (read-only; writes via RPCs).

---

## Slice 2 — Queues and All Stages **[4–6 days]**
**Done when**
- `get_queue` returns orders sorted **Priority → Due Date → Size → Order Number**.
- Order flows through **Filling → Covering → Decorating → Packing → Complete**.
- Every transition logs a **stage_event**.
- Invalid transitions blocked (no backwards).
- Transitions **idempotent** (cannot complete same stage twice).
- UI updates without full refresh (subscription/poll).
- **p95 < 200ms** for 100 visible orders.

---

## Slice 3 — Scanner and Barcode **[2–4 days]**
**Done when**
- **Print barcode** works.
- **Scanning** advances stage per rules.
- First **Filling** print sets **start timestamp**.
- Duplicate prints do **not** duplicate events.

---

## Slice 4 — Staff Workspace **[3–5 days]**
**Done when**
- Staff see only **their assigned** orders.
- `start_shift`, `end_shift`, `start_break`, `end_break` RPCs work.
- **No direct table writes** from UI.
- Orders update live when assignment changes.

---

## Slice 5 — Supervisor Workspace **[3–5 days]**
**Done when**
- Supervisor can **assign/unassign** orders.
- Role enforcement prevents Staff from assigning.
- Deep links to orders work.
- Auto-unassign when **shift ends** (policy).

---

## Slice 6 — Settings **[2–4 days]**
**Done when**
- Printing, `due_date` defaults, **flavours**, **storage**, **monitor density** persist via RPCs.
- Changes reflect immediately in UI.
- Non-admins blocked from modifying.

---

## Slice 7 — Inventory and BOM Setup **[4–7 days]**
**Done when**
- Components and **BOMs** can be created and updated.
- **Keywords** and **product requirements** link to BOM items.
- Inventory adjusts with **reservations** and **releases**.
- `get_inventory_status` returns correct stock/reserved/buffer/ATS.

---

## Slice 8 — Shopify Integration **[5–8 days]**
**Requires:** Slices **0–2**, **7**  
**Done when**
- Store tokens saved (per store).
- **Manual import** works for >50 orders.
- **Webhook skeleton** verified with HMAC.
- Duplicate orders skipped (idempotent).
- Failed syncs logged with reason; **retry** mechanism works.
- Sync status visible in UI.

---

## Slice 9 — Inventory Sync **[4–7 days]**
**Requires:** Slices **7**, **8**  
**Done when**
- Stock changes enqueue **`work_queue`**.
- Worker **batches** and **deduplicates** updates.
- **ATS/OOS** values pushed to Shopify.
- Failed updates **retried up to 3** times.
- Dead-letter queue holds persistent errors.
- Nightly **reconciliation** matches Shopify counts.

---

## Slice 10 — Order Automation **[3–5 days]**
**Requires:** Slices **2**, **8**, **9**  
**Done when**
- Shopify **webhooks** create orders automatically.
- `check_inventory_availability` prevents overselling.
- Orders with insufficient inventory set **`inventory_blocked = true`** (flag/metadata), **not a new stage**.
- Supervisor notified of blocked orders.

---

## Slice 11 — Complete Grid and Storage **[2–3 days]**
**Requires:** Slice **2**  
**Done when**
- Completed orders appear in **grid**.
- Filters by **storage** and **search** work.
- Pagination works for **>500** completed orders.

---

## Slice 12 — Messaging **[3–5 days]**
**Requires:** Slice **0**  
**Done when**
- Staff can send/receive messages in **real time**.
- **Unread counts** update live.
- Admin **broadcast** appears to all staff.
- Messages restricted by **RLS**.

---

## Slice 13 — Media and QC Photos **[3–5 days]**
**Requires:** Slice **2**  
**Done when**
- Photos uploaded with **signed URLs**.
- Photos linked to orders and visible in UI.
- Certain stage transitions **blocked until photo uploaded** (QC policy).

---

## Slice 14 — Time and Payroll **[4–6 days]**
**Requires:** Slice **4**  
**Done when**
- Shifts and breaks tracked with validations.
- Summaries report accurate totals.
- CSV export works.
- Entries immutable after **7 days**.

---

## Slice 15 — Monitoring and Error Handling **[2–4 days]**
**Requires:** Slices **2**, **8**, **9**  
**Done when**
- Dead-letter queue visible in dashboard.
- **Retry** buttons for failed operations.
- Health dashboard shows webhook latency, inventory sync success, unassigned >2h, failed transitions.
- Alerts on concurrent shift violations or orphaned orders >24h.

---

## Safety & Feature Flags
- Use flags for risky slices; enable gradually.
- Schema changes follow **nullable → backfill → enforce**.
- Every slice adds **tests** and updates **docs**.

---

## Success Metrics Per Slice (examples)
- **Slice 2**: **100 orders processed** through all stages with **0 invalid transitions**; queue **p95 < 200ms**.  
- **Slice 3**: **100% idempotent**: duplicate prints/scans produce **no duplicate events**.  
- **Slice 8**: **500+ orders** imported successfully; duplicate replay rate recorded; **0 failed HMAC** in last 24h.  
- **Slice 9**: **≥ 99%** inventory sync success over last 24h; backlog **< 500** and oldest pending **< 15 min**.  
- **Slice 10**: New webhooks create orders with **p95 < 500ms** end-to-end.

---

## Backout Plan (per slice)
- App regression → `git revert` + redeploy.  
- Schema regression → **compensating forward migration** (re-add dropped cols as nullable); avoid destructive downs in prod.  
- Webhook blow-ups → pause route, fix, **replay** deliveries.

---

## Acceptance Template (reuse per slice)
- [ ] Schema created/updated with idempotent migrations  
- [ ] RPCs added/updated with role checks & idempotency  
- [ ] UI wired with only valid actions per stage  
- [ ] Tests: unit + integration (E2E where needed)  
- [ ] Ops: logs/alerts updated  
- [ ] Docs updated: overview, rpc-surface, schema-and-rls, data-flows (if impacted)