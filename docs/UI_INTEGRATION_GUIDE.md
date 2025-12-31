# UI Integration Guide
**Version:** v0.3.0-beta  
**Status:** Ready for Integration  
**Last Updated:** 2025-10-01

---

## 🎯 Overview

All backend RPC functions are implemented and ready. This guide shows how to integrate them into the UI components.

---

## 📦 **RPC Client Usage**

### **Import the RPC Client**

```typescript
import {
  getQueue,
  getQueueStats,
  assignStaff,
  completeFilling,
  handlePrintBarcode,
  getOrderForScan,
  getStaffMe,
  startShift,
  endShift,
  getComponents,
  getFlavours,
  getStorageLocations,
} from '@/lib/rpc-client';
```

---

## 🔧 **Integration Examples**

### **1. Queue Display**

**Old Way (using views):**
```typescript
const { data } = await supabase.from('vw_queue_minimal').select('*');
```

**New Way (using RPCs):**
```typescript
import { getQueue } from '@/lib/rpc-client';

// Basic usage
const orders = await getQueue({ store: 'bannos' });

// With filtering
const fillingOrders = await getQueue({
  store: 'bannos',
  stage: 'Filling',
  limit: 50,
});

// With search
const searchResults = await getQueue({
  search: 'John',
  sort_by: 'due_date',
  sort_order: 'ASC',
});
```

### **2. Scanner Integration**

**Update `ScannerOverlay.tsx`:**
```typescript
import { getOrderForScan, completeFilling } from '@/lib/rpc-client';

// When barcode is scanned
const handleScan = async (barcodeData: string) => {
  try {
    const order = await getOrderForScan(barcodeData);
    
    if (!order.can_scan) {
      showError(order.message);
      return;
    }
    
    // Display order details
    setCurrentOrder(order);
    
    // Complete the current stage
    if (order.stage === 'Filling') {
      await completeFilling(order.order_id, order.store);
      showSuccess('Filling completed!');
    }
  } catch (error) {
    showError(error.message);
  }
};
```

### **3. Staff Assignment**

**Update `OrderDetailDrawer.tsx` or `QueueTable.tsx`:**
```typescript
import { assignStaff } from '@/lib/rpc-client';

const handleAssign = async (orderId: string, store: Store, staffId: string) => {
  try {
    await assignStaff(orderId, store, staffId);
    showSuccess('Staff assigned successfully!');
    refreshQueue();
  } catch (error) {
    showError(error.message);
  }
};
```

### **4. Storage Location**

```typescript
import { setStorage } from '@/lib/rpc-client';

const handleStorageUpdate = async (orderId: string, store: Store, location: string) => {
  try {
    await setStorage(orderId, store, location);
    showSuccess(`Storage set to ${location}`);
  } catch (error) {
    showError(error.message);
  }
};
```

### **5. Inventory Management**

**Update `InventoryPage.tsx`:**
```typescript
import { getComponents, getLowStockComponents, getInventoryValue } from '@/lib/rpc-client';

// Get all components
const components = await getComponents();

// Get low stock alerts
const lowStock = await getLowStockComponents();

// Get inventory summary
const summary = await getInventoryValue();
```

### **6. Staff Time Tracking**

**Update `StaffWorkspacePage.tsx`:**
```typescript
import { getStaffMe, startShift, endShift, getCurrentShift } from '@/lib/rpc-client';

// Get current staff info
const staffInfo = await getStaffMe();

// Clock in
await startShift();

// Clock out
await endShift();

// Check if currently on shift
const currentShift = await getCurrentShift();
```

### **7. Settings Management**

**Update `SettingsPage.tsx`:**
```typescript
import { getFlavours, setFlavours, getStorageLocations } from '@/lib/rpc-client';

// Get current flavours
const flavours = await getFlavours('bannos');

// Update flavours
await setFlavours('bannos', ['Vanilla', 'Chocolate', 'Strawberry']);

// Get storage locations
const locations = await getStorageLocations('bannos');
```

---

## 🎨 **Component Update Checklist**

### **Production Pages**
- [ ] `BannosProductionPage.tsx` - Use `getQueue()` with store filter
- [ ] `FlourlaneProductionPage.tsx` - Use `getQueue()` with store filter
- [ ] `QueueTable.tsx` - Update to use new queue data structure
- [ ] `MetricCards.tsx` - Use `getQueueStats()` for real-time counts

### **Scanner & Stage Management**
- [ ] `ScannerOverlay.tsx` - Integrate `getOrderForScan()` and stage completion RPCs
- [ ] Add barcode printing button using `handlePrintBarcode()`
- [ ] Add QC return button using `qcReturnToDecorating()`

### **Staff Workspace**
- [ ] `StaffWorkspacePage.tsx` - Add time tracking UI
- [ ] `StaffPage.tsx` - Use staff management RPCs
- [ ] Add shift management controls (clock in/out, break buttons)

### **Inventory**
- [ ] `InventoryPage.tsx` - Use `getComponents()`
- [ ] Add inventory value display

### **Settings**
- [ ] `SettingsPage.tsx` - Integrate all settings RPCs
- [ ] Add flavour management UI
- [ ] Add storage location management UI

### **Order Details**
- [ ] `OrderDetailDrawer.tsx` - Use `getOrder()` for full details
- [ ] `EditOrderDrawer.tsx` - Use `updateOrderCore()` for editing
- [ ] Add staff assignment dropdown
- [ ] Add storage location selector

---

## 🔐 **Authentication Notes**

Most RPCs require authentication and role-based permissions:

- **Staff Role**: Can view queues, update orders, manage shifts
- **Supervisor Role**: Can assign staff, access reports, QC returns
- **Admin Role**: Can manage settings, cancel orders, manage staff

Before the UI will work fully, you need to:
1. Configure Supabase Auth
2. Create staff accounts with roles
3. Implement login/logout UI
4. Pass authentication tokens with RPC calls (handled automatically by Supabase client)

---

## 🧪 **Testing the Integration**

### **1. Test with Mock Authentication (Development)**
For development, you can bypass authentication by:
- Setting a service role key (not recommended for production)
- Creating test staff accounts in Supabase Auth
- Using Supabase's built-in authentication UI

### **2. Test Each Component Individually**
1. Start with simple read operations (`getQueue`, `getComponents`)
2. Test write operations (`assignStaff`, `setStorage`)
3. Test complete workflows (scanner → stage completion)

### **3. Monitor the Browser Console**
All RPC calls will log errors to the console if they fail. Check for:
- Permission errors (need authentication)
- Data type errors (parameter mismatch)
- Not found errors (invalid order IDs)

---

## 🚀 **Quick Start**

### **Step 1: Test Basic Queue Display**

Update `src/components/QueueTable.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { getQueue } from '@/lib/rpc-client';

function QueueTable({ store }: { store?: Store }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQueue();
  }, [store]);

  const loadQueue = async () => {
    try {
      setLoading(true);
      const data = await getQueue({ store, limit: 100 });
      setOrders(data);
    } catch (error) {
      console.error('Failed to load queue:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <table>
      {orders.map(order => (
        <tr key={order.id}>
          <td>{order.customer_name}</td>
          <td>{order.product_title}</td>
          <td>{order.stage}</td>
          <td>{order.due_date}</td>
        </tr>
      ))}
    </table>
  );
}
```

### **Step 2: Test in Browser**

1. Run `npm run dev`
2. Open the app in browser
3. Check browser console for any RPC errors
4. Verify data is loading from Supabase

---

## ⚠️ **Common Issues**

### **"Insufficient permissions" Error**
- Need to configure authentication
- User must be logged in with appropriate role

### **"Function does not exist" Error**
- Make sure all SQL files are applied to Supabase
- Check function names match exactly

### **"Invalid store" Error**
- Store parameter must be `'bannos'` or `'flourlane'` (lowercase)
- Or `null` for all stores

### **Type Errors**
- Make sure to import types from `@/types/db`
- Check parameter names match RPC function signatures

---

## 📝 **Next Steps**

1. ✅ Backend complete (50+ RPCs)
2. ✅ RPC client wrapper created
3. 🔄 **START HERE**: Update UI components to use RPC client
4. ⚠️ Configure authentication
5. ⚠️ Test complete workflows
6. ⚠️ Deploy to staging

**The backend is production-ready! Now let's connect the UI! 🚀**

