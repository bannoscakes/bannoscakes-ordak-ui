# Orders Management Page - Final Spec

**Issues**: #395, #514

---

## Status Logic (Wired to Production)

| Condition | Display | Color |
|-----------|---------|-------|
| `stage != 'Complete'` | In Production | Yellow |
| `stage = 'Complete' AND cancelled_at IS NULL` | Completed | Green |
| `stage = 'Complete' AND cancelled_at IS NOT NULL` | Cancelled | Red/Gray |

---

## Database Change Required

```sql
-- Add cancelled_at column to both order tables
ALTER TABLE orders_bannos ADD COLUMN cancelled_at timestamptz DEFAULT NULL;
ALTER TABLE orders_flourlane ADD COLUMN cancelled_at timestamptz DEFAULT NULL;
```

---

## Actions

| Action | What it does |
|--------|--------------|
| **Edit** | Opens `EditOrderDrawer` (change due date = postpone) |
| **Cancel Order** | Sets `stage = 'Complete'` + `cancelled_at = NOW()` |
| **Mark Complete** | Sets `stage = 'Complete'` only |

---

## Store Handling

Same as Dashboard - **Store Selection Panel** toggle between Bannos / Flourlane

---

## Views

### 1. List View

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Orders                                              [Bannos ▼] [Export CSV]    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [📋 List]  [📅 Calendar]                                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Status: [All ▼]   Date: [1/12/2025 - 31/12/2025]            Search: [______]  │
│                                                                                 │
│  Order #    Order Type    Customer       Due Date     Status        Actions     │
│  ────────── ───────────── ───────────── ──────────── ───────────── ─────────── │
│  B-25876   [Pickup]       Jess Reed     31 Dec 2025  [In Production] [Edit][▼] │
│  B-25771   [Delivery]     Ajeng Syifa   31 Dec 2025  [In Production] [Edit][▼] │
│  B-25680   [Pickup]       John Smith    30 Dec 2025  [Completed]     [Edit][▼] │
│  B-25542   [Delivery]     Jane Doe      29 Dec 2025  [Cancelled]     [Edit][▼] │
│  ...                                                                            │
│                                                                                 │
│  Showing 1-50 of 234                              [◀ Prev]  [1] [2]  [Next ▶]  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Table Columns**:

| Column | Source |
|--------|--------|
| Order # | `human_id` (formatted with store prefix) |
| Order Type | `delivery_method` badge |
| Customer | `customer_name` |
| Due Date | `due_date` |
| Status | In Production / Completed / Cancelled |
| Actions | Edit, Cancel, Complete (dropdown) |

**Filters**:
- Status dropdown: All, In Production, Completed, Cancelled
- Date range picker
- Search box (searches order #, customer name)

### 2. Calendar View

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Orders                                              [Bannos ▼]                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [📋 List]  [📅 Calendar]                                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  [Filter ▼]                                                [today] [◀] [▶]     │
│                                                                                 │
│  December 2025                                                                  │
│  ┌────────┬────────┬────────┬────────┬────────┬────────┬────────┐             │
│  │  MON   │  TUE   │  WED   │  THU   │  FRI   │  SAT   │  SUN   │             │
│  ├────────┼────────┼────────┼────────┼────────┼────────┼────────┤             │
│  │   1    │   2    │   3    │   4    │   5    │   6    │   7    │             │
│  │🔵B24864│🔵B25171│🟠B24959│        │🔵B23564│🟠B24090│🔴B24385│             │
│  │🟠B24958│🔵B25218│🔵B25047│        │🟠B24226│🔵B24187│🔵B24392│             │
│  │  ...   │  ...   │  ...   │        │  ...   │  ...   │  ...   │             │
│  └────────┴────────┴────────┴────────┴────────┴────────┴────────┘             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Calendar Pills**:
- Color by delivery method:
  - 🔵 **Cyan** = Pickup
  - 🟠 **Amber** = Delivery
- Cancelled orders: 🔴 **Red dot** or strikethrough text
- Click → Popup with order details + Edit button

---

## Color Scheme

| Element | Color | Tailwind |
|---------|-------|----------|
| Pickup badge/dot | Cyan | `bg-cyan-500` |
| Delivery badge/dot | Amber | `bg-amber-500` |
| In Production status | Yellow | `bg-yellow-100 text-yellow-800` |
| Completed status | Green | `bg-green-100 text-green-800` |
| Cancelled status | Red/Gray | `bg-red-100 text-red-800` |

**NOT using**: Production stage colors (blue/purple/pink/orange/green for Filling/Covering/etc.)

---

## Access Control

Same as existing Dashboard logic - no special restrictions.

---

## NOT Included

- ❌ Address column (not needed)
- ❌ Production stage colors in calendar (use delivery method colors instead)

---

## Files to Create/Modify

### New Files
1. `src/components/OrdersPage.tsx` - Main page with tabs + store selector
2. `src/components/OrdersListView.tsx` - Table view
3. `src/components/OrdersCalendarView.tsx` - Calendar view
4. `src/hooks/useOrdersManagement.ts` - Data fetching hook
5. `supabase/migrations/YYYYMMDDHHMMSS_add_cancelled_at.sql` - DB migration

### Files to Modify
1. `src/components/Sidebar.tsx` - Add "Orders" nav item
2. `src/components/Dashboard.tsx` - Add routing
3. `src/lib/rpc-client.ts` - Add cancelOrder, markComplete functions
4. `src/types/supabase.ts` - Regenerate types after migration

---

## Implementation Phases

### Phase 1: Database + Core Infrastructure (PR #1)
**Scope**: Foundation work

- [ ] Create migration: `add_cancelled_at` column to both tables
- [ ] Create/update RPC: `cancel_order(order_id, store)` - sets stage='Complete' + cancelled_at=NOW()
- [ ] Create/update RPC: `mark_order_complete(order_id, store)` - sets stage='Complete' only
- [ ] Update `get_queue` RPC to return `cancelled_at` field
- [ ] Regenerate TypeScript types
- [ ] Add RPC wrapper functions in `rpc-client.ts`

**Files**:
- `supabase/migrations/YYYYMMDDHHMMSS_add_cancelled_at.sql`
- `src/lib/rpc-client.ts`
- `src/types/supabase.ts`

### Phase 2: Orders List View (PR #2)
**Scope**: Table view with full functionality

- [ ] Create `useOrdersManagement` hook
- [ ] Create `OrdersPage.tsx` with tabs skeleton
- [ ] Create `OrdersListView.tsx` with:
  - Table with all columns
  - Status/date filters
  - Search
  - Pagination
  - Actions dropdown (Edit/Cancel/Complete)
- [ ] Add sidebar navigation
- [ ] Add Dashboard routing
- [ ] Wire up Edit → EditOrderDrawer
- [ ] Wire up Cancel/Complete actions

**Files**:
- `src/hooks/useOrdersManagement.ts`
- `src/components/OrdersPage.tsx`
- `src/components/OrdersListView.tsx`
- `src/components/Sidebar.tsx`
- `src/components/Dashboard.tsx`

### Phase 3: Orders Calendar View (PR #3)
**Scope**: Monthly calendar visualization

- [ ] Create `OrdersCalendarView.tsx` with:
  - Month navigation (prev/next/today)
  - Monthly grid layout
  - Order pills with delivery method colors
  - Cancelled order styling (red dot)
  - Click popup with order details
  - Edit button in popup
- [ ] Filter dropdown for calendar
- [ ] Wire up to existing data hook

**Files**:
- `src/components/OrdersCalendarView.tsx`
- Update `src/components/OrdersPage.tsx`

### Phase 4: Polish & Testing (PR #4 - optional)
**Scope**: Refinements

- [ ] Export CSV functionality
- [ ] Loading/error states
- [ ] Empty state designs
- [ ] Mobile responsiveness
- [ ] Edge case handling

---

## Questions for Clarification

None - spec is clear. Ready to implement.
