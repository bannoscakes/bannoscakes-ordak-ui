import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon
} from "lucide-react";
import { TallCakeIcon } from "./TallCakeIcon";
import { Stage } from "@/types/stage";
import { useEffect, useState } from "react";
import { getQueue } from "../lib/rpc-client";

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
      dateStr: date.toISOString().split('T')[0],
      orders: []
    };
  });
};

// Helper: Get stage color classes for pills
const getStageColorClasses = (stage: string) => {
  const colorMap: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    'Filling': {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      dot: 'bg-blue-500'
    },
    'Covering': {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      dot: 'bg-purple-500'
    },
    'Decorating': {
      bg: 'bg-pink-50',
      border: 'border-pink-200',
      text: 'text-pink-700',
      dot: 'bg-pink-500'
    },
    'Packing': {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      dot: 'bg-orange-500'
    },
    'Complete': {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      dot: 'bg-green-500'
    }
  };
  return colorMap[stage] || {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    dot: 'bg-gray-500'
  };
};

export function FlourlaneMonitorPage() {
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getCurrentWeekStart());

  useEffect(() => {
    fetchWeeklyOrders();
  }, [currentWeekStart]);

  const fetchWeeklyOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch all orders for the store
      const orders = await getQueue({
        store: 'flourlane',
        limit: 500,
        sort_by: 'due_date',
        sort_order: 'ASC'
      });

      // Initialize week structure
      const days = getWeekDates(currentWeekStart);
      
      // Group orders by due date
      orders.forEach((order: any) => {
        if (!order.due_date) return;
        
        const orderDate = order.due_date.split('T')[0]; // Get YYYY-MM-DD
        const dayIndex = days.findIndex(d => d.dateStr === orderDate);
        
        if (dayIndex !== -1) {
          days[dayIndex].orders.push({
            id: order.id,
            humanId: order.human_id || `#F${order.id}`,
            stage: order.stage || 'Filling',
            dueDate: order.due_date
          });
        }
      });

      setWeekDays(days);
    } catch (error) {
      console.error('Failed to fetch weekly orders:', error);
      setWeekDays(getWeekDates(currentWeekStart));
    } finally {
      setLoading(false);
    }
  };

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
    
    return `${formatDate(start)} - ${formatDate(end)}, ${start.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <Card className="h-full">
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-64 mb-6"></div>
              <div className="grid grid-cols-7 gap-4">
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

  return (
    <div className="p-6">
      <Card className="h-full">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-pink-100">
                <TallCakeIcon className="h-8 w-8 text-pink-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">Flourlane Kitchen Monitor</CardTitle>
                <p className="text-muted-foreground">Weekly Production Schedule</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{getWeekRange()}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => navigateWeek('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigateWeek('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-4">
            {weekDays.map((day, index) => (
              <div key={index} className="flex flex-col border-r last:border-r-0 pr-4 last:pr-0">
                {/* Day Header */}
                <div className="mb-4 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-100 mb-2">
                    <div>
                      <div className="font-medium text-pink-600 text-sm">{day.dayName.toUpperCase()}</div>
                      <div className="text-xs text-pink-600">
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
                <div className="flex-1 space-y-2 overflow-y-auto max-h-[550px]">
                  {day.orders.map((order) => {
                    const colors = getStageColorClasses(order.stage);
                    return (
                      <div
                        key={order.id}
                        className={`flex items-center gap-2 px-3 py-2 ${colors.bg} border ${colors.border} rounded-md hover:shadow-sm transition-all duration-200`}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`}></div>
                        <span className={`text-sm font-medium ${colors.text} truncate`}>
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