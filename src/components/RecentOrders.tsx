import { useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { OrderDetailDrawer } from "./OrderDetailDrawer";
import { OrderOverflowMenu } from "./OrderOverflowMenu";

interface RecentOrdersProps {
  store: "bannos" | "flourlane";
}

interface QueueItem {
  id: string;
  orderNumber: string;
  customerName: string;
  product: string;
  size: 'S' | 'M' | 'L';
  quantity: number;
  deliveryTime: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'In Production' | 'Pending' | 'Quality Check' | 'Completed' | 'Scheduled';
  flavor: string;
  dueTime: string;
  method?: 'Delivery' | 'Pickup';
  storage?: string;
}

// Convert dashboard order format to QueueItem format
const convertToQueueItem = (order: any): QueueItem => ({
  id: order.id,
  orderNumber: order.id,
  customerName: order.customer,
  product: order.product,
  size: 'M' as const, // Default size
  quantity: order.quantity,
  deliveryTime: order.dueDate,
  priority: order.priority as 'High' | 'Medium' | 'Low',
  status: order.status as any,
  flavor: "Vanilla", // Default flavor
  dueTime: "10:00 AM", // Default time
  method: "Pickup" as const, // Default method
  storage: order.status === "Completed" ? "Store Fridge" : undefined
});

const storeOrders = {
  bannos: [
    {
      id: "BAN-001",
      customer: "Sweet Delights Co.",
      product: "Chocolate Cupcakes",
      quantity: 150,
      status: "In Production",
      priority: "High",
      dueDate: "Sep 3, 2025",
      progress: 45
    },
    {
      id: "BAN-002", 
      customer: "City Bakery",
      product: "Vanilla Cake",
      quantity: 75,
      status: "Pending",
      priority: "Medium",
      dueDate: "Sep 5, 2025",
      progress: 0
    },
    {
      id: "BAN-003",
      customer: "Wedding Bells",
      product: "Custom Wedding Cake",
      quantity: 1,
      status: "Quality Check",
      priority: "High",
      dueDate: "Sep 2, 2025",
      progress: 85
    },
    {
      id: "BAN-004",
      customer: "Local Café",
      product: "Assorted Muffins",
      quantity: 200,
      status: "Completed",
      priority: "Low",
      dueDate: "Sep 1, 2025",
      progress: 100
    },
    {
      id: "BAN-005",
      customer: "Party Palace",
      product: "Birthday Cupcakes",
      quantity: 120,
      status: "Scheduled",
      priority: "Medium",
      dueDate: "Sep 4, 2025",
      progress: 0
    }
  ],
  flourlane: [
    {
      id: "FLR-001",
      customer: "Gourmet Treats Inc.",
      product: "Artisan Bread Loaves",
      quantity: 80,
      status: "In Production",
      priority: "High",
      dueDate: "Sep 3, 2025",
      progress: 65
    },
    {
      id: "FLR-002", 
      customer: "Corner Deli",
      product: "Sourdough Rolls",
      quantity: 200,
      status: "Quality Check",
      priority: "Medium",
      dueDate: "Sep 2, 2025",
      progress: 90
    },
    {
      id: "FLR-003",
      customer: "Farm Fresh Market",
      product: "Whole Wheat Bread",
      quantity: 150,
      status: "Completed",
      priority: "Low",
      dueDate: "Sep 1, 2025",
      progress: 100
    },
    {
      id: "FLR-004",
      customer: "Bistro Central",
      product: "French Baguettes",
      quantity: 60,
      status: "Scheduled",
      priority: "High",
      dueDate: "Sep 4, 2025",
      progress: 0
    },
    {
      id: "FLR-005",
      customer: "Health Food Store",
      product: "Gluten-Free Muffins",
      quantity: 100,
      status: "Pending",
      priority: "Medium",
      dueDate: "Sep 6, 2025",
      progress: 0
    }
  ]
};

const getStatusColor = (status: string) => {
  const colors = {
    "In Production": "bg-blue-100 text-blue-700 border-blue-200",
    "Pending": "bg-gray-100 text-gray-700 border-gray-200",
    "Quality Check": "bg-orange-100 text-orange-700 border-orange-200", 
    "Completed": "bg-green-100 text-green-700 border-green-200",
    "Scheduled": "bg-purple-100 text-purple-700 border-purple-200"
  };
  return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-700";
};

const getPriorityColor = (priority: string) => {
  const colors = {
    "High": "bg-red-100 text-red-700 border-red-200",
    "Medium": "bg-yellow-100 text-yellow-700 border-yellow-200",
    "Low": "bg-green-100 text-green-700 border-green-200"
  };
  return colors[priority as keyof typeof colors] || "bg-gray-100 text-gray-700";
};

export function RecentOrders({ store }: RecentOrdersProps) {
  const orders = storeOrders[store];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<QueueItem | null>(null);

  const handleOpenOrder = (order: any) => {
    const queueItem = convertToQueueItem(order);
    setSelectedOrder(queueItem);
    setDrawerOpen(true);
  };

  const handleViewDetails = (order: any) => {
    // This would link to Shopify order
    window.open(`https://admin.shopify.com/orders/${order.id}`, '_blank');
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-medium text-foreground">
            Recent Orders - {store === "bannos" ? "Bannos" : "Flourlane"}
          </h3>
          <p className="text-sm text-muted-foreground">Latest production orders and their status</p>
        </div>
        <Button variant="outline" size="sm">
          View All
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left font-medium text-muted-foreground pb-3">Order ID</th>
              <th className="text-left font-medium text-muted-foreground pb-3">Customer</th>
              <th className="text-left font-medium text-muted-foreground pb-3">Product</th>
              <th className="text-left font-medium text-muted-foreground pb-3">Quantity</th>
              <th className="text-left font-medium text-muted-foreground pb-3">Status</th>
              <th className="text-left font-medium text-muted-foreground pb-3">Priority</th>
              <th className="text-left font-medium text-muted-foreground pb-3">Due Date</th>
              <th className="text-left font-medium text-muted-foreground pb-3">Progress</th>
              <th className="text-left font-medium text-muted-foreground pb-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <tr key={order.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="py-4 font-medium text-foreground">{order.id}</td>
                <td className="py-4 text-foreground">{order.customer}</td>
                <td className="py-4 text-foreground">{order.product}</td>
                <td className="py-4 text-foreground">{order.quantity}</td>
                <td className="py-4">
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </td>
                <td className="py-4">
                  <Badge className={getPriorityColor(order.priority)}>
                    {order.priority}
                  </Badge>
                </td>
                <td className="py-4 text-foreground">{order.dueDate}</td>
                <td className="py-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${order.progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">{order.progress}%</span>
                  </div>
                </td>
                <td className="py-4">
                  <OrderOverflowMenu
                    item={order}
                    variant="dashboard"
                    onOpenOrder={() => handleOpenOrder(order)}
                    onViewDetails={() => handleViewDetails(order)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        order={selectedOrder}
        store={store}
      />
    </Card>
  );
}