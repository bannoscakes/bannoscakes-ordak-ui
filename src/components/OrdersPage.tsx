import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import {
  Calendar as CalendarIcon,
  LayoutGrid,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Cake,
  Store,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { useQueueByStore } from "../hooks/useQueueByStore";
import { formatDate, formatOrderNumber } from "../lib/format-utils";
import { useCancelOrder, useMarkOrderComplete } from "../hooks/useQueueMutations";
import { EditOrderDrawer } from "./EditOrderDrawer";
import { ErrorDisplay } from "./ErrorDisplay";
import type { Store as StoreType } from "../types/db";
import type { QueueItem } from "../types/queue";
import type { GetQueueRow } from "../types/rpc-returns";

// Extended order type with cancelledAt for internal use
type OrderWithStatus = QueueItem & {
  orderStatus: "in_production" | "completed" | "cancelled";
  cancelledAt: string | null;
};

const getOrderStatus = (stage: string, cancelledAt: string | null): "in_production" | "completed" | "cancelled" => {
  if (cancelledAt) return "cancelled";
  if (stage === "Complete") return "completed";
  return "in_production";
};

const getStatusDisplay = (status: "in_production" | "completed" | "cancelled"): string => {
  switch (status) {
    case "in_production": return "In Production";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
  }
};

const getStatusColor = (status: "in_production" | "completed" | "cancelled") => {
  const colors = {
    in_production: "bg-yellow-50 text-yellow-700 border-yellow-200",
    completed: "bg-green-50 text-green-700 border-green-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
  };
  return colors[status];
};

const getOrderTypeColor = (type: string | undefined) => {
  if (type === "Delivery") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-cyan-50 text-cyan-700 border-cyan-200";
};

const getCalendarPillColor = (deliveryMethod: string | undefined, isCancelled: boolean) => {
  if (isCancelled) {
    return "bg-red-100 text-red-800 border-red-200";
  }
  if (deliveryMethod === "Delivery") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-cyan-50 text-cyan-700 border-cyan-200";
};

export function OrdersPage() {
  const [activeStore, setActiveStore] = useState<StoreType>("bannos");
  const [view, setView] = useState<"cards" | "calendar">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Real data
  const { data: orders = [], isLoading, isError, error, refetch } = useQueueByStore(activeStore);

  // Mutations
  const cancelOrder = useCancelOrder();
  const markComplete = useMarkOrderComplete();

  // Dialogs
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithStatus | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  // Transform orders to include status
  const orderItems = useMemo(() => {
    return orders.map((order: GetQueueRow): OrderWithStatus => {
      const orderStatus = getOrderStatus(order.stage || "Filling", order.cancelled_at);
      return {
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
        store: activeStore,
        stage: order.stage || "Filling",
        orderStatus,
        cancelledAt: order.cancelled_at,
      };
    });
  }, [orders, activeStore]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orderItems.filter((order) =>
      order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [orderItems, searchQuery]);

  // Action handlers
  const handleEdit = (order: OrderWithStatus) => {
    setSelectedOrder(order);
    setEditDrawerOpen(true);
  };

  const handleCancelClick = (order: OrderWithStatus) => {
    setSelectedOrder(order);
    setCancelDialogOpen(true);
  };

  const handleCompleteClick = (order: OrderWithStatus) => {
    setSelectedOrder(order);
    setCompleteDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedOrder) return;
    await cancelOrder.mutateAsync({ orderId: selectedOrder.id, store: activeStore });
    setCancelDialogOpen(false);
    setSelectedOrder(null);
  };

  const handleConfirmComplete = async () => {
    if (!selectedOrder) return;
    await markComplete.mutateAsync({ orderId: selectedOrder.id, store: activeStore });
    setCompleteDialogOpen(false);
    setSelectedOrder(null);
  };

  const handleViewInShopify = (order: OrderWithStatus) => {
    if (order.shopifyOrderId) {
      const storeSlug = activeStore === "bannos" ? "bannos" : "flour-lane";
      window.open(
        `https://admin.shopify.com/store/${storeSlug}/orders/${order.shopifyOrderId}`,
        "_blank"
      );
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startingDayOfWeek = firstDay.getDay();

    // Adjust to make Monday the first day (0 = Monday, 6 = Sunday)
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    const days: (Date | null)[] = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add all days in month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getOrdersForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split("T")[0];
    return filteredOrders.filter((order) => {
      if (!order.dueDate) return false;
      const orderDateStr = new Date(order.dueDate).toISOString().split("T")[0];
      return orderDateStr === dateStr;
    });
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
      return newDate;
    });
  };

  const getStoreConfig = () => {
    if (activeStore === "bannos") {
      return {
        icon: <Cake className="h-8 w-8 text-blue-600" />,
        bgColor: "bg-blue-100",
        name: "Bannos Store",
        subtitle: "Order Management",
      };
    }
    return {
      icon: <Store className="h-8 w-8 text-pink-600" />,
      bgColor: "bg-pink-100",
      name: "Flourlane Store",
      subtitle: "Order Management",
    };
  };

  const storeConfig = getStoreConfig();

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 bg-background">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full max-w-md mb-6" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="p-6 bg-background">
        <ErrorDisplay error={error} title="Failed to load orders" onRetry={() => refetch()} variant="card" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-background">
      <Card>
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            {/* Store Header */}
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${storeConfig.bgColor}`}>
                {storeConfig.icon}
              </div>
              <div>
                <h1 className="text-2xl font-medium text-foreground">
                  {storeConfig.name}
                </h1>
                <p className="text-muted-foreground">
                  {storeConfig.subtitle}
                </p>
              </div>
            </div>

            {/* View Toggle and Store Switcher */}
            <div className="flex items-center gap-4">
              {/* Store Switcher */}
              <div className="flex items-center gap-2 p-1 rounded-lg bg-muted">
                <Button
                  variant={activeStore === "bannos" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveStore("bannos")}
                >
                  Bannos
                </Button>
                <Button
                  variant={activeStore === "flourlane" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveStore("flourlane")}
                >
                  Flourlane
                </Button>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2 p-1 rounded-lg bg-muted">
                <Button
                  variant={view === "cards" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView("cards")}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Cards
                </Button>
                <Button
                  variant={view === "calendar" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView("calendar")}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Calendar
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline">
              {filteredOrders.length} of {orderItems.length} orders
            </Badge>
          </div>

          {/* Cards View */}
          {view === "cards" && (
            <div className="rounded-lg overflow-hidden border border-border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Order #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Order Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center">
                          <p className="text-muted-foreground">
                            {searchQuery ? "No orders match your search" : "No orders found"}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => {
                        const status = order.orderStatus;
                        return (
                          <tr key={order.id} className="hover:bg-muted/50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                              {formatOrderNumber(order.shopifyOrderNumber || order.orderNumber, activeStore)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {order.method && (
                                <Badge
                                  variant="outline"
                                  className={`text-xs border ${getOrderTypeColor(order.method)}`}
                                >
                                  {order.method}
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                              {order.customerName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {order.dueDate ? formatDate(order.dueDate) : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className={`text-xs border ${getStatusColor(status)}`}
                              >
                                {getStatusDisplay(status)}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-12 w-12">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(order)}>
                                    Edit Order
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleViewInShopify(order)}>
                                    View in Shopify
                                  </DropdownMenuItem>
                                  {status !== "completed" && status !== "cancelled" && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleCompleteClick(order)}>
                                        Mark Complete
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleCancelClick(order)}
                                        className="text-red-600"
                                      >
                                        Cancel Order
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Calendar View */}
          {view === "calendar" && (
            <div className="space-y-4">
              {/* Calendar Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth("prev")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
                    Today
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth("next")}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold py-2 text-muted-foreground">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {getDaysInMonth(currentMonth).map((date, index) => {
                  const ordersForDay = getOrdersForDate(date);
                  const isToday = date && date.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={index}
                      className={`min-h-[120px] p-2 rounded-lg border ${
                        !date
                          ? "bg-transparent border-transparent"
                          : isToday
                            ? "bg-blue-50 border-blue-200"
                            : "bg-card border-border hover:border-muted-foreground/20"
                      }`}
                    >
                      {date && (
                        <>
                          <div
                            className={`text-sm font-semibold mb-1 ${
                              isToday ? "text-blue-600" : "text-foreground"
                            }`}
                          >
                            {date.getDate()}
                          </div>
                          <div className="space-y-1">
                            {ordersForDay.slice(0, 3).map((order) => {
                              const pillColor = getCalendarPillColor(order.method, !!order.cancelledAt);
                              return (
                                <div
                                  key={order.id}
                                  onClick={() => handleEdit(order)}
                                  className={`text-xs px-2 py-1 rounded border cursor-pointer ${pillColor} hover:opacity-80`}
                                  title={`${order.orderNumber} - ${order.customerName}`}
                                >
                                  <div className="font-medium truncate">
                                    {formatOrderNumber(order.shopifyOrderNumber || order.orderNumber, activeStore)}
                                  </div>
                                </div>
                              );
                            })}
                            {ordersForDay.length > 3 && (
                              <div className="text-xs px-2 py-1 text-center text-muted-foreground">
                                +{ordersForDay.length - 3} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend - Pickup/Delivery/Cancelled only */}
              <div className="p-4 rounded-lg border bg-card border-border">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border bg-cyan-50 border-cyan-200" />
                    <span className="text-sm text-foreground">Pickup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border bg-amber-50 border-amber-200" />
                    <span className="text-sm text-foreground">Delivery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border bg-red-100 border-red-200" />
                    <span className="text-sm text-foreground">Cancelled</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Order Drawer */}
      <EditOrderDrawer
        order={selectedOrder}
        store={activeStore}
        isOpen={editDrawerOpen}
        onClose={() => {
          setEditDrawerOpen(false);
          setSelectedOrder(null);
        }}
        onSaved={() => {
          setEditDrawerOpen(false);
          setSelectedOrder(null);
        }}
      />

      {/* Cancel Order Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel order{" "}
              {selectedOrder &&
                formatOrderNumber(selectedOrder.shopifyOrderNumber || selectedOrder.orderNumber, activeStore)}
              ? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep order</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelOrder.isPending}
            >
              {cancelOrder.isPending ? "Cancelling..." : "Yes, cancel order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark Complete Confirmation Dialog */}
      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Complete</AlertDialogTitle>
            <AlertDialogDescription>
              Mark order{" "}
              {selectedOrder &&
                formatOrderNumber(selectedOrder.shopifyOrderNumber || selectedOrder.orderNumber, activeStore)}{" "}
              as complete?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmComplete} disabled={markComplete.isPending}>
              {markComplete.isPending ? "Completing..." : "Mark Complete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
