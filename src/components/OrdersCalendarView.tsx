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

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
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

// Helper: Get calendar grid for a month
function getMonthGrid(year: number, month: number): CalendarDay[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();
  const todayStr = formatDateLocal(today);

  // Get the Monday before or on the first day of the month
  const startDay = new Date(firstDay);
  const dayOfWeek = firstDay.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDay.setDate(firstDay.getDate() + diff);

  const weeks: CalendarDay[][] = [];
  const current = new Date(startDay);

  for (let week = 0; week < 6; week++) {
    const days: CalendarDay[] = [];
    for (let day = 0; day < 7; day++) {
      const dateStr = formatDateLocal(current);
      const isCurrentMonth = current.getMonth() === month;
      days.push({
        date: new Date(current),
        day: current.getDate(),
        isCurrentMonth,
        isToday: dateStr === todayStr,
        dateStr,
        orders: [],
      });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(days);

    // Stop if we've passed the last day of the month and completed the week
    if (current > lastDay && current.getDay() === 1) break;
  }

  return weeks;
}

export function OrdersCalendarView({ store }: OrdersCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [editOrder, setEditOrder] = useState<QueueItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Fetch orders
  const { data: orders = [], isLoading, isError, error, refetch } = useQueueByStore(store);

  // Build calendar grid with orders
  const calendarGrid = useMemo(() => {
    const grid = getMonthGrid(currentYear, currentMonth);
    const ordersByDate = new Map<string, CalendarOrder[]>();

    // Group orders by due date
    orders.forEach((order: GetQueueRow) => {
      if (!order.due_date) return;

      const dueDate = new Date(order.due_date);
      if (Number.isNaN(dueDate.getTime())) return;

      const dateStr = formatDateLocal(dueDate);
      const normalized = order.delivery_method?.trim().toLowerCase();
      const method = normalized === "pickup" ? "Pickup" : normalized === "delivery" ? "Delivery" : undefined;

      const calendarOrder: CalendarOrder = {
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
      };

      const existing = ordersByDate.get(dateStr) || [];
      existing.push(calendarOrder);
      ordersByDate.set(dateStr, existing);
    });

    // Assign orders to grid days
    grid.forEach((week) => {
      week.forEach((day) => {
        day.orders = ordersByDate.get(day.dateStr) || [];
      });
    });

    return grid;
  }, [orders, currentYear, currentMonth, store]);

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const handleEdit = (order: CalendarOrder) => {
    setEditOrder(order.queueItem);
    setIsEditOpen(true);
  };

  // Store-specific header color
  const headerBg = store === "bannos" ? "bg-blue-50" : "bg-pink-50";
  const headerText = store === "bannos" ? "text-blue-600" : "text-pink-600";

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-64 mb-6" />
        <div className="grid grid-cols-7 gap-px bg-muted">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-32 bg-background" />
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
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{monthName}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigateMonth("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Monthly Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day Headers */}
        <div className={`grid grid-cols-7 ${headerBg}`}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className={`p-2 text-center text-sm font-medium ${headerText} border-b border-r last:border-r-0`}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Weeks */}
        {calendarGrid.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={`min-h-[140px] border-b border-r last:border-r-0 flex flex-col ${
                  !day.isCurrentMonth ? "bg-muted/30" : "bg-background"
                } ${day.isToday ? "ring-2 ring-inset ring-blue-500" : ""}`}
              >
                {/* Day Number */}
                <div className="p-2 flex items-center justify-between">
                  <span
                    className={`text-sm font-medium ${
                      !day.isCurrentMonth ? "text-muted-foreground" : ""
                    } ${day.isToday ? "text-blue-600 font-bold" : ""}`}
                  >
                    {day.day}
                  </span>
                  {day.orders.length > 0 && (
                    <Badge variant="secondary" className="text-xs h-5 px-1.5">
                      {day.orders.length}
                    </Badge>
                  )}
                </div>

                {/* Orders - scrollable, ALL visible */}
                <div className="flex-1 overflow-y-auto px-1 pb-1 space-y-1">
                  {day.orders.map((order) => {
                    const colors = getPillColors(order.method, !!order.cancelledAt);
                    return (
                      <Popover key={order.id}>
                        <PopoverTrigger asChild>
                          <button
                            className={`w-full flex items-center gap-1.5 px-2 py-1.5 ${colors.bg} border ${colors.border} rounded text-left hover:shadow-sm transition-shadow`}
                          >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                            <span className={`text-xs font-medium ${colors.text} truncate`}>
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
