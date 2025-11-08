# Ordak v2 - Master Task List
**Last Updated:** 2025-11-08  
**Overall Completion:** 70%  
**Target Completion:** 95% by 2025-12-06 (4 weeks)  
**Source:** Consolidated findings from 5 comprehensive audit reports

---

## 📊 Status Legend
- 🔴 **Not Started** - Ready to begin
- 🟡 **In Progress** - Currently being worked on
- ✅ **Done** - Completed and verified
- ⏸️ **Blocked** - Waiting on dependency
- ❌ **Cancelled** - Decided not to implement

---

## 🎯 Progress Summary

| Tier | Total | Done | In Progress | Not Started | Completion |
|------|-------|------|-------------|-------------|------------|
| Tier 1: Critical | 6 | 3 | 0 | 3 | 50% |
| Tier 2: High Priority | 5 | 0 | 0 | 5 | 0% |
| Tier 3: Medium Priority | 5 | 0 | 0 | 5 | 0% |
| Tier 4: Architectural | 4 | 0 | 0 | 4 | 0% |
| **TOTAL** | **20** | **3** | **0** | **17** | **15%** |

---

## 🔥 TIER 1: CRITICAL BLOCKERS
**Impact:** These block core functionality and must be fixed for MVP  
**Timeline:** Complete within 1-2 days

---

### Task 1: Update Order TypeScript Interface
**Status:** ✅ Done — 2025-11-08  
**Priority:** ⚡ CRITICAL  
**Effort:** 30 minutes  
**Impact:** UI cannot display priority, assignee, storage, status  
**Owner:** Completed  
**Dependencies:** None  
**Report Source:** Report #5, Section 5 (Data Models & Types)

**Problem:**
Frontend `Order` type in `src/types/db.ts` is missing critical fields that exist in backend schema, preventing UI from displaying:
- Priority badges (High/Medium/Low)
- Assignee names on cards
- Storage location chips  
- Order status indicators

**Solution:**
Add missing fields to Order interface:

```typescript
// File: src/types/db.ts
export interface Order {
  // ... existing fields
  priority: 'high' | 'medium' | 'low';                    // ADD
  assignee_id: string | null;                              // ADD
  storage: string | null;                                  // ADD
  status: 'pending' | 'in_progress' | 'complete';         // ADD
}
```

**Acceptance Criteria:**
- [x] Type updated in `src/types/db.ts`
- [x] No TypeScript compilation errors
- [x] Priority badges display correctly in queue cards
- [x] Assignee names show on assigned orders
- [x] Storage chips appear when storage is set
- [x] Status indicators work in all views

**Related Tasks:** None

**Notes:**
Backend schema already has these fields (`orders_bannos` and `orders_flourlane` tables). This is purely a frontend type mismatch.

**Completion Notes:**
Added 4 optional fields to `QueueMinimalRow` and `CompleteMinimalRow`:
- `priority?: 'high' | 'medium' | 'low'` (lowercase to match backend schema)
- `assignee_id?: string | null`
- `storage?: string | null`
- `status?: 'pending' | 'in_progress' | 'complete'`

Fields made optional to avoid breaking existing code. Added clarifying comments about priority casing convention (lowercase for data, capitalized `Priority` type for display).

---

### Task 2: Add Flavour Column to Orders Tables
**Status:** ✅ Done — 2025-11-08  
**Priority:** ⚡ CRITICAL  
**Effort:** 10 minutes  
**Impact:** Filling stage dropdown non-functional  
**Owner:** TBD  
**Dependencies:** None  
**Report Source:** Report #4, Section 1 (Database Schema - Orders Tables)

**Problem:**
Spec requires `flavour` column for Filling stage, but both `orders_bannos` and `orders_flourlane` tables are missing this field. Filling dropdown cannot save selected flavour.

**Solution:**
Create migration to add `flavour` column:

```sql
-- File: supabase/migrations/050_add_flavour_column.sql
-- Add flavour column to both orders tables (idempotent)
ALTER TABLE public.orders_bannos
  ADD COLUMN IF NOT EXISTS flavour text;
ALTER TABLE public.orders_flourlane
  ADD COLUMN IF NOT EXISTS flavour text;
COMMENT ON COLUMN public.orders_bannos.flavour
  IS 'Selected flavour for Filling stage (store-specific list)';
COMMENT ON COLUMN public.orders_flourlane.flavour
  IS 'Selected flavour for Filling stage (store-specific list)';
```

**Acceptance Criteria:**
- [x] Migration file created: `050_add_flavour_column.sql`
- [x] Migration runs successfully on dev database
- [x] Both tables have `flavour` column (nullable text)
- [x] Filling stage dropdown saves flavour selection
- [x] Flavour displays in Order Detail Drawer
- [x] Flavour appears in queue filters (if implemented)

**Related Tasks:** 
- Task 11 (Storage filter - similar pattern)

**Notes:**
- Bannos uses 5 fixed flavours + "Other"
- Flourlane uses 9 fixed flavours + "Other"
- Flavours are configured per store in Settings
  
Completed via migration `050_add_flavour_column.sql`. Verified in DB using `information_schema.columns`.

---

### Task 3: Fix Stage Naming Drift in UI
**Status:** ✅ Done — 2025-11-08  
**Priority:** ⚡ CRITICAL  
**Effort:** 2 hours  
**Impact:** Stage flow logic broken, causes bugs in queue grouping  
**Owner:** Completed  
**Dependencies:** None  
**Report Source:** Report #3 (Visual Code Audit - QueueTable.tsx screenshot)

**Problem:**
UI code uses inconsistent stage names that don't match backend enum:
- UI uses: "packaging", "quality", "ready"
- Backend expects: "Packing", "Complete"
- Breaks stage comparisons and auto-progression logic

**Evidence:**
```typescript
// QueueTable.tsx (WRONG)
const grouped = {
  unassigned: [],
  filling: [],
  covering: [],
  decorating: [],
  packaging: [],    // ❌ Should be "packing"
  quality: [],      // ❌ Not in spec, should be removed
  ready: []         // ❌ Should be "complete"
}
```

**Solution:**
Standardize all stage references:

```typescript
// Correct stage names (match backend enum)
type Stage = 'Filling' | 'Covering' | 'Decorating' | 'Packing' | 'Complete';

// Files to update:
// - src/components/QueueTable.tsx
// - src/types/db.ts (if stage type exists)
// - Any stage comparison logic
// - Stage filter dropdowns
```

**Files to Update:**
1. `src/components/QueueTable.tsx` - Fix grouped object
2. `src/components/Dashboard.tsx` - Fix stage routing
3. `src/types/db.ts` - Fix Stage type enum
4. Any components with stage comparisons

**Acceptance Criteria:**
- [x] All references to "packaging" changed to "packing" (lowercase in code)
- [x] All "quality" stage references removed
- [x] All "ready" references changed to "complete"
- [x] Stage enum type matches: `'Filling' | 'Covering' | 'Decorating' | 'Packing' | 'Complete'`
- [x] Queue grouping works correctly
- [x] Stage progression (Packing → Complete) works
- [x] No TypeScript errors
- [x] Manual testing: Complete an order through all stages

**Related Tasks:** None

**Notes:**
This is a **critical bug** that affects order flow. Must fix before production use.

**Completion Notes:**
Fixed stage naming inconsistencies in `QueueTable.tsx`:
- Changed `packaging` → `packing` in grouped object (line 88), mapping logic (line 114), and productionStages array (line 147)
- Removed `quality` stage entirely (not in spec)
- Changed `ready` → `complete` in grouped object (line 89), mapping logic (line 116), and productionStages array (line 148)
- Updated `TabsList` grid layout from `grid-cols-7` to `grid-cols-6` to match 6 stages
- All stage references now match backend enum: Filling, Covering, Decorating, Packing, Complete
- Queue tabs now display correctly with proper alignment and spacing

---

### Task 4: Implement set_storage RPC
**Status:** 🔴 Not Started  
**Priority:** ⚡ CRITICAL  
**Effort:** 1 hour  
**Impact:** Storage feature completely non-functional  
**Owner:** TBD  
**Dependencies:** None  
**Report Source:** Report #4, Section 2 (RPC Coverage - Queue Management)

**Problem:**
Storage chip displays on cards and storage locations are configured in Settings, but there's no RPC to actually SET storage on an order. UI likely fails silently when trying to set storage.

**Solution:**
Create `set_storage` RPC:

```sql
-- File: supabase/migrations/047_set_storage_rpc.sql
CREATE OR REPLACE FUNCTION set_storage(
  p_store text,
  p_order_id text,
  p_storage text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_name text;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;
  
  -- Validate storage location (optional - can validate against settings)
  IF p_storage IS NOT NULL AND p_storage = '' THEN
    p_storage := NULL;
  END IF;
  
  -- Dynamic table selection
  v_table_name := 'orders_' || p_store;
  
  -- Update storage
  EXECUTE format(
    'UPDATE %I SET storage = $1, updated_at = now() WHERE id = $2',
    v_table_name
  ) USING p_storage, p_order_id;
  
  -- Check if order exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
  
  -- Log action (if audit_log exists)
  INSERT INTO audit_log (action, performed_by, source, meta)
  VALUES (
    'set_storage',
    auth.uid(),
    'set_storage_rpc',
    jsonb_build_object(
      'store', p_store,
      'order_id', p_order_id,
      'storage', p_storage
    )
  );
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION set_storage(text, text, text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION set_storage IS 'Set storage location for an order (bulk or single)';
```

**Acceptance Criteria:**
- [ ] RPC created and deployed
- [ ] Function validates store parameter
- [ ] Function updates storage field correctly
- [ ] Audit log entry created
- [ ] Error handling for non-existent orders
- [ ] UI "Set Storage" action works (StickyAssignBar or Order Drawer)
- [ ] Storage chip updates immediately after setting
- [ ] Manual test: Set storage on multiple orders

**Related Tasks:**
- Task 11 (Add Storage filter to queues)

**Notes:**
Consider adding validation against configured storage locations in Settings. For now, accept any text value.

---

### Task 5: Implement print_barcode RPC
**Status:** 🔴 Not Started  
**Priority:** ⚡ CRITICAL  
**Effort:** 2 hours  
**Impact:** Cannot print tickets, workflow blocked  
**Owner:** TBD  
**Dependencies:** Task 6 (stage_events table)  
**Report Source:** Reports #1, #3, #4, #5 (All mention missing)

**Problem:**
Spec requires barcode printing at any stage, with special behavior for Filling (first print starts the stage timer). No RPC exists to generate printable payload or log print events.

**Solution:**
Create `print_barcode` RPC:

```sql
-- File: supabase/migrations/048_print_barcode_rpc.sql
CREATE OR REPLACE FUNCTION print_barcode(
  p_store text,
  p_order_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_name text;
  v_order record;
  v_is_first_filling_print boolean := false;
  v_payload jsonb;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;
  
  -- Get order details
  v_table_name := 'orders_' || p_store;
  EXECUTE format(
    'SELECT * FROM %I WHERE id = $1',
    v_table_name
  ) USING p_order_id INTO v_order;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
  
  -- Check if this is first print in Filling stage
  IF v_order.stage = 'Filling' AND v_order.filling_start_ts IS NULL THEN
    v_is_first_filling_print := true;
    
    -- Set filling_start_ts (requires column from Task 8)
    EXECUTE format(
      'UPDATE %I SET filling_start_ts = now() WHERE id = $1',
      v_table_name
    ) USING p_order_id;
  END IF;
  
  -- Log print event in stage_events (requires Task 6)
  INSERT INTO stage_events (
    store,
    order_id,
    stage,
    event_type,
    at_ts,
    staff_id,
    meta
  ) VALUES (
    p_store,
    p_order_id,
    v_order.stage,
    'print',
    now(),
    auth.uid(),
    jsonb_build_object('first_filling_print', v_is_first_filling_print)
  );
  
  -- Build printable payload
  v_payload := jsonb_build_object(
    'order_number', v_order.shopify_order_number,
    'order_id', v_order.id,
    'product_title', v_order.product_title,
    'size', v_order.size,
    'due_date', v_order.due_date,
    'customer_name', v_order.customer_name,
    'stage', v_order.stage,
    'priority', CASE 
      WHEN v_order.priority = 1 THEN 'HIGH'
      WHEN v_order.priority = 0 THEN 'MEDIUM'
      ELSE 'LOW'
    END,
    'barcode_content', format('%s-%s', p_store, p_order_id),
    'printed_at', now()
  );
  
  RETURN v_payload;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION print_barcode(text, text) TO authenticated;

-- Comment
COMMENT ON FUNCTION print_barcode IS 'Generate printable ticket payload and log print event. First print in Filling starts stage timer.';
```

**Acceptance Criteria:**
- [ ] RPC created and deployed
- [ ] Returns valid JSON payload with order details
- [ ] Barcode content generated (format: `{store}-{order_id}`)
- [ ] Print event logged to stage_events table
- [ ] First Filling print sets `filling_start_ts` (if column exists)
- [ ] UI "Print Barcode" button works from:
  - [ ] Order Detail Drawer
  - [ ] OrderCard overflow menu
  - [ ] Scanner interface
- [ ] Manual test: Print barcode at each stage

**Related Tasks:**
- Task 6 (Create stage_events table) - **REQUIRED**
- Task 8 (Add completion timestamp columns) - Enhances functionality

**Notes:**
Actual printing implementation (thermal printer, label size) is client-side. This RPC just provides the data payload. Consider adding printer settings from store settings.

---

### Task 6: Create stage_events Table
**Status:** 🔴 Not Started  
**Priority:** ⚡ CRITICAL  
**Effort:** 4 hours  
**Impact:** No analytics, no timeline, no staff metrics  
**Owner:** TBD  
**Dependencies:** None (but blocks Tasks 5, 7)  
**Report Source:** Reports #1, #4 (Confirmed missing, currently using audit_log workaround)

**Problem:**
Spec requires dedicated `stage_events` table for tracking stage completions, assignments, and prints. Currently using generic `audit_log` which doesn't support analytics queries properly. Timeline feature, staff performance metrics, and production analytics cannot work.

**Solution:**
Create `stage_events` table with proper structure and indexes:

```sql
-- File: supabase/migrations/049_stage_events_table.sql

-- Create stage_events table
CREATE TABLE IF NOT EXISTS stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store text NOT NULL CHECK (store IN ('Bannos','Flourlane')),
  order_id text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('Filling','Covering','Decorating','Packing','Complete')),
  event_type text NOT NULL CHECK (event_type IN ('assign','complete','print')),
  at_ts timestamptz NOT NULL DEFAULT now(),
  staff_id uuid NULL REFERENCES staff_shared(user_id),
  ok boolean NULL,  -- For quality tracking (v1.1)
  meta jsonb NULL   -- Flexible metadata (notes, reason, etc.)
);

-- Indexes for common queries
CREATE INDEX idx_stage_events_store_ts ON stage_events(store, at_ts DESC);
CREATE INDEX idx_stage_events_store_stage_ts ON stage_events(store, stage, at_ts DESC);
CREATE INDEX idx_stage_events_staff_ts ON stage_events(staff_id, at_ts DESC);
CREATE INDEX idx_stage_events_order ON stage_events(order_id, at_ts DESC);

-- Enable RLS
ALTER TABLE stage_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone authenticated can read
CREATE POLICY stage_events_select_policy ON stage_events
  FOR SELECT TO authenticated
  USING (true);

-- RLS Policy: No direct writes (RPC-only via SECURITY DEFINER)
CREATE POLICY stage_events_insert_policy ON stage_events
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- Grant read access
GRANT SELECT ON stage_events TO authenticated;

-- Comment
COMMENT ON TABLE stage_events IS 'Audit trail for stage transitions, assignments, and prints. Powers analytics and timeline views.';
COMMENT ON COLUMN stage_events.ok IS 'Quality flag: true=passed, false=issue, null=not checked';
COMMENT ON COLUMN stage_events.meta IS 'Flexible metadata: notes, reason, qc_comments, etc.';
```

**Update Existing RPCs:**
After creating table, update these RPCs to log to `stage_events` instead of `audit_log`:
1. `complete_filling`
2. `complete_covering`
3. `complete_decorating`
4. `complete_packing`
5. `assign_staff`

**Example Update for complete_filling:**
```sql
-- Add this to complete_filling RPC:
INSERT INTO stage_events (store, order_id, stage, event_type, staff_id, at_ts, meta)
VALUES (
  p_store,
  p_order_id,
  'Filling',
  'complete',
  auth.uid(),
  now(),
  jsonb_build_object('notes', p_notes)
);
```

**Acceptance Criteria:**
- [ ] Table created with correct schema
- [ ] All indexes created
- [ ] RLS enabled with proper policies
- [ ] `complete_*` RPCs updated to log to stage_events
- [ ] `assign_staff` RPC updated to log to stage_events
- [ ] Old audit_log entries preserved (don't delete)
- [ ] Test: Complete order through all stages, verify stage_events populated
- [ ] Test: Query stage_events for timeline view works

**Related Tasks:**
- Task 5 (print_barcode) - **BLOCKED by this**
- Task 7 (Verify shift/break RPCs) - May need similar table
- Task 12 (Shopify Integration) - May log events here

**Notes:**
This is foundational for analytics. All future event tracking should use this table. Consider migrating old audit_log entries if needed for historical analytics.

---

## 🟡 TIER 2: HIGH PRIORITY FEATURES
**Impact:** Needed for complete feature set  
**Timeline:** Complete within 1-2 weeks

---

### Task 7: Verify Shift/Break RPCs Exist (Contradiction Resolution)
**Status:** 🔴 Not Started  
**Priority:** 🔴 HIGH (Contradiction between reports)  
**Effort:** 1 hour investigation + potential implementation  
**Impact:** Determines if Staff Workspace is functional  
**Owner:** TBD  
**Dependencies:** None  
**Report Source:** Report #4 vs Report #5 (Conflicting information)

**Problem:**
**CONTRADICTION:** Two audit reports give opposite findings:
- **Report #4:** ❌ "shifts/breaks tables missing, RPCs not implemented"
- **Report #5:** ✅ "RPCs for managing shifts and breaks are fully implemented"

Need to definitively verify which is true.

**Investigation Steps:**

1. **Check Database Schema:**
```sql
-- Look for shifts and breaks tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('shifts', 'breaks');
```

2. **Check Migrations:**
```bash
# Search for shift/break table creation
grep -r "CREATE TABLE.*shifts" supabase/migrations/
grep -r "CREATE TABLE.*breaks" supabase/migrations/
```

3. **Check RPC Functions:**
```sql
-- Look for shift/break functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%shift%' OR routine_name LIKE '%break%';
```

4. **Check RPC Client:**
```bash
# Search for shift/break function signatures
grep -r "startShift\|endShift\|startBreak\|endBreak" src/lib/rpc-client.ts
```

**Possible Outcomes:**

**Outcome A: RPCs Exist ✅**
- Mark this task as ✅ Done
- No implementation needed
- Update MasterTask notes

**Outcome B: RPCs Missing ❌**
- Proceed with implementation below
- Tables: `shifts`, `breaks`
- RPCs: `start_shift`, `end_shift`, `start_break`, `end_break`

**Implementation (if needed):**

```sql
-- File: supabase/migrations/050_shifts_breaks.sql

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff_shared(user_id),
  start_ts timestamptz NOT NULL DEFAULT now(),
  end_ts timestamptz NULL,
  store text NOT NULL CHECK (store IN ('bannos','flourlane')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create breaks table
CREATE TABLE IF NOT EXISTS breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  start_ts timestamptz NOT NULL DEFAULT now(),
  end_ts timestamptz NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_shifts_staff_id ON shifts(staff_id, start_ts DESC);
CREATE INDEX idx_shifts_active ON shifts(staff_id, end_ts) WHERE end_ts IS NULL;
CREATE INDEX idx_breaks_shift_id ON breaks(shift_id);

-- Enable RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;

-- RLS: Staff can only see their own shifts
CREATE POLICY shifts_select_policy ON shifts
  FOR SELECT TO authenticated
  USING (staff_id = auth.uid() OR check_user_role('Admin'));

-- RLS: No direct writes
CREATE POLICY shifts_insert_policy ON shifts
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- Comments
COMMENT ON TABLE shifts IS 'Staff work shifts for time tracking';
COMMENT ON TABLE breaks IS 'Breaks taken during shifts';

-- RPC: start_shift
CREATE OR REPLACE FUNCTION start_shift(p_store text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift_id uuid;
  v_staff_id uuid;
BEGIN
  v_staff_id := auth.uid();
  
  -- Check for active shift
  IF EXISTS (
    SELECT 1 FROM shifts 
    WHERE staff_id = v_staff_id AND end_ts IS NULL
  ) THEN
    RAISE EXCEPTION 'Staff already has an active shift';
  END IF;
  
  -- Create new shift
  INSERT INTO shifts (staff_id, store, start_ts)
  VALUES (v_staff_id, p_store, now())
  RETURNING id INTO v_shift_id;
  
  RETURN v_shift_id;
END;
$$;

-- RPC: end_shift
CREATE OR REPLACE FUNCTION end_shift()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
BEGIN
  v_staff_id := auth.uid();
  
  -- End active shift
  UPDATE shifts
  SET end_ts = now(), updated_at = now()
  WHERE staff_id = v_staff_id AND end_ts IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active shift found';
  END IF;
  
  -- End any active breaks
  UPDATE breaks
  SET end_ts = now(), updated_at = now()
  WHERE shift_id IN (
    SELECT id FROM shifts WHERE staff_id = v_staff_id
  ) AND end_ts IS NULL;
END;
$$;

-- RPC: start_break
CREATE OR REPLACE FUNCTION start_break()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_break_id uuid;
  v_shift_id uuid;
  v_staff_id uuid;
BEGIN
  v_staff_id := auth.uid();
  
  -- Get active shift
  SELECT id INTO v_shift_id
  FROM shifts
  WHERE staff_id = v_staff_id AND end_ts IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active shift found';
  END IF;
  
  -- Check for active break
  IF EXISTS (
    SELECT 1 FROM breaks 
    WHERE shift_id = v_shift_id AND end_ts IS NULL
  ) THEN
    RAISE EXCEPTION 'Break already active';
  END IF;
  
  -- Create break
  INSERT INTO breaks (shift_id, start_ts)
  VALUES (v_shift_id, now())
  RETURNING id INTO v_break_id;
  
  RETURN v_break_id;
END;
$$;

-- RPC: end_break
CREATE OR REPLACE FUNCTION end_break()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
BEGIN
  v_staff_id := auth.uid();
  
  -- End active break
  UPDATE breaks
  SET end_ts = now(), updated_at = now()
  WHERE shift_id IN (
    SELECT id FROM shifts WHERE staff_id = v_staff_id AND end_ts IS NULL
  ) AND end_ts IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active break found';
  END IF;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION start_shift(text) TO authenticated;
GRANT EXECUTE ON FUNCTION end_shift() TO authenticated;
GRANT EXECUTE ON FUNCTION start_break() TO authenticated;
GRANT EXECUTE ON FUNCTION end_break() TO authenticated;
```

**Acceptance Criteria:**
- [ ] Investigation complete, definitive answer documented
- [ ] If missing: Tables created
- [ ] If missing: All 4 RPCs implemented
- [ ] Staff Workspace shift controls functional
- [ ] Test: Start shift → Start break → End break → End shift
- [ ] Verify shift/break timers display correctly

**Related Tasks:**
- Task 13 (Time & Payroll RPCs) - Uses this data

**Notes:**
**PRIORITY:** Resolve this contradiction FIRST before implementing anything. Document findings in this task's notes section.

---

### Task 8: Add Completion Timestamp Columns
**Status:** 🔴 Not Started  
**Priority:** 🟡 HIGH  
**Effort:** 4 hours  
**Impact:** Enables proper stage duration tracking  
**Owner:** TBD  
**Dependencies:** None  
**Report Source:** Report #4, Section 1 (Database Schema)

**Problem:**
Orders tables don't have individual timestamp columns for each stage completion. Only have generic `updated_at`. Cannot calculate:
- How long each stage took
- When each stage was completed
- Stage-level performance metrics

**Solution:**
Add completion timestamp columns:

```sql
-- File: supabase/migrations/051_add_completion_timestamps.sql

-- Add timestamp columns to orders_bannos
ALTER TABLE orders_bannos 
ADD COLUMN filling_complete_ts timestamptz NULL,
ADD COLUMN covering_complete_ts timestamptz NULL,
ADD COLUMN decorating_complete_ts timestamptz NULL,
ADD COLUMN packing_complete_ts timestamptz NULL;

-- Add timestamp columns to orders_flourlane
ALTER TABLE orders_flourlane
ADD COLUMN filling_complete_ts timestamptz NULL,
ADD COLUMN covering_complete_ts timestamptz NULL,
ADD COLUMN decorating_complete_ts timestamptz NULL,
ADD COLUMN packing_complete_ts timestamptz NULL;

-- Add comments
COMMENT ON COLUMN orders_bannos.filling_complete_ts IS 'Timestamp when Filling stage completed';
COMMENT ON COLUMN orders_bannos.covering_complete_ts IS 'Timestamp when Covering stage completed';
COMMENT ON COLUMN orders_bannos.decorating_complete_ts IS 'Timestamp when Decorating stage completed';
COMMENT ON COLUMN orders_bannos.packing_complete_ts IS 'Timestamp when Packing stage completed';

-- Same comments for orders_flourlane
COMMENT ON COLUMN orders_flourlane.filling_complete_ts IS 'Timestamp when Filling stage completed';
COMMENT ON COLUMN orders_flourlane.covering_complete_ts IS 'Timestamp when Covering stage completed';
COMMENT ON COLUMN orders_flourlane.decorating_complete_ts IS 'Timestamp when Decorating stage completed';
COMMENT ON COLUMN orders_flourlane.packing_complete_ts IS 'Timestamp when Packing stage completed';
```

**Update Completion RPCs:**
Modify each completion RPC to set the timestamp:

```sql
-- Example for complete_filling:
UPDATE orders_bannos
SET 
  stage = 'Covering',
  filling_complete_ts = now(),  -- ADD THIS
  updated_at = now()
WHERE id = p_order_id;
```

**Files to Update:**
1. `supabase/migrations/043_scanner_stage_completion.sql`:
   - Update `complete_filling` to set `filling_complete_ts`
   - Update `complete_covering` to set `covering_complete_ts`
   - Update `complete_decorating` to set `decorating_complete_ts`
   - Update `complete_packing` to set `packing_complete_ts`

**Acceptance Criteria:**
- [ ] Migration created and run
- [ ] All 4 timestamp columns added to both tables
- [ ] All 4 completion RPCs updated
- [ ] Test: Complete order through all stages
- [ ] Verify timestamps populated correctly
- [ ] Timeline view shows stage durations (if implemented)

**Related Tasks:**
- Task 5 (print_barcode) - Can also set `filling_start_ts` on first print
- Future analytics queries will use these timestamps

**Notes:**
Also consider adding `filling_start_ts` to track when Filling actually starts (vs when order created). This enables "time in stage" metrics.

---

### Task 9: Implement Inventory Deduction Flow
**Status:** 🔴 Not Started  
**Priority:** 🟡 HIGH  
**Effort:** 1 week  
**Impact:** Inventory tracking completely non-functional  
**Owner:** TBD  
**Dependencies:** None (but complex)  
**Report Source:** Reports #1, #2, #4, #5 (All mention incomplete)

**Problem:**
Spec requires immediate inventory deduction when orders are created (via webhook). Currently:
- BOM tables exist
- Components table exists
- But no automatic deduction happens
- Restock on cancel doesn't exist
- Shopify OOS flip doesn't work

**Solution:**
Implement full inventory deduction flow:

**Step 1: Create deduct_inventory_for_order RPC** (may already exist, verify first)

```sql
-- File: supabase/migrations/052_inventory_deduction.sql

CREATE OR REPLACE FUNCTION deduct_inventory_for_order(
  p_order_id text,
  p_store text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_name text;
  v_order record;
  v_bom record;
  v_component record;
  v_deductions jsonb := '[]'::jsonb;
  v_oos_components text[] := '{}';
BEGIN
  -- Get order details
  v_table_name := 'orders_' || p_store;
  EXECUTE format('SELECT * FROM %I WHERE id = $1', v_table_name)
  USING p_order_id INTO v_order;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
  
  -- Find matching BOM
  SELECT * INTO v_bom
  FROM boms
  WHERE store = p_store
    AND product_title = v_order.product_title
    AND (variant IS NULL OR variant = v_order.size)
    AND is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- Log warning but don't fail (some products may not have BOM)
    INSERT INTO audit_log (action, source, meta)
    VALUES ('inventory_deduction_skipped', 'deduct_inventory_for_order', 
            jsonb_build_object('reason', 'no_bom_found', 'order_id', p_order_id));
    RETURN jsonb_build_object('deducted', false, 'reason', 'no_bom_found');
  END IF;
  
  -- Deduct each component in BOM
  FOR v_component IN
    SELECT c.*, bi.qty_per, bi.stage_to_consume
    FROM bom_items bi
    JOIN components c ON c.id = bi.component_id
    WHERE bi.bom_id = v_bom.id
  LOOP
    -- Calculate total qty needed (qty_per * order item_qty)
    DECLARE
      v_qty_needed numeric := v_component.qty_per * COALESCE(v_order.item_qty, 1);
      v_new_qty numeric;
    BEGIN
      -- Deduct from component
      UPDATE components
      SET 
        qty_on_hand = qty_on_hand - v_qty_needed,
        updated_at = now()
      WHERE id = v_component.id
      RETURNING qty_on_hand INTO v_new_qty;
      
      -- Record transaction
      INSERT INTO component_txns (
        component_id,
        order_id,
        delta,
        source,
        notes
      ) VALUES (
        v_component.id,
        p_order_id,
        -v_qty_needed,
        'order_create',
        format('Deducted for order %s (%s)', p_order_id, v_order.product_title)
      );
      
      -- Track deduction for return payload
      v_deductions := v_deductions || jsonb_build_object(
        'component_id', v_component.id,
        'component_name', v_component.name,
        'qty_deducted', v_qty_needed,
        'qty_remaining', v_new_qty
      );
      
      -- Check if component is now out of stock
      IF v_new_qty <= 0 THEN
        v_oos_components := array_append(v_oos_components, v_component.name);
        
        -- If component has shopify_variant_id, mark for OOS flip
        IF v_component.shopify_variant_id IS NOT NULL THEN
          -- Queue for Shopify OOS update (implement via edge function)
          INSERT INTO audit_log (action, source, meta)
          VALUES (
            'shopify_oos_flip_needed',
            'deduct_inventory_for_order',
            jsonb_build_object(
              'component_id', v_component.id,
              'shopify_variant_id', v_component.shopify_variant_id,
              'qty_on_hand', v_new_qty
            )
          );
        END IF;
      END IF;
    END;
  END LOOP;
  
  -- Return summary
  RETURN jsonb_build_object(
    'deducted', true,
    'order_id', p_order_id,
    'store', p_store,
    'bom_id', v_bom.id,
    'deductions', v_deductions,
    'oos_components', v_oos_components
  );
END;
$$;

GRANT EXECUTE ON FUNCTION deduct_inventory_for_order(text, text) TO authenticated;
```

**Step 2: Create restock_order RPC** (for cancellations/edits)

```sql
CREATE OR REPLACE FUNCTION restock_order(
  p_order_id text,
  p_store text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_txn record;
  v_restocked jsonb := '[]'::jsonb;
BEGIN
  -- Find all deduction transactions for this order
  FOR v_txn IN
    SELECT * FROM component_txns
    WHERE order_id = p_order_id
      AND source = 'order_create'
      AND delta < 0
  LOOP
    -- Reverse the deduction
    UPDATE components
    SET 
      qty_on_hand = qty_on_hand + abs(v_txn.delta),
      updated_at = now()
    WHERE id = v_txn.component_id;
    
    -- Record restock transaction
    INSERT INTO component_txns (
      component_id,
      order_id,
      delta,
      source,
      notes
    ) VALUES (
      v_txn.component_id,
      p_order_id,
      abs(v_txn.delta),
      'restock',
      format('Restocked from cancelled/edited order %s', p_order_id)
    );
    
    v_restocked := v_restocked || jsonb_build_object(
      'component_id', v_txn.component_id,
      'qty_restocked', abs(v_txn.delta)
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'restocked', true,
    'order_id', p_order_id,
    'components', v_restocked
  );
END;
$$;

GRANT EXECUTE ON FUNCTION restock_order(text, text) TO authenticated;
```

**Step 3: Wire to Webhook**
Update webhook Edge Functions to call `deduct_inventory_for_order`:

```typescript
// File: supabase/functions/shopify-webhooks-bannos/index.ts
// After inserting order into orders_bannos:

// Deduct inventory
const { error: deductError } = await supabase.rpc('deduct_inventory_for_order', {
  p_order_id: orderId,
  p_store: 'bannos'
});

if (deductError) {
  console.error('Inventory deduction failed:', deductError);
  // Log to dead_letter but don't fail webhook
}
```

**Step 4: Shopify OOS Flip** (Edge Function)
Create background job to flip variants OOS in Shopify:

```typescript
// File: supabase/functions/flip-shopify-oos/index.ts
// Triggered by cron or queue
// Reads audit_log for 'shopify_oos_flip_needed' actions
// Calls Shopify Admin API to set inventory availability
```

**Acceptance Criteria:**
- [ ] `deduct_inventory_for_order` RPC created
- [ ] `restock_order` RPC created
- [ ] Webhook calls deduction automatically
- [ ] Component txns logged correctly
- [ ] OOS components identified
- [ ] Shopify OOS flip logic stubbed (can be completed later)
- [ ] Manual test: Create order → Verify components deducted
- [ ] Manual test: Restock order → Verify components restored

**Related Tasks:**
- Task 12 (Shopify Integration) - OOS flip requires API access

**Notes:**
This is the **most complex task** in the list. Break into smaller PRs if needed:
1. PR1: Deduction RPC only
2. PR2: Restock RPC
3. PR3: Wire to webhook
4. PR4: Shopify OOS flip

---

### Task 10: Add Missing Staff Columns
**Status:** 🔴 Not Started  
**Priority:** 🟡 HIGH  
**Effort:** 2 hours  
**Impact:** Staff approval workflow and payroll incomplete  
**Owner:** TBD  
**Dependencies:** None  
**Report Source:** Report #4, Section 1 (Staff Table)

**Problem:**
`staff_shared` table missing columns required by spec:
- `approved` boolean - Enables staff approval workflow
- `hourly_rate` numeric - Required for payroll calculations

**Solution:**
Add missing columns:

```sql
-- File: supabase/migrations/053_add_staff_columns.sql

-- Add approved column
ALTER TABLE staff_shared
ADD COLUMN approved boolean NOT NULL DEFAULT false;

-- Add hourly_rate column
ALTER TABLE staff_shared
ADD COLUMN hourly_rate numeric(10,2) NULL;

-- Add comments
COMMENT ON COLUMN staff_shared.approved IS 'Whether staff member is approved to work (set by Admin)';
COMMENT ON COLUMN staff_shared.hourly_rate IS 'Hourly wage for payroll calculations (Admin-only visible)';

-- Update existing staff to approved (migration only, remove if not appropriate)
-- UPDATE staff_shared SET approved = true WHERE is_active = true;
```

**Update UI:**
1. **Staff Page** (`StaffPage.tsx`):
   - Add "Approved" column to table
   - Add toggle to approve/reject staff
   - Show hourly_rate (masked for non-Admin)

2. **Staff Profile Modal**:
   - Add "Approved" toggle
   - Add "Hourly Rate" input (Admin only)

3. **Staff Workspace**:
   - Block access if `approved = false`
   - Show message: "Your account is pending approval"

**Acceptance Criteria:**
- [ ] Migration created and run
- [ ] Both columns added to staff_shared
- [ ] Staff Page shows "Approved" status
- [ ] Admin can toggle approval
- [ ] Admin can edit hourly_rate
- [ ] Non-Admin cannot see hourly_rate values
- [ ] Unapproved staff cannot access Staff Workspace
- [ ] Test: Create new staff → Default approved=false

**Related Tasks:**
- Task 13 (Time & Payroll) - Uses hourly_rate

**Notes:**
Consider adding approval notification (email/slack) when staff approved. Also consider approval audit trail (who approved, when).

---

### Task 11: Add Storage Filter to Queue Tables
**Status:** 🔴 Not Started  
**Priority:** 🟡 HIGH  
**Effort:** 4 hours  
**Impact:** Cannot filter orders by storage location  
**Owner:** TBD  
**Dependencies:** Task 4 (set_storage RPC)  
**Report Source:** Reports #3, #5 (UI Gaps)

**Problem:**
- Storage chip displays on cards (visual indicator)
- Storage locations configured in Settings
- `set_storage` RPC exists (Task 4)
- But NO queue-level filter to show only orders in specific storage

Users cannot answer: "Show me all orders in Kitchen Freezer"

**Solution:**
Add Storage dropdown to FilterBar in queue views:

**Step 1: Update FilterBar Component**

```tsx
// File: src/components/FilterBar.tsx (or inline in QueueTable)

interface FilterBarProps {
  // ... existing props
  storageLocations: string[];
  selectedStorage: string | null;
  onStorageChange: (storage: string | null) => void;
}

function FilterBar({ 
  storageLocations, 
  selectedStorage, 
  onStorageChange,
  // ... other props 
}: FilterBarProps) {
  return (
    <div className="filter-bar">
      {/* Existing filters */}
      
      {/* Storage Filter */}
      <select 
        value={selectedStorage || 'all'} 
        onChange={(e) => onStorageChange(e.target.value === 'all' ? null : e.target.value)}
      >
        <option value="all">All Locations</option>
        {storageLocations.map(location => (
          <option key={location} value={location}>{location}</option>
        ))}
      </select>
    </div>
  );
}
```

**Step 2: Update get_queue RPC** (if not already filtering by storage)

```sql
-- Check if get_queue already has p_storage parameter
-- If not, add it:

CREATE OR REPLACE FUNCTION get_queue(
  p_store text,
  p_stage text,
  p_assignee_id uuid DEFAULT NULL,
  p_storage text DEFAULT NULL,  -- ADD THIS
  p_search text DEFAULT NULL,
  -- ... other params
) RETURNS TABLE(...) AS $$
BEGIN
  -- ... existing logic
  
  -- Add storage filter
  IF p_storage IS NOT NULL THEN
    query := query || ' AND storage = $X';
  END IF;
  
  -- ... rest of function
END;
$$;
```

**Step 3: Wire to UI**
In Production pages (BannosProductionPage, FlourlaneProductionPage):
1. Fetch storage locations from Settings
2. Pass to QueueTable/FilterBar
3. Include in get_queue RPC call

**Acceptance Criteria:**
- [ ] Storage dropdown added to FilterBar
- [ ] Dropdown populated with configured storage locations
- [ ] "All Locations" option shown by default
- [ ] Selecting storage filters queue to show only those orders
- [ ] Filter works across all stages (Filling, Covering, Decorating, Packing)
- [ ] Complete view also has storage filter
- [ ] URL param persists filter on refresh (optional)
- [ ] Manual test: Set storage on orders → Filter by location

**Related Tasks:**
- Task 4 (set_storage RPC) - Required
- Task 2 (Add flavour column) - Similar pattern

**Notes:**
Consider adding "Unassigned Storage" option to show orders without storage set.

---

## 🟢 TIER 3: MEDIUM PRIORITY
**Impact:** Nice-to-have features and polish  
**Timeline:** Complete within 3-4 weeks

---

### Task 12: Implement Shopify Integration RPCs
**Status:** 🔴 Not Started  
**Priority:** 🟢 MEDIUM  
**Effort:** 1 week  
**Impact:** Settings page incomplete, manual sync impossible  
**Owner:** TBD  
**Dependencies:** None  
**Report Source:** Reports #4, #5 (Missing RPCs)

**Problem:**
Settings page has Shopify Integration UI, but backend RPCs don't exist:
- Cannot test storefront token
- Cannot sync product catalog
- Cannot manually sync orders
- "Last connected" timestamp not tracked

**Solution:**
Implement 3 Shopify Integration RPCs:

**1. test_storefront_token**

```sql
-- File: supabase/migrations/054_shopify_integration.sql

CREATE OR REPLACE FUNCTION test_storefront_token(
  p_store text,
  p_token text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;
  
  -- This is a stub - actual test must call Shopify Storefront API
  -- Implementation would use an Edge Function to test token
  
  -- For now, just validate token format
  IF p_token IS NULL OR length(p_token) < 20 THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Token appears invalid'
    );
  END IF;
  
  -- In production, call Edge Function:
  -- POST /functions/test-shopify-token { store, token }
  -- Edge function returns { valid: true/false, shop_name, error }
  
  RETURN jsonb_build_object(
    'valid', true,
    'message', 'Token test not yet implemented - assuming valid'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION test_storefront_token(text, text) TO authenticated;
```

**2. connect_catalog** (Product Sync)

```sql
CREATE OR REPLACE FUNCTION connect_catalog(
  p_store text,
  p_token text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;
  
  -- Save token to settings
  INSERT INTO settings (store, key, value)
  VALUES (p_store, 'shopify_storefront_token', to_jsonb(p_token))
  ON CONFLICT (store, key) DO UPDATE SET value = EXCLUDED.value;
  
  -- Record last connected timestamp
  INSERT INTO settings (store, key, value)
  VALUES (p_store, 'shopify_last_connected', to_jsonb(now()))
  ON CONFLICT (store, key) DO UPDATE SET value = EXCLUDED.value;
  
  -- Create sync run record
  INSERT INTO shopify_sync_runs (store, started_at, status)
  VALUES (p_store, now(), 'running')
  RETURNING id INTO v_run_id;
  
  -- Trigger product sync Edge Function (async)
  -- POST /functions/sync-shopify-products { store, token, run_id }
  -- Edge function will update shopify_sync_runs when complete
  
  RETURN jsonb_build_object(
    'success', true,
    'run_id', v_run_id,
    'message', 'Product sync started'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION connect_catalog(text, text) TO authenticated;
```

**3. sync_shopify_orders** (Manual Order Import)

```sql
CREATE OR REPLACE FUNCTION sync_shopify_orders(
  p_store text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_token text;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;
  
  -- Get stored token
  SELECT value::text INTO v_token
  FROM settings
  WHERE store = p_store AND key = 'shopify_storefront_token';
  
  IF v_token IS NULL THEN
    RAISE EXCEPTION 'Shopify token not configured for store: %', p_store;
  END IF;
  
  -- Create sync run
  INSERT INTO shopify_sync_runs (store, started_at, status)
  VALUES (p_store, now(), 'running')
  RETURNING id INTO v_run_id;
  
  -- Trigger order sync Edge Function
  -- POST /functions/sync-shopify-orders { store, token, run_id }
  -- Function will:
  --   1. Fetch unfulfilled orders from Shopify
  --   2. Insert into webhook_inbox_{store}
  --   3. Process via existing worker
  --   4. Update shopify_sync_runs with counts
  
  RETURN jsonb_build_object(
    'success', true,
    'run_id', v_run_id,
    'message', 'Order sync started'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION sync_shopify_orders(text) TO authenticated;
```

**Step 4: Create Edge Functions** (Complex, separate tasks)

These Edge Functions do the actual Shopify API work:
1. `supabase/functions/test-shopify-token/index.ts`
2. `supabase/functions/sync-shopify-products/index.ts`
3. `supabase/functions/sync-shopify-orders/index.ts`

**Acceptance Criteria:**
- [ ] All 3 RPCs created
- [ ] Settings page "Test Connection" button works
- [ ] Settings page "Connect & Sync Catalog" button works
- [ ] Settings page "Sync Orders" button works
- [ ] Progress indicators show during sync
- [ ] Last connected timestamp updates
- [ ] Sync log viewable (list of runs)
- [ ] Edge Functions stubbed (can be implemented later)

**Related Tasks:**
- Task 9 (Inventory deduction) - Product sync needed for variant IDs

**Notes:**
This is a large task. Consider breaking into:
1. PR1: RPCs only (stubs)
2. PR2: Edge Function for token test
3. PR3: Edge Function for product sync
4. PR4: Edge Function for order sync

---

### Task 13: Implement Time & Payroll RPCs
**Status:** 🔴 Not Started  
**Priority:** 🟢 MEDIUM  
**Effort:** 1 week  
**Impact:** Time & Payroll page incomplete  
**Owner:** TBD  
**Dependencies:** Task 7 (shifts/breaks tables)  
**Report Source:** Reports #4, #5

**Problem:**
Time & Payroll page exists but backend RPCs missing:
- Cannot query staff time summaries
- Cannot get detailed daily breakdown
- Cannot edit/adjust time entries (Admin)

**Solution:**
Implement 3 Time & Payroll RPCs:

**1. get_staff_times** (Summary)

```sql
-- File: supabase/migrations/055_time_payroll_rpcs.sql

CREATE OR REPLACE FUNCTION get_staff_times(
  p_from date,
  p_to date,
  p_staff_id uuid DEFAULT NULL
) RETURNS TABLE(
  staff_id uuid,
  staff_name text,
  days_worked integer,
  total_shift_hours numeric,
  total_break_minutes numeric,
  net_hours numeric,
  hourly_rate numeric,
  total_pay numeric
) LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.user_id as staff_id,
    s.full_name as staff_name,
    COUNT(DISTINCT DATE(sh.start_ts)) as days_worked,
    COALESCE(SUM(
      EXTRACT(EPOCH FROM (COALESCE(sh.end_ts, now()) - sh.start_ts)) / 3600
    ), 0) as total_shift_hours,
    COALESCE(SUM(
      EXTRACT(EPOCH FROM (COALESCE(b.end_ts, now()) - b.start_ts)) / 60
    ), 0) as total_break_minutes,
    COALESCE(SUM(
      EXTRACT(EPOCH FROM (COALESCE(sh.end_ts, now()) - sh.start_ts)) / 3600
    ), 0) - COALESCE(SUM(
      EXTRACT(EPOCH FROM (COALESCE(b.end_ts, now()) - b.start_ts)) / 3600
    ), 0) as net_hours,
    s.hourly_rate,
    (
      COALESCE(SUM(
        EXTRACT(EPOCH FROM (COALESCE(sh.end_ts, now()) - sh.start_ts)) / 3600
      ), 0) - COALESCE(SUM(
        EXTRACT(EPOCH FROM (COALESCE(b.end_ts, now()) - b.start_ts)) / 3600
      ), 0)
    ) * COALESCE(s.hourly_rate, 0) as total_pay
  FROM staff_shared s
  LEFT JOIN shifts sh ON sh.staff_id = s.user_id 
    AND sh.start_ts >= p_from::timestamptz 
    AND sh.start_ts < (p_to::date + interval '1 day')::timestamptz
  LEFT JOIN breaks b ON b.shift_id = sh.id
  WHERE (p_staff_id IS NULL OR s.user_id = p_staff_id)
  GROUP BY s.user_id, s.full_name, s.hourly_rate
  ORDER BY s.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_staff_times(date, date, uuid) TO authenticated;
```

**2. get_staff_times_detail** (Daily Breakdown)

```sql
CREATE OR REPLACE FUNCTION get_staff_times_detail(
  p_from date,
  p_to date,
  p_staff_id uuid
) RETURNS TABLE(
  shift_date date,
  shift_id uuid,
  shift_start timestamptz,
  shift_end timestamptz,
  break_count integer,
  break_minutes numeric,
  net_hours numeric,
  notes text
) LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(sh.start_ts) as shift_date,
    sh.id as shift_id,
    sh.start_ts as shift_start,
    sh.end_ts as shift_end,
    COUNT(b.id)::integer as break_count,
    COALESCE(SUM(
      EXTRACT(EPOCH FROM (COALESCE(b.end_ts, now()) - b.start_ts)) / 60
    ), 0) as break_minutes,
    EXTRACT(EPOCH FROM (COALESCE(sh.end_ts, now()) - sh.start_ts)) / 3600 - 
    COALESCE(SUM(
      EXTRACT(EPOCH FROM (COALESCE(b.end_ts, now()) - b.start_ts)) / 3600
    ), 0) as net_hours,
    NULL::text as notes  -- Could add notes column to shifts table
  FROM shifts sh
  LEFT JOIN breaks b ON b.shift_id = sh.id
  WHERE sh.staff_id = p_staff_id
    AND sh.start_ts >= p_from::timestamptz
    AND sh.start_ts < (p_to::date + interval '1 day')::timestamptz
  GROUP BY sh.id, sh.start_ts, sh.end_ts
  ORDER BY sh.start_ts;
END;
$$;

GRANT EXECUTE ON FUNCTION get_staff_times_detail(date, date, uuid) TO authenticated;
```

**3. update_time_entry** (Admin Adjustments)

```sql
CREATE OR REPLACE FUNCTION update_time_entry(
  p_shift_id uuid,
  p_patch jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_ts timestamptz;
  v_end_ts timestamptz;
BEGIN
  -- Only Admin can adjust time entries
  IF NOT check_user_role('Admin') THEN
    RAISE EXCEPTION 'Only Admin can adjust time entries';
  END IF;
  
  -- Extract values from patch
  v_start_ts := (p_patch->>'start_ts')::timestamptz;
  v_end_ts := (p_patch->>'end_ts')::timestamptz;
  
  -- Update shift
  UPDATE shifts
  SET 
    start_ts = COALESCE(v_start_ts, start_ts),
    end_ts = COALESCE(v_end_ts, end_ts),
    updated_at = now()
  WHERE id = p_shift_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift not found: %', p_shift_id;
  END IF;
  
  -- Log adjustment
  INSERT INTO audit_log (action, performed_by, source, meta)
  VALUES (
    'time_entry_adjusted',
    auth.uid(),
    'update_time_entry',
    jsonb_build_object(
      'shift_id', p_shift_id,
      'patch', p_patch
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION update_time_entry(uuid, jsonb) TO authenticated;
```

**Acceptance Criteria:**
- [ ] All 3 RPCs created
- [ ] Summary table populates in Time & Payroll page
- [ ] Clicking "View Details" shows daily breakdown
- [ ] Admin can edit shift times
- [ ] Net hours calculated correctly (shift - breaks)
- [ ] Pay calculated correctly (net_hours * hourly_rate)
- [ ] CSV export works with RPC data
- [ ] Manual test: Staff works shift with breaks → Verify calculations

**Related Tasks:**
- Task 7 (shifts/breaks tables) - **REQUIRED**
- Task 10 (hourly_rate column) - **REQUIRED**

**Notes:**
Consider adding:
- Overtime rules (1.5x after 40 hours/week)
- Holiday pay multipliers
- Adjustment notes field
- Approval workflow for time entries

---

### Task 14: Implement QC Photo System
**Status:** 🔴 Not Started  
**Priority:** 🟢 MEDIUM  
**Effort:** 1 week  
**Impact:** QC Photo Check assistant and Packing QC controls blocked  
**Owner:** TBD  
**Dependencies:** None  
**Report Source:** Report #4, Section 1 (Missing Tables)

**Problem:**
Spec includes QC Photo Check assistant and QC controls in Packing stage, but:
- `order_photos` table doesn't exist
- `upload_order_photo` RPC doesn't exist
- QC UI controls missing from Order Detail Drawer (Packing stage)

**Solution:**
Implement full QC photo system:

**Step 1: Create order_photos Table**

```sql
-- File: supabase/migrations/056_qc_photos.sql

CREATE TABLE IF NOT EXISTS order_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  store text NOT NULL CHECK (store IN ('Bannos','Flourlane')),
  url text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('Filling','Covering','Decorating','Packing','Complete')),
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','needs_review','rejected')),
  qc_issue text NULL,  -- 'Damaged Cake', 'Wrong spelling', etc.
  qc_comments text NULL,
  uploaded_by uuid NULL REFERENCES staff_shared(user_id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_order_photos_order_id ON order_photos(order_id, created_at DESC);
CREATE INDEX idx_order_photos_status ON order_photos(status) WHERE status != 'ok';
CREATE INDEX idx_order_photos_store_stage ON order_photos(store, stage, created_at DESC);

-- Enable RLS
ALTER TABLE order_photos ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone authenticated can read
CREATE POLICY order_photos_select_policy ON order_photos
  FOR SELECT TO authenticated
  USING (true);

-- RLS: No direct writes
CREATE POLICY order_photos_insert_policy ON order_photos
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- Comments
COMMENT ON TABLE order_photos IS 'Photos of orders for QC tracking';
COMMENT ON COLUMN order_photos.qc_issue IS 'Type of QC issue: Damaged Cake, Wrong spelling, etc.';
```

**Step 2: Create upload_order_photo RPC**

```sql
CREATE OR REPLACE FUNCTION upload_order_photo(
  p_order_id text,
  p_store text,
  p_url text,
  p_stage text,
  p_status text DEFAULT 'ok',
  p_qc_issue text DEFAULT NULL,
  p_qc_comments text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_photo_id uuid;
BEGIN
  -- Validate inputs
  IF p_store NOT IN ('Bannos', 'Flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;
  
  IF p_stage NOT IN ('Filling','Covering','Decorating','Packing','Complete') THEN
    RAISE EXCEPTION 'Invalid stage: %', p_stage;
  END IF;
  
  IF p_status NOT IN ('ok','needs_review','rejected') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;
  
  -- Insert photo
  INSERT INTO order_photos (
    order_id,
    store,
    url,
    stage,
    status,
    qc_issue,
    qc_comments,
    uploaded_by
  ) VALUES (
    p_order_id,
    p_store,
    p_url,
    p_stage,
    p_status,
    p_qc_issue,
    p_qc_comments,
    auth.uid()
  ) RETURNING id INTO v_photo_id;
  
  RETURN v_photo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION upload_order_photo(text, text, text, text, text, text, text) TO authenticated;
```

**Step 3: Add QC Controls to Order Detail Drawer**

```tsx
// File: src/components/OrderDetailDrawer.tsx

// Add QC section when order.stage === 'Packing'
{order.stage === 'Packing' && (
  <div className="qc-section">
    <h3>Quality Control</h3>
    
    <select 
      value={qcIssue} 
      onChange={(e) => setQcIssue(e.target.value)}
    >
      <option value="">None</option>
      <option value="Damaged Cake">Damaged Cake</option>
      <option value="Wrong spelling">Wrong spelling</option>
    </select>
    
    <textarea 
      placeholder="QC comments (optional)"
      value={qcComments}
      onChange={(e) => setQcComments(e.target.value)}
    />
    
    <button onClick={handleUploadPhoto}>
      Upload Photo
    </button>
    
    {/* Optional: Run AI QC button */}
    <button onClick={handleRunAIQC}>
      Run AI QC
    </button>
  </div>
)}
```

**Step 4: Add Photo Gallery View**
Show uploaded photos in Order Detail Drawer

**Acceptance Criteria:**
- [ ] order_photos table created
- [ ] upload_order_photo RPC works
- [ ] QC section appears in Order Detail when stage = Packing
- [ ] Can select QC issue and add comments
- [ ] Can upload photo (actual upload may use Supabase Storage)
- [ ] Photos display in Order Detail
- [ ] Photos filterable by status (ok/needs_review)
- [ ] Manual test: Upload photo → Verify in database

**Related Tasks:**
- Future: AI QC assistant integration

**Notes:**
Photo storage should use Supabase Storage buckets with signed URLs. This RPC just tracks metadata. Actual upload flow:
1. Frontend uploads file to Storage bucket
2. Gets signed URL
3. Calls upload_order_photo with URL

---

### Task 15: Create Dedicated Complete Page
**Status:** 🔴 Not Started  
**Priority:** 🟢 MEDIUM  
**Effort:** 1 day  
**Impact:** No proper view of completed orders  
**Owner:** TBD  
**Dependencies:** None  
**Report Source:** Reports #1, #2, #3 (All mention missing)

**Problem:**
Spec requires dedicated `/[store]/complete` page with:
- Read-only card grid
- Search functionality
- Storage filter
- Date scope (default: Today)

Currently, completed orders show in "ready" tab or mixed with other views.

**Solution:**
Create dedicated Complete page:

**Step 1: Create get_complete RPC** (may already exist, verify)

```sql
-- File: supabase/migrations/057_get_complete_rpc.sql

CREATE OR REPLACE FUNCTION get_complete(
  p_store text,
  p_from date DEFAULT CURRENT_DATE,
  p_to date DEFAULT CURRENT_DATE,
  p_storage text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 50
) RETURNS TABLE(
  id text,
  order_number integer,
  product_title text,
  size text,
  customer_name text,
  storage text,
  priority smallint,
  delivery_method text,
  due_date date,
  packing_complete_ts timestamptz,
  assignee_name text
) LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_name text;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;
  
  v_table_name := 'orders_' || p_store;
  
  RETURN QUERY EXECUTE format(
    'SELECT 
      o.id,
      o.shopify_order_number,
      o.product_title,
      o.size,
      o.customer_name,
      o.storage,
      o.priority,
      o.delivery_method,
      o.due_date,
      o.packing_complete_ts,
      s.full_name as assignee_name
    FROM %I o
    LEFT JOIN staff_shared s ON s.user_id = o.assignee_id
    WHERE o.stage = $1
      AND o.packing_complete_ts >= $2::timestamptz
      AND o.packing_complete_ts < ($3::date + interval ''1 day'')::timestamptz
      AND ($4::text IS NULL OR o.storage = $4)
      AND ($5::text IS NULL OR 
           o.shopify_order_number::text ILIKE ''%%'' || $5 || ''%%'' OR
           o.product_title ILIKE ''%%'' || $5 || ''%%'' OR
           o.customer_name ILIKE ''%%'' || $5 || ''%%'')
    ORDER BY o.packing_complete_ts DESC
    OFFSET $6
    LIMIT $7',
    v_table_name
  ) USING 'Complete', p_from, p_to, p_storage, p_search, p_offset, p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_complete(text, date, date, text, text, integer, integer) TO authenticated;
```

**Step 2: Create CompletePage Component**

```tsx
// File: src/components/CompletePage.tsx

export function CompletePage({ store }: { store: 'bannos' | 'flourlane' }) {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
  const [storage, setStorage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const { data: orders, loading } = useQuery(
    ['complete', store, dateRange, storage, search],
    () => rpcClient.getComplete({
      store,
      from: getDateFrom(dateRange),
      to: getDateTo(dateRange),
      storage,
      search
    })
  );
  
  return (
    <div className="complete-page">
      <h1>Completed Orders - {store}</h1>
      
      <div className="filters">
        <DateRangeToggle value={dateRange} onChange={setDateRange} />
        <StorageFilter value={storage} onChange={setStorage} store={store} />
        <Search value={search} onChange={setSearch} />
      </div>
      
      <div className="order-grid">
        {orders.map(order => (
          <OrderCard 
            key={order.id} 
            order={order} 
            readOnly={true}  // No assign actions
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Add Routes**
If using explicit routes, add:
- `/bannos/complete`
- `/flourlane/complete`

If using Single URL architecture, add:
- `/?page=bannos-complete`
- `/?page=flourlane-complete`

**Acceptance Criteria:**
- [ ] get_complete RPC created
- [ ] CompletePage component created
- [ ] Page accessible per store
- [ ] Date range toggle works (Today/Week/Month)
- [ ] Storage filter works
- [ ] Search works (order #, product, customer)
- [ ] OrderCard displays in read-only mode
- [ ] No "Assign" actions shown
- [ ] "Open Order" opens Order Detail Drawer
- [ ] Manual test: Complete order → Shows in Complete view

**Related Tasks:**
- Task 8 (Completion timestamps) - Enables proper filtering

**Notes:**
Consider adding export functionality (CSV of completed orders).

---

### Task 16: Enable RLS Policies
**Status:** 🔴 Not Started  
**Priority:** 🟢 MEDIUM  
**Effort:** 3 days  
**Impact:** Hardens security layer  
**Owner:** TBD  
**Dependencies:** None  
**Report Source:** Report #4, Section 5 (Security - RLS Not Enabled)

**Problem:**
RLS (Row Level Security) is NOT enabled on any tables. Currently relying solely on SECURITY DEFINER RPCs for security. While this works, RLS provides defense-in-depth:
- Prevents accidental direct table access
- Protects against RPC bugs
- Industry best practice

**Solution:**
Enable RLS on all tables with proper policies:

**Step 1: Create RLS Migration**

```sql
-- File: supabase/migrations/058_enable_rls.sql

-- Enable RLS on all main tables
ALTER TABLE orders_bannos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders_flourlane ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shared ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_txns ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_photos ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Everyone can READ (authenticated users)
CREATE POLICY orders_bannos_select ON orders_bannos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY orders_flourlane_select ON orders_flourlane
  FOR SELECT TO authenticated USING (true);

CREATE POLICY staff_shared_select ON staff_shared
  FOR SELECT TO authenticated USING (true);

CREATE POLICY stage_events_select ON stage_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY settings_select ON settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY components_select ON components
  FOR SELECT TO authenticated USING (true);

CREATE POLICY boms_select ON boms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY bom_items_select ON bom_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY component_txns_select ON component_txns
  FOR SELECT TO authenticated USING (true);

-- Shifts: Staff can only see their own
CREATE POLICY shifts_select ON shifts
  FOR SELECT TO authenticated 
  USING (staff_id = auth.uid() OR check_user_role('Admin'));

-- Breaks: Staff can only see their own
CREATE POLICY breaks_select ON breaks
  FOR SELECT TO authenticated
  USING (shift_id IN (
    SELECT id FROM shifts WHERE staff_id = auth.uid()
  ) OR check_user_role('Admin'));

CREATE POLICY order_photos_select ON order_photos
  FOR SELECT TO authenticated USING (true);

-- POLICY 2: DENY all direct writes (RPC-only)
CREATE POLICY orders_bannos_write ON orders_bannos
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY orders_flourlane_write ON orders_flourlane
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY staff_shared_write ON staff_shared
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY stage_events_write ON stage_events
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY settings_write ON settings
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY components_write ON components
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY boms_write ON boms
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY bom_items_write ON bom_items
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY component_txns_write ON component_txns
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY shifts_write ON shifts
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY breaks_write ON breaks
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY order_photos_write ON order_photos
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Comments
COMMENT ON POLICY orders_bannos_select ON orders_bannos IS 'Allow all authenticated users to read orders';
COMMENT ON POLICY orders_bannos_write ON orders_bannos IS 'Deny all direct writes - use RPCs only';
```

**Step 2: Test All Existing Functionality**
RLS should be transparent since all writes go through SECURITY DEFINER RPCs, but test:
1. Queue pages load correctly
2. Assign works
3. Scanner works
4. Settings update works
5. Inventory updates work
6. Staff Workspace works

**Step 3: Verify Direct Writes Blocked**
Test that direct Supabase client writes fail:

```typescript
// This should fail with RLS error
const { error } = await supabase
  .from('orders_bannos')
  .insert({ id: 'test', ... });

expect(error).toBeTruthy();
```

**Acceptance Criteria:**
- [ ] RLS enabled on all tables
- [ ] Read policies allow authenticated users
- [ ] Write policies deny direct access
- [ ] All RPCs still work (SECURITY DEFINER bypasses RLS)
- [ ] All UI functionality unchanged
- [ ] Direct writes blocked (test in console)
- [ ] Staff can only see their own shifts/breaks
- [ ] No performance degradation

**Related Tasks:**
- None (foundational security)

**Notes:**
**IMPORTANT:** Test thoroughly in dev before deploying to production. RLS bugs can break functionality silently.

---

## 🔵 TIER 4: ARCHITECTURAL DECISIONS
**Impact:** Documentation and optional refactoring  
**Timeline:** As needed

---

### Task 17: Document Single URL Architecture Decision
**Status:** 🔴 Not Started  
**Priority:** 🔵 LOW (Documentation)  
**Effort:** 2 hours  
**Impact:** Clarifies intentional architectural deviation  
**Owner:** TBD  
**Dependencies:** None  
**Report Source:** All 5 reports mention route mismatch

**Problem:**
All 5 audit reports flag that URL structure doesn't match spec:
- **Spec:** `/bannos/queue/filling`, `/flourlane/settings`
- **Reality:** `/?page=bannos-production&view=unassigned`

This is causing confusion about whether it's intentional or technical debt.

**Solution:**
Create ADR (Architecture Decision Record) explaining the choice:

```markdown
# ADR-001: Single URL Architecture

## Status
Accepted

## Context
Project Principles document specifies store-based routing:
- `/bannos/queue/filling`
- `/flourlane/queue/covering`
- `/bannos/settings`

However, implementation uses Single URL Architecture:
- All users route to `/`
- Navigation via URL query params: `?page=bannos-production&view=filling`
- Role-based rendering determines UI

## Decision
Use Single URL Architecture instead of store-specific routes.

## Rationale
**Pros of Single URL:**
1. Simpler authentication flow (single entry point)
2. Easier state management (no route guards per store)
3. Role-based access control more natural
4. Users bookmark `/` and get their personalized view
5. Less code duplication (one Dashboard component)

**Cons:**
1. URL doesn't indicate current store/view
2. Can't deep-link to specific queue/store
3. Browser back button behavior less intuitive
4. Doesn't match documented architecture

## Consequences
- Update Project Principles to reflect actual architecture
- All navigation uses setActiveView() instead of router.push()
- Deep links not supported (always land on role-specific home)
- URL params used for navigation state, not routes

## Alternatives Considered
1. **Store-based routes**: More RESTful, better deep-linking, but requires complex routing logic
2. **Hybrid**: Store routes for deep-links, role-based for nav. Too complex.

## References
- Reports 1-5: All flagged route mismatch
- App.tsx: RoleBasedRouter implementation
- Dashboard.tsx: View switching via query params
```

**Acceptance Criteria:**
- [ ] ADR document created: `docs/ADR-001-single-url-architecture.md`
- [ ] ADR added to docs index
- [ ] Project Principles updated to match (if keeping Single URL)
- [ ] Team agrees this is intentional, not debt

**Related Tasks:**
- Task 18 (Reusable components) - Similar architectural decision
- Task 19 (Generic settings table) - Similar deviation

**Notes:**
**DECISION NEEDED:** Is this intentional or should we refactor to match spec? If intentional, document it. If debt, prioritize refactoring.

---

### Task 18: Extract Reusable Components (Optional)
**Status:** 🔴 Not Started  
**Priority:** 🔵 LOW (Refactoring)  
**Effort:** 1 week  
**Impact:** Improves code maintainability  
**Owner:** TBD  
**Dependencies:** None  
**Report Source:** Reports #1, #3, #5 (Missing reusable components)

**Problem:**
Spec defines reusable components:
- `<OrderCard>`
- `<FilterBar>`
- `<StickyAssignBar>`
- `<PrintTicketButton>`

But code audit shows these are embedded inline in larger components rather than extracted as separate files.

**Decision:**
Is this a problem or acceptable architectural choice?

**Options:**

**Option A: Keep Inline** (Current State)
- Pros: Less files, simpler imports, colocated with usage
- Cons: Harder to maintain consistency, can't reuse across pages

**Option B: Extract Components** (Spec Compliance)
- Pros: Reusable, testable, matches spec, better separation
- Cons: More files, more imports, may over-engineer

**Recommendation:**
Document current approach as ADR if keeping inline. Otherwise, extract components:

**Extraction Plan:**

1. Extract `<OrderCard>`:
```tsx
// File: src/components/OrderCard.tsx
export interface OrderCardProps {
  order: Order;
  readOnly?: boolean;
  onAssign?: (orderId: string) => void;
  onSelect?: (orderId: string) => void;
  selected?: boolean;
}

export function OrderCard({ order, readOnly, onAssign, onSelect, selected }: OrderCardProps) {
  // Component implementation
}
```

2. Extract `<FilterBar>`:
```tsx
// File: src/components/FilterBar.tsx
export interface FilterBarProps {
  primaryFilter: string;
  primaryOptions: string[];
  onPrimaryChange: (value: string) => void;
  storage: string | null;
  storageOptions: string[];
  onStorageChange: (value: string | null) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export function FilterBar(props: FilterBarProps) {
  // Component implementation
}
```

3. Extract `<StickyAssignBar>`:
```tsx
// File: src/components/StickyAssignBar.tsx
export interface StickyAssignBarProps {
  selectedCount: number;
  onAssign: () => void;
  onClear: () => void;
  onSetStorage: (storage: string) => void;
  visible: boolean;
}

export function StickyAssignBar(props: StickyAssignBarProps) {
  // Component implementation
}
```

4. Extract `<PrintTicketButton>`:
```tsx
// File: src/components/PrintTicketButton.tsx
export interface PrintTicketButtonProps {
  orderId: string;
  store: 'bannos' | 'flourlane';
  variant?: 'primary' | 'secondary';
}

export function PrintTicketButton({ orderId, store, variant }: PrintTicketButtonProps) {
  // Component implementation
}
```

**Acceptance Criteria:**
- [ ] Decision made: Extract or document inline approach
- [ ] If extracting: All 4 components in separate files
- [ ] If extracting: PropTypes/interfaces defined
- [ ] If extracting: Components used in multiple places
- [ ] If keeping inline: ADR explaining choice

**Related Tasks:**
- Task 17 (Document Single URL) - Similar architectural decision

**Notes:**
**LOW PRIORITY** - This is refactoring for code quality, not fixing broken functionality. Only do if time permits or if component reuse becomes a problem.

---

### Task 19: Document Generic Settings Table Approach
**Status:** 🔴 Not Started  
**Priority:** 🔵 LOW (Documentation)  
**Effort:** 1 hour  
**Impact:** Clarifies intentional deviation  
**Owner:** TBD  
**Dependencies:** None  
**Report Source:** Reports #2, #4 (Settings structure differs)

**Problem:**
Spec calls for separate settings tables:
- `store_settings_printing`
- `store_settings_due_date`
- `store_settings_monitor`
- `store_flavours`
- `store_storage_locations`

Implementation uses generic `settings` table:
```sql
settings (
  store text,
  key text,
  value jsonb
)
```

This works fine but differs from spec.

**Solution:**
Document as ADR:

```markdown
# ADR-002: Generic Settings Table

## Status
Accepted

## Context
Spec defines separate tables for each settings category. Implementation uses single generic `settings` table with JSONB values.

## Decision
Use generic `settings(store, key, value)` table instead of separate tables per category.

## Rationale
**Pros:**
1. Flexible - Easy to add new settings without migrations
2. Simple - One RPC pattern for all settings
3. Less schema maintenance
4. JSONB supports complex nested structures

**Cons:**
1. No type safety at database level
2. Can't enforce NOT NULL on specific setting fields
3. Query performance may degrade with many settings
4. Harder to document schema

## Implementation
```sql
CREATE TABLE settings (
  store text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  PRIMARY KEY (store, key)
);
```

**Current Keys:**
- `filling_flavours` → array of strings
- `storage_locations` → array of strings
- `printing_settings` → object
- `due_date_settings` → object
- `monitor_density` → string

## Consequences
- Type validation happens in RPC layer, not database
- Must maintain documentation of expected JSONB structure
- Easy to add new settings categories

## Alternatives Considered
1. **Separate tables per category**: More type-safe, but requires migration per new setting
2. **Hybrid**: Some tables, some JSONB. Too complex.

## References
- `supabase/migrations/044_settings.sql`
- `src/components/SettingsPage.tsx`
```

**Acceptance Criteria:**
- [ ] ADR created: `docs/ADR-002-generic-settings-table.md`
- [ ] Document expected JSONB structures for each key
- [ ] Add to docs index

**Related Tasks:**
- Task 17 (Single URL Architecture) - Similar documentation

**Notes:**
This is purely documentation. No code changes needed. The generic settings approach is **working fine** and may even be better than separate tables.

---

### Task 20: Gate Assign Visibility by Role and Stage
**Status:** 🔴 Not Started  
**Priority:** 🔵 LOW (Polish)  
**Effort:** 2 hours  
**Impact:** Improves UI clarity and access control  
**Owner:** TBD  
**Dependencies:** None  
**Report Source:** Report #3 (Visual Code Audit)

**Problem:**
Spec states:
> "Assign Selected available only in Unassigned and Filling"
> "Staff cannot self-assign; they only scan to Complete"

Current implementation shows Assign actions whenever items are selected, regardless of stage or role.

**Solution:**
Gate Assign visibility:

```tsx
// File: src/components/QueueTable.tsx or StickyAssignBar.tsx

const showAssignActions = useMemo(() => {
  // Rule 1: Only Supervisor/Admin can assign
  if (!['Supervisor', 'Admin'].includes(userRole)) {
    return false;
  }
  
  // Rule 2: Only in Unassigned or Filling stages
  if (!['unassigned', 'Filling'].includes(currentStage)) {
    return false;
  }
  
  // Rule 3: Must have selected items
  if (selectedOrders.length === 0) {
    return false;
  }
  
  return true;
}, [userRole, currentStage, selectedOrders]);

return (
  <>
    {showAssignActions && (
      <StickyAssignBar 
        selectedCount={selectedOrders.length}
        onAssign={handleAssign}
        onClear={handleClear}
      />
    )}
  </>
);
```

**Acceptance Criteria:**
- [ ] Assign actions only visible in Unassigned and Filling
- [ ] Assign actions only visible to Supervisor/Admin
- [ ] Staff role cannot see Assign button
- [ ] Other stages (Covering, Decorating, Packing) don't show Assign
- [ ] Manual test: Login as Staff → No assign button
- [ ] Manual test: Login as Supervisor in Covering → No assign button

**Related Tasks:**
- None (UI polish)

**Notes:**
Consider adding tooltip explaining why Assign is hidden: "Assign only available in Unassigned/Filling stages"

---

## 📈 Summary Statistics

**Total Tasks:** 20  
**Not Started:** 20  
**In Progress:** 0  
**Done:** 0  
**Cancelled:** 0  

**By Priority:**
- 🔴 Critical (Tier 1): 6 tasks
- 🟡 High (Tier 2): 5 tasks
- 🟢 Medium (Tier 3): 5 tasks
- 🔵 Low (Tier 4): 4 tasks

**By Effort:**
- ⚡ Quick (<2 hours): 6 tasks
- 📦 Medium (1 day - 1 week): 10 tasks
- 🏗️ Large (>1 week): 4 tasks

**Estimated Timeline:**
- Tier 1 (Critical): 1-2 days
- Tier 2 (High): 1-2 weeks
- Tier 3 (Medium): 3-4 weeks
- Tier 4 (Low): As needed

**Target Completion:** 95% alignment in 4-6 weeks

---

## 🚀 Getting Started

**Today's Quick Wins** (Complete in ~4 hours):
1. Task 1: Update Order TypeScript interface (30 min)
2. Task 2: Add flavour column (10 min)
3. Task 3: Fix stage naming drift (2 hours)
4. Task 4: Implement set_storage RPC (1 hour)

**This Week** (Complete Tier 1):
- Task 5: Implement print_barcode RPC
- Task 6: Create stage_events table

**Next 2 Weeks** (Complete Tier 2):
- Task 7: Verify shift/break RPCs
- Task 8: Add completion timestamps
- Task 9: Implement inventory deduction
- Task 10: Add staff columns
- Task 11: Add storage filter

---

## 📝 Notes

### Update Instructions:
When completing a task:
1. Change status from 🔴 to ✅
2. Add completion date
3. Add any notes learned during implementation
4. Update progress summary at top

### Blocking Dependencies:
- Task 5 (print_barcode) → Requires Task 6 (stage_events table)
- Task 7 (Time & Payroll RPCs) → Requires Task 7 (shifts/breaks tables)
- Task 11 (Storage filter) → Requires Task 4 (set_storage RPC)

### Priority Adjustments:
If priorities change during development, update task priority and move to appropriate tier.

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-08  
**Next Review:** After completing Tier 1
