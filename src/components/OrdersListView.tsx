import { useState, useMemo } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { MoreHorizontal, Clock, Search, X } from "lucide-react";
import { toast } from "sonner";
import { EditOrderDrawer } from "./EditOrderDrawer";
import { OrderDetailDrawer } from "./OrderDetailDrawer";
import { ErrorDisplay } from "./ErrorDisplay";
import { useQueueByStore } from "../hooks/useQueueByStore";
import { useCancelOrder, useMarkOrderComplete } from "../hooks/useQueueMutations";
import { formatDate, formatOrderNumber } from "../lib/format-utils";
import type { QueueItem } from "../types/queue";
import type { GetQueueRow } from "../types/rpc-returns";

interface OrdersListViewProps {
  store: "bannos" | "flourlane";
}

type OrderStatus = "in_production" | "completed" | "cancelled";

function getOrderStatus(stage: string, cancelledAt: string | null): OrderStatus {
  // Check cancelledAt FIRST - cancelled orders may not have stage=Complete
  if (cancelledAt) return "cancelled";
  if (stage === "Complete") return "completed";
  return "in_production";
}

function getStageBadge(stage: string, cancelledAt: string | null) {
  if (cancelledAt) {
    return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
  }
  const stageColors: Record<string, string> = {
    "Filling": "bg-blue-50 text-blue-700 border-blue-200",
    "Covering": "bg-purple-50 text-purple-700 border-purple-200",
    "Decorating": "bg-pink-50 text-pink-700 border-pink-200",
    "Packing": "bg-orange-50 text-orange-700 border-orange-200",
    "Complete": "bg-green-50 text-green-700 border-green-200",
  };
  const colorClass = stageColors[stage] || "bg-gray-50 text-gray-700 border-gray-200";
  return <Badge variant="outline" className={colorClass}>{stage}</Badge>;
}

function getDeliveryMethodBadge(method: string | undefined) {
  if (method === "Pickup") {
    return <Badge variant="outline" className="border-transparent bg-blue-100 text-blue-800">Pickup</Badge>;
  }
  if (method === "Delivery") {
    return <Badge variant="outline" className="border-transparent bg-amber-100 text-amber-800">Delivery</Badge>;
  }
  return null; // Hide unknown delivery method
}

export function OrdersListView({ store }: OrdersListViewProps) {
  const [selectedOrder, setSelectedOrder] = useState<QueueItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<QueueItem | null>(null);
  const [orderToComplete, setOrderToComplete] = useState<QueueItem | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const {
    data: orders = [],
    isLoading,
    error,
    dataUpdatedAt,
    refetch,
  } = useQueueByStore(store);

  const cancelMutation = useCancelOrder();
  const completeMutation = useMarkOrderComplete();

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  // Transform orders to include status
  const orderItems = useMemo(() => {
    return orders.map((order: GetQueueRow) => {
      const item: QueueItem & { orderStatus: OrderStatus; cancelledAt: string | null } = {
        id: order.id,
        orderNumber: String(order.human_id || order.shopify_order_number || order.id),
        shopifyOrderNumber: String(order.shopify_order_number || ""),
        shopifyOrderId: order.shopify_order_id || undefined,
        customerName: order.customer_name || "",
        product: order.product_title || "",
        size: order.size || "",
        quantity: order.item_qty || 1,
        dueDate: order.due_date || null,
        priority: order.priority || null,
        status: order.assignee_id ? "In Production" : "Pending",
        flavour: order.flavour || "",
        method: (() => {
          const normalized = order.delivery_method?.trim().toLowerCase();
          if (normalized === "delivery") return "Delivery" as const;
          if (normalized === "pickup") return "Pickup" as const;
          return undefined;
        })(),
        storage: order.storage || "",
        store: store,
        stage: order.stage || "Filling",
        orderStatus: getOrderStatus(order.stage || "Filling", order.cancelled_at),
        cancelledAt: order.cancelled_at,
      };
      return item;
    });
  }, [orders, store]);

  // Apply filters
  const filteredItems = useMemo(() => {
    return orderItems.filter((item) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          item.orderNumber.toLowerCase().includes(query) ||
          item.shopifyOrderNumber?.toLowerCase().includes(query) ||
          item.customerName.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "all" && item.orderStatus !== statusFilter) {
        return false;
      }

      // Date range filter - normalize to UTC to avoid timezone inconsistencies
      if (dateFrom || dateTo) {
        // Exclude orders without dueDate when date filter is set
        if (!item.dueDate) return false;

        // Normalize dueDate to UTC date string for consistent comparison
        const dueDateStr = new Date(item.dueDate).toISOString().slice(0, 10);
        if (dateFrom && dueDateStr < dateFrom) return false;
        if (dateTo && dueDateStr > dateTo) return false;
      }

      return true;
    });
  }, [orderItems, searchQuery, statusFilter, dateFrom, dateTo]);

  const hasActiveFilters = searchQuery || statusFilter !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const handleViewInShopify = (item: QueueItem) => {
    const storeSlug = store === "bannos" ? "bannos" : "flour-lane";
    if (item.shopifyOrderId) {
      window.open(`https://admin.shopify.com/store/${storeSlug}/orders/${item.shopifyOrderId}`, "_blank");
      return;
    }
    const orderNumber = item.shopifyOrderNumber?.trim();
    if (orderNumber) {
      window.open(`https://admin.shopify.com/store/${storeSlug}/orders?query=${encodeURIComponent(orderNumber)}`, "_blank");
      return;
    }
    toast.error("No Shopify order information available");
  };

  const handleCancelOrder = (item: QueueItem) => {
    // Open confirmation dialog
    setOrderToCancel(item);
  };

  const confirmCancelOrder = () => {
    if (!orderToCancel) return;

    cancelMutation.mutate(
      { orderId: orderToCancel.id, store },
      {
        onSuccess: () => {
          toast.success(`Order ${formatOrderNumber(orderToCancel.shopifyOrderNumber || orderToCancel.orderNumber, store, orderToCancel.id)} cancelled`);
          setOrderToCancel(null);
        },
        onError: (error) => {
          toast.error(`Failed to cancel order: ${error.message}`);
        },
      }
    );
  };

  const handleMarkComplete = (item: QueueItem) => {
    // Open confirmation dialog
    setOrderToComplete(item);
  };

  const confirmMarkComplete = () => {
    if (!orderToComplete) return;

    completeMutation.mutate(
      { orderId: orderToComplete.id, store },
      {
        onSuccess: () => {
          toast.success(`Order ${formatOrderNumber(orderToComplete.shopifyOrderNumber || orderToComplete.orderNumber, store, orderToComplete.id)} marked complete`);
          setOrderToComplete(null);
        },
        onError: (error) => {
          toast.error(`Failed to mark complete: ${error.message}`);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        title="Failed to Load Orders"
        onRetry={() => refetch()}
        variant="card"
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        {/* Filters */}
        <div className="p-4 border-b space-y-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="in_production">In Production</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Date range */}
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full sm:w-[140px]"
                aria-label="Filter from date"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full sm:w-[140px]"
                aria-label="Filter to date"
              />
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="h-10">
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {filteredItems.length} of {orderItems.length} order{orderItems.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {lastUpdated ? `Updated: ${lastUpdated.toLocaleTimeString()}` : "Loading..."}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium text-sm">Order #</th>
                <th className="text-left p-4 font-medium text-sm">Order Type</th>
                <th className="text-left p-4 font-medium text-sm">Customer</th>
                <th className="text-left p-4 font-medium text-sm">Due Date</th>
                <th className="text-left p-4 font-medium text-sm">Status</th>
                <th className="text-right p-4 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <div className="space-y-2">
                      <p>{hasActiveFilters ? "No orders match your filters" : "No orders found"}</p>
                      {hasActiveFilters && (
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-4">
                      {formatOrderNumber(item.shopifyOrderNumber || item.orderNumber, store, item.id)}
                    </td>
                    <td className="p-4">{getDeliveryMethodBadge(item.method)}</td>
                    <td className="p-4">{item.customerName}</td>
                    <td className="p-4">{formatDate(item.dueDate)}</td>
                    <td className="p-4">{getStageBadge(item.stage, item.cancelledAt)}</td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-12 w-12 p-0"
                            aria-label="Order actions"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="min-h-[44px]"
                            onClick={() => {
                              setSelectedOrder(item);
                              setIsDetailOpen(true);
                            }}
                          >
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="min-h-[44px]"
                            onClick={() => handleViewInShopify(item)}
                          >
                            View in Shopify
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="min-h-[44px]"
                            onClick={() => {
                              setSelectedOrder(item);
                              setIsEditOpen(true);
                            }}
                          >
                            Edit Order
                          </DropdownMenuItem>
                          {item.orderStatus === "in_production" && (
                            <>
                              <DropdownMenuItem
                                className="min-h-[44px]"
                                onClick={() => handleMarkComplete(item)}
                              >
                                Mark Complete
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="min-h-[44px] text-destructive"
                                onClick={() => handleCancelOrder(item)}
                              >
                                Cancel Order
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedOrder(null);
        }}
        store={store}
      />

      {/* Edit Order Drawer */}
      <EditOrderDrawer
        order={selectedOrder}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedOrder(null);
        }}
        onSaved={() => {
          setIsEditOpen(false);
          setSelectedOrder(null);
        }}
        store={store}
      />

      {/* Cancel Order Confirmation Dialog */}
      <AlertDialog open={!!orderToCancel} onOpenChange={(open) => !open && setOrderToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel order {orderToCancel && formatOrderNumber(orderToCancel.shopifyOrderNumber || orderToCancel.orderNumber, store, orderToCancel.id)}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              Keep Order
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelOrder}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark Complete Confirmation Dialog */}
      <AlertDialog open={!!orderToComplete} onOpenChange={(open) => !open && setOrderToComplete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Order Complete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark order {orderToComplete && formatOrderNumber(orderToComplete.shopifyOrderNumber || orderToComplete.orderNumber, store, orderToComplete.id)} as complete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={completeMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMarkComplete}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? "Completing..." : "Mark Complete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
