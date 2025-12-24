import { useState, useMemo } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { OrderDetailDrawer } from "./OrderDetailDrawer";
import { OrderOverflowMenu } from "./OrderOverflowMenu";
import { useRecentOrders } from "../hooks/useDashboardQueries";
import { formatOrderNumber, formatDate } from "../lib/format-utils";

interface RecentOrdersProps {
  store: "bannos" | "flourlane";
}

interface QueueItem {
  id: string;
  orderNumber: string;
  shopifyOrderNumber: string;
  customerName: string;
  product: string;
  size: string;
  quantity: number;
  deliveryTime: string | null;
  priority: 'High' | 'Medium' | 'Low' | null;
  status: 'In Production' | 'Pending' | 'Quality Check' | 'Completed' | 'Scheduled';
  flavor: string;
  dueTime: string | null;
  method?: 'Delivery' | 'Pickup';
  storage?: string;
}

interface DisplayOrder {
  id: string;
  customer: string;
  product: string;
  quantity: number;
  status: string;
  priority: string | null;
  dueDate: string;
  progress: number;
  shopify_order_id?: number;
  shopify_order_number?: number;
}

// Map internal store name to Shopify store slug
const SHOPIFY_STORE_SLUGS: Record<string, string> = {
  bannos: 'bannos',
  flourlane: 'flour-lane',
};

// Convert stage to progress percentage
const getProgressFromStage = (stage: string | undefined): number => {
  switch (stage) {
    case 'Complete': return 100;
    case 'Packing': return 75;
    case 'Decorating': return 50;
    case 'Covering': return 25;
    default: return 0;
  }
};

// Convert dashboard order format to QueueItem format
const convertToQueueItem = (order: DisplayOrder): QueueItem => ({
  id: order.id,
  orderNumber: order.id,
  shopifyOrderNumber: order.shopify_order_number ? String(order.shopify_order_number) : '',
  customerName: order.customer,
  product: order.product,
  size: '', // Not available from dashboard data
  quantity: order.quantity,
  deliveryTime: order.dueDate === 'N/A' ? null : order.dueDate,
  priority: order.priority as 'High' | 'Medium' | 'Low' | null,
  status: order.status as any,
  flavor: '', // Not available from dashboard data
  dueTime: order.dueDate === 'N/A' ? null : order.dueDate,
  method: undefined, // Not available from dashboard data
  storage: undefined
});

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

const getPriorityColor = (priority: string | null) => {
  if (!priority) return "bg-gray-100 text-gray-700 border-gray-200";
  const colors = {
    "High": "bg-red-100 text-red-700 border-red-200",
    "Medium": "bg-yellow-100 text-yellow-700 border-yellow-200",
    "Low": "bg-green-100 text-green-700 border-green-200"
  };
  return colors[priority as keyof typeof colors] || "bg-gray-100 text-gray-700";
};

export function RecentOrders({ store }: RecentOrdersProps) {
  const { data, isLoading } = useRecentOrders(store);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<QueueItem | null>(null);

  // Transform raw data to display format
  const orders = useMemo<DisplayOrder[]>(() => {
    if (!data) return [];
    
    return data.map((order: any): DisplayOrder => ({
      id: order.id,
      customer: order.customer_name || '',
      product: order.product_title || '',
      quantity: order.item_qty || 1,
      status: order.stage === 'Complete' ? 'Completed' : order.stage || 'Pending',
      priority: order.priority || null,
      dueDate: order.due_date || 'N/A',
      progress: getProgressFromStage(order.stage),
      shopify_order_id: order.shopify_order_id,
      shopify_order_number: order.shopify_order_number
    }));
  }, [data]);

  const handleOpenOrder = (order: DisplayOrder) => {
    const queueItem = convertToQueueItem(order);
    setSelectedOrder(queueItem);
    setDrawerOpen(true);
  };

  const handleViewDetails = (order: DisplayOrder) => {
    // Open Shopify admin for this order
    if (order.shopify_order_id) {
      const storeSlug = SHOPIFY_STORE_SLUGS[store];
      if (storeSlug) {
        window.open(`https://admin.shopify.com/store/${storeSlug}/orders/${order.shopify_order_id}`, '_blank');
      }
    }
  };

  // Only show skeleton on initial load, not on refetch
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-4 bg-muted rounded w-48 mb-2"></div>
              <div className="h-3 bg-muted rounded w-64"></div>
            </div>
            <div className="h-8 bg-muted rounded w-20"></div>
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

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
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="py-4 font-medium text-foreground">
                  {order.shopify_order_number
                    ? formatOrderNumber(String(order.shopify_order_number), store)
                    : order.id}
                </td>
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
                    {order.priority || '-'}
                  </Badge>
                </td>
                <td className="py-4 text-foreground">{order.dueDate === 'N/A' ? 'N/A' : formatDate(order.dueDate)}</td>
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