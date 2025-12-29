import { useState, useMemo } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EditOrderDrawer } from "./EditOrderDrawer";
import { ErrorDisplay } from "./ErrorDisplay";
import { useQueueByStore } from "../hooks/useQueueByStore";
import { formatOrderNumber } from "../lib/format-utils";
import type { QueueItem } from "../types/queue";
import type { GetQueueRow } from "../types/rpc-returns";

interface OrdersCalendarViewProps {
  store: "bannos" | "flourlane";
}

type OrderStatus = "in_production" | "completed" | "cancelled";

interface CalendarOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  method: "Pickup" | "Delivery" | undefined;
  status: OrderStatus;
  cancelledAt: string | null;
  queueItem: QueueItem;
}

interface WeekDay {
  date: Date;
  dayName: string;
  dateStr: string;
  orders: CalendarOrder[];
}

// Helper: Format date as YYYY-MM-DD in local timezone
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper: Get Monday of a given week
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper: Get array of 7 dates starting from given Monday
const getWeekDates = (startMonday: Date): WeekDay[] => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((dayName, index) => {
    const date = new Date(startMonday);
    date.setDate(startMonday.getDate() + index);
    return {
      date,
      dayName,
      dateStr: formatDateLocal(date),
      orders: [],
    };
  });
};

// Helper: Get order status from stage and cancelledAt
function getOrderStatus(stage: string, cancelledAt: string | null): OrderStatus {
  if (cancelledAt) return "cancelled";
  if (stage === "Complete") return "completed";
  return "in_production";
}

// Helper: Get pill colors based on delivery method and cancelled status
function getPillColors(method: string | undefined, cancelled: boolean) {
  if (cancelled) {
    return { bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500", text: "text-red-700" };
  }
  if (method === "Pickup") {
    return { bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500", text: "text-blue-700" };
  }
  // Delivery or unknown
  return { bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500", text: "text-amber-700" };
}

// Helper: Get status badge
function getStatusBadge(status: OrderStatus) {
  switch (status) {
    case "in_production":
      return <Badge variant="outline" className="border-transparent bg-yellow-100 text-yellow-800">In Production</Badge>;
    case "completed":
      return <Badge variant="outline" className="border-transparent bg-green-100 text-green-800">Completed</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="border-transparent bg-red-100 text-red-800">Cancelled</Badge>;
  }
}

export function OrdersCalendarView({ store }: OrdersCalendarViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [editOrder, setEditOrder] = useState<QueueItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Fetch orders
  const { data: orders = [], isLoading, isError, error, refetch } = useQueueByStore(store);

  // Group orders by week day
  const weekDays = useMemo(() => {
    const days = getWeekDates(currentWeekStart);

    // Calculate week's date range
    const weekStart = currentWeekStart;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStartStr = formatDateLocal(weekStart);
    const weekEndStr = formatDateLocal(weekEnd);

    // Group orders by due date
    orders.forEach((order: GetQueueRow) => {
      if (!order.due_date) return;

      const dueDate = new Date(order.due_date);
      if (Number.isNaN(dueDate.getTime())) return;

      const orderDateLocal = formatDateLocal(dueDate);

      // Only process orders within the current week
      if (orderDateLocal >= weekStartStr && orderDateLocal <= weekEndStr) {
        const dayIndex = days.findIndex((d) => d.dateStr === orderDateLocal);

        if (dayIndex !== -1) {
          const normalized = order.delivery_method?.trim().toLowerCase();
          const method = normalized === "pickup" ? "Pickup" : normalized === "delivery" ? "Delivery" : undefined;

          days[dayIndex].orders.push({
            id: order.id,
            orderNumber: formatOrderNumber(String(order.shopify_order_number || order.human_id || order.id), store),
            customerName: order.customer_name || "",
            method,
            status: getOrderStatus(order.stage || "Filling", order.cancelled_at),
            cancelledAt: order.cancelled_at,
            queueItem: {
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
              method,
              storage: order.storage || "",
              store,
              stage: order.stage || "Filling",
            },
          });
        }
      }
    });

    return days;
  }, [orders, currentWeekStart, store]);

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeekStart((prev) => {
      const newStart = new Date(prev);
      newStart.setDate(prev.getDate() + (direction === "next" ? 7 : -7));
      return newStart;
    });
  };

  const goToToday = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  const getWeekRange = (): string => {
    const start = currentWeekStart;
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
    };

    if (start.getFullYear() === end.getFullYear()) {
      return `${formatDate(start)} - ${formatDate(end)}, ${start.getFullYear()}`;
    }
    return `${formatDate(start)}, ${start.getFullYear()} - ${formatDate(end)}, ${end.getFullYear()}`;
  };

  const handleEdit = (order: CalendarOrder) => {
    setEditOrder(order.queueItem);
    setIsEditOpen(true);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-64 mb-6" />
        <div className="grid grid-cols-7 gap-1">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-96 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return <ErrorDisplay error={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-4">
      {/* Navigation - matches Monitor pattern */}
      <div className="flex items-center justify-between">
        <span className="font-medium text-lg">{getWeekRange()}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigateWeek("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigateWeek("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week Grid - matches Monitor pattern */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, index) => (
          <div key={index} className="flex flex-col border-r last:border-r-0">
            {/* Day Header - circular like Monitor */}
            <div className="mb-4 text-center px-1">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-2">
                <div>
                  <div className="font-medium text-blue-600 text-sm">{day.dayName.toUpperCase()}</div>
                  <div className="text-xs text-blue-600">{day.date.getDate()}</div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <Badge variant="secondary" className="text-xs">
                  {day.orders.length}
                </Badge>
              </div>
            </div>

            {/* Orders List - scrollable, ALL visible */}
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[550px] px-1">
              {day.orders.map((order) => {
                const colors = getPillColors(order.method, !!order.cancelledAt);
                return (
                  <Popover key={order.id}>
                    <PopoverTrigger asChild>
                      <button
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 ${colors.bg} border ${colors.border} rounded-md hover:shadow-sm transition-all duration-200 text-left`}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                        <span className={`text-[15px] font-medium ${colors.text} truncate`}>
                          {order.orderNumber}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start">
                      <div className="space-y-2">
                        <div className="font-semibold">{order.orderNumber}</div>
                        <div className="text-sm text-muted-foreground">{order.customerName}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {order.method && (
                            <Badge
                              variant="outline"
                              className={`border-transparent ${
                                order.method === "Pickup"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {order.method}
                            </Badge>
                          )}
                          {getStatusBadge(order.status)}
                        </div>
                        <Button size="sm" className="w-full mt-2" onClick={() => handleEdit(order)}>
                          Edit Order
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Drawer */}
      <EditOrderDrawer
        order={editOrder}
        store={store}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSaved={() => setIsEditOpen(false)}
      />
    </div>
  );
}
