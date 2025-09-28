# Workspace Access Guide

## Staff Workspace Access

### How to Access Staff Workspace

**Method 1: Direct URL**
Navigate to: `/workspace/staff` or add `?view=staff` to the current URL

**Method 2: Demo Credentials**
When the sign-in page loads, use these credentials:

**Option A - Manual Entry:**
- Email/Staff ID: `john.doe@bakery.com`
- PIN: `123456`

**Option B - Badge Scan:**
Click "Scan Staff Badge" button to auto-fill the credentials above

**Option C - Test Error State:**
- Email: `pending@example.com`
- PIN: Any 6 digits
- Result: Shows "Your account is pending approval" error

### Staff Features Available

**Shift Management:**
- Start Shift / End Shift
- Start Break / End Break
- Real-time elapsed time tracking
- Break mode disables scanning actions

**Order Management:**
- View assigned orders from both Bannos and Flourlane stores
- Search orders by number, customer, or product
- View order details (read-only)
- Print order barcodes
- Scan to complete stages

**Scanner Functionality:**
- Full-screen camera overlay simulation
- Manual barcode entry fallback
- Stage completion confirmation
- Success/error handling
- Order removal after completion

---

## Supervisor Workspace Access

### How to Access Supervisor Workspace

**Method 1: Direct URL**
Navigate to: `/workspace/supervisor` or add `?view=supervisor` to the current URL

**Method 2: Demo Credentials**
When the sign-in page loads, use these credentials:

**Option A - Manual Entry:**
- Email/Supervisor ID: `supervisor@bakery.com`
- PIN: `123456`

**Option B - Badge Scan:**
Click "Scan Supervisor Badge" button to auto-fill the credentials above

### Supervisor Features Available

**Queue Shortcuts (Big CTA Tiles):**
- **Open Bannos Queue** → Routes to Bannos Production with "Unassigned" filter
- **Open Flourlane Queue** → Routes to Flourlane Production with "Unassigned" filter

**Shift Management:**
- Same shift/break controls as Staff Workspace
- Real-time time tracking

**My Tasks Section (Optional):**
- View personally assigned orders
- Search functionality
- Same order cards as Staff Workspace
- Actions: View Order, Scan to Complete, Print Barcode
- No assignment actions (done in production queues)

**Order Management:**
- Same view-only Order Detail drawer as Staff
- Same Scanner overlay functionality

---

## Design Consistency

Both workspaces maintain complete design consistency with the main dashboard:
- Same typography, colors, and spacing
- Reuses existing components (OrderCard, drawers, etc.)
- Consistent Bannos (blue) and Flourlane (pink) branding
- Same drawer/modal widths and styling
- 44px minimum touch targets
- Date-only due dates
- Separate size lines with realistic values

## Navigation Flows

**Staff Workspace:**
Sign in → Workspace → Order Detail → Scanner → back to Workspace

**Supervisor Workspace:**
Sign in → Workspace → Queue Shortcuts → Production Pages (with unassigned filter)
OR: Sign in → Workspace → My Tasks → Order Detail → Scanner

**Key Differences:**
- Staff: Personal task-focused, assigned orders only
- Supervisor: Management-focused with queue shortcuts + optional personal tasks
- Both: Break mode overlays disable actions appropriately
- Both: Same Order Detail and Scanner components (reused)

---

## Settings Pages Access

### How to Access Settings

**Routes:**
- **Bannos Settings**: `/bannos/settings` or navigate via sidebar
- **Flourlane Settings**: `/flourlane/settings` or navigate via sidebar

**Access Level:** Admin/Supervisor only

### Settings Features Available

**Shopify Integration:**
- Storefront Access Token with show/hide toggle
- Test Connection and Connect & Sync functionality
- Order Sync with progress tracking and sync log access
- Real-time status banners and error handling

**Store Configuration:**
- **Printing**: Ticket size (58mm/80mm/Custom), copies (1-3), barcode prefix
- **Due Date Defaults**: Default due date, allowed days toggles, blackout dates
- **Priority Info**: Read-only explanation of priority derivation
- **Filling Flavours**: Store-specific reorderable list (Bannos: 5, Flourlane: 9)
- **Storage Locations**: 5 customizable storage location labels
- **Monitor Options**: Auto-refresh intervals, display density settings

**Form Management:**
- Sticky footer with Save/Cancel buttons (appears only when changes made)
- Individual card actions for integration features
- Real-time validation and status feedback
- Confirm dialog for test print functionality

**Store-Specific Data:**
- Settings are scoped per store (Bannos vs Flourlane)
- Different flavour limits and default values
- Separate token storage and sync history

---

## Staff Management System (Admin Only)

### Staff Page Access

**Route:** `/staff` or navigate via sidebar (Admin only)

**Features:**
- **Staff Table**: Name, Role, Status, Email/ID, On Shift, Wage (masked for non-Admin), Actions
- **Add Staff**: Create new staff members with default settings
- **View/Edit Profiles**: Full staff profile management
- **Role Management**: Admin, Supervisor, Staff roles
- **Status Toggles**: Approved/Active status controls
- **Wage Management**: Hourly rate setting (Admin only)
- **PIN Reset**: Reset staff PIN via email
- **Timesheet Links**: Deep link to individual staff timesheets

**Profile Modal:**
- Full name, Email/ID, Role selection
- Status toggles (Approved/Active)
- Hourly rate input (Admin only)
- Store permissions (read-only: "Shared across Bannos & Flourlane")
- PIN reset functionality

### Time & Payroll System

**Route:** `/admin/time` or navigate via sidebar (Admin only)

**Features:**
- **Filter Bar**: Date range (week picker), Staff search, Store filter
- **Export/Approve**: CSV export, Approve Period buttons
- **Time Table**: Staff, Days worked, Shift hours, Break minutes, Net hours, Hourly rate, Pay
- **Details Modal**: Daily breakdown with editable entries
- **Time Adjustments**: Edit shift times, breaks, notes per day
- **Payroll Calculations**: Automatic pay calculations based on net hours

**Deep Links:**
- From Staff table: "View Timesheet" → `/admin/time?staff=<id>`
- Automatically filters to selected staff member

**Time Entry Management:**
- Per-day time editing with shift start/end times
- Break minutes tracking
- Net hours calculation
- Adjustment notes for time changes
- Real-time payroll recalculation

### Admin Role Features

**Access Control:**
- Staff page: Admin only
- Time & Payroll: Admin only
- Wage visibility: Admin sees actual rates, others see masked
- Time editing: Admin can modify all entries

**Navigation:**
- Time & Payroll appears under Staff section in sidebar
- Only visible to Admin users
- Staff section properly grouped

The system provides comprehensive workspace management with Staff and Supervisor roles, complete settings configuration for both stores, plus full staff management and time tracking for administrators. All features maintain design consistency and can be accessed easily using URL parameters or direct navigation paths.