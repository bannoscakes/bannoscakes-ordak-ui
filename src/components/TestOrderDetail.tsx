import { useState } from "react";
import { Button } from "./ui/button";
import { OrderDetailDrawer } from "./OrderDetailDrawer";

// Test orders to verify size transformation
const testOrders = [
  {
    id: "TEST-1",
    orderNumber: "TEST-001",
    shopifyOrderNumber: "1001",
    customerName: "Test Customer 1",
    product: "Chocolate Cupcakes",
    size: "M" as 'S' | 'M' | 'L',
    quantity: 12,
    deliveryTime: "10:00",
    priority: "High" as 'High' | 'Medium' | 'Low',
    status: "Pending" as 'In Production' | 'Pending' | 'Quality Check' | 'Completed' | 'Scheduled',
    flavor: "Chocolate",
    dueTime: "10:30 AM",
    method: "Pickup" as 'Delivery' | 'Pickup'
  },
  {
    id: "TEST-2",
    orderNumber: "TEST-002",
    shopifyOrderNumber: "1002",
    customerName: "Test Customer 2",
    product: "Custom Wedding Cake",
    size: "L" as 'S' | 'M' | 'L',
    quantity: 1,
    deliveryTime: "09:00",
    priority: "High" as 'High' | 'Medium' | 'Low',
    status: "Pending" as 'In Production' | 'Pending' | 'Quality Check' | 'Completed' | 'Scheduled',
    flavor: "Vanilla",
    dueTime: "11:00 AM",
    method: "Delivery" as 'Delivery' | 'Pickup'
  },
  {
    id: "TEST-3",
    orderNumber: "TEST-003",
    shopifyOrderNumber: "1003",
    customerName: "Test Customer 3",
    product: "Birthday Cake",
    size: "M" as 'S' | 'M' | 'L',
    quantity: 1,
    deliveryTime: "14:00",
    priority: "Medium" as 'High' | 'Medium' | 'Low',
    status: "Pending" as 'In Production' | 'Pending' | 'Quality Check' | 'Completed' | 'Scheduled',
    flavor: "Strawberry",
    dueTime: "3:00 PM",
    method: "Pickup" as 'Delivery' | 'Pickup'
  }
];

export function TestOrderDetail() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<typeof testOrders[0] | null>(null);
  const [store, setStore] = useState<"bannos" | "flourlane">("bannos");

  const openOrder = (order: typeof testOrders[0], selectedStore: "bannos" | "flourlane") => {
    setSelectedOrder(order);
    setStore(selectedStore);
    setIsOpen(true);
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-medium">Test Order Detail Size Display</h2>
      
      <div className="space-y-2">
        <h3 className="font-medium">Bannos Store Tests:</h3>
        
        <Button 
          onClick={() => openOrder(testOrders[0], "bannos")}
          variant="outline"
          className="block"
        >
          Test 1: Chocolate Cupcakes (M) → Should show "Standard"
        </Button>
        
        <Button 
          onClick={() => openOrder(testOrders[1], "bannos")}
          variant="outline"
          className="block"
        >
          Test 2: Custom Wedding Cake (L) → Should show "10-inch Round"
        </Button>
        
        <Button 
          onClick={() => openOrder(testOrders[2], "bannos")}
          variant="outline"
          className="block"
        >
          Test 3: Birthday Cake (M) → Should show "Medium Tall"
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">Flourlane Store Tests:</h3>
        
        <Button 
          onClick={() => openOrder({
            ...testOrders[0],
            product: "Fresh Dinner Rolls"
          }, "flourlane")}
          variant="outline"
          className="block"
        >
          Test 4: Fresh Dinner Rolls (M) → Should show "Standard"
        </Button>
      </div>

      <OrderDetailDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        order={selectedOrder}
        store={store}
      />
    </div>
  );
}