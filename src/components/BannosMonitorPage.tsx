import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Cake,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useState, useMemo } from "react";
import { useQueueForMonitor } from "../hooks/useQueueByStore";
import { useRealtimeOrders } from "../hooks/useRealtimeOrders";
import { formatOrderNumber } from "../lib/format-utils";
import { getStageColorParts } from "../lib/stage-colors";
import type { GetQueueRow } from "../types/rpc-returns";

interface OrderPill {
  id: string;
  humanId: string;
  stage: string;
  dueDate: string;
}

interface WeekDay {
  date: Date;
  dayName: string;
  dateStr: string;
  orders: OrderPill[];
}

// Helper: Format date as YYYY-MM-DD in local timezone (not UTC)
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: Get Monday of current week
const getCurrentWeekStart = (): Date => {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day; // If Sunday (0), go back 6 days; else go to Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

// Helper: Get array of 7 dates starting from given Monday
const getWeekDates = (startMonday: Date): WeekDay[] => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((dayName, index) => {
    const date = new Date(startMonday);
    date.setDate(startMonday.getDate() + index);
    return {
      date,
      dayName,
      dateStr: formatDateLocal(date), // Use local timezone, not UTC
      orders: []
    };
  });
};


export function BannosMonitorPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getCurrentWeekStart());

  // Use React Query hook for queue data
  const {
    data: orders = [],
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useQueueForMonitor('bannos');

  // Subscribe to real-time order updates
  useRealtimeOrders('bannos');

  // Group orders by week day using useMemo for performance
  const weekDays = useMemo(() => {
    // Initialize week structure
    const days = getWeekDates(currentWeekStart);

    // Calculate week's date range for filtering
    const weekStart = currentWeekStart;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStartStr = formatDateLocal(weekStart);
    const weekEndStr = formatDateLocal(weekEnd);

    // Group orders by due date - only include orders within the displayed week
    orders.forEach((order: GetQueueRow) => {
      if (!order.due_date) return;

      // Convert order's due_date to local date string to match week boundaries
      const due = new Date(order.due_date);
      if (Number.isNaN(due.getTime())) {
        console.warn('Invalid due_date for order:', order.id, order.human_id, order.due_date);
        return;
      }
      const orderDateLocal = formatDateLocal(due);

      // Only process orders within the current week's date range
      if (orderDateLocal >= weekStartStr && orderDateLocal <= weekEndStr) {
        const dayIndex = days.findIndex(d => d.dateStr === orderDateLocal);

        if (dayIndex !== -1) {
          days[dayIndex].orders.push({
            id: order.id,
            humanId: order.shopify_order_number
              ? formatOrderNumber(String(order.shopify_order_number), 'bannos', order.id)
              : (order.human_id || order.id),
            stage: order.stage || 'Filling',
            dueDate: order.due_date
          });
        }
      }
    });

    return days;
  }, [orders, currentWeekStart]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newStart);
  };

  const getWeekRange = (): string => {
    const start = currentWeekStart;
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    };
    
    // Show both years when week spans New Year's (e.g., "Dec 29, 2025 - Jan 04, 2026")
    if (start.getFullYear() === end.getFullYear()) {
      return `${formatDate(start)} - ${formatDate(end)}, ${start.getFullYear()}`;
    }
    return `${formatDate(start)}, ${start.getFullYear()} - ${formatDate(end)}, ${end.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <Card className="h-full">
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-64 mb-6"></div>
              <div className="grid grid-cols-7 gap-1">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="h-96 bg-muted rounded-lg"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <Card className="h-full">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-3 rounded-full bg-destructive/15 mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Failed to load queue</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card className="h-full">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100/70 dark:bg-blue-900/40">
                <Cake className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-2xl">Bannos Kitchen Monitor</CardTitle>
                <p className="text-muted-foreground">Weekly Production Schedule</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{getWeekRange()}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="min-w-11 min-h-11" onClick={() => navigateWeek('prev')}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="min-w-11 min-h-11" onClick={() => navigateWeek('next')}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, index) => (
              <div key={index} className="flex flex-col border-r last:border-r-0">
                {/* Day Header */}
                <div className="mb-4 text-center px-1">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100/70 dark:bg-blue-900/40 mb-2">
                    <div>
                      <div className="font-medium text-blue-600 dark:text-blue-400 text-sm">{day.dayName.toUpperCase()}</div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        {day.date.getDate()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {day.orders.length}
                    </Badge>
                  </div>
                </div>

                {/* Orders List */}
                <div className="flex-1 space-y-2 overflow-y-auto max-h-[550px] px-1">
                  {day.orders.map((order) => {
                    const colors = getStageColorParts(order.stage);
                    return (
                      <div
                        key={order.id}
                        className={`flex items-center gap-2.5 px-2.5 py-2.5 ${colors.bg} border ${colors.border} rounded-md hover:shadow-sm transition-all duration-200`}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`}></div>
                        <span className={`text-[15px] font-medium ${colors.text} truncate`}>
                          {order.humanId}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}