import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
  Cake,
  Wheat,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

interface OrderItem {
  id: string;
  customerName: string;
  items: string[];
  quantity: number;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'pending' | 'in-progress' | 'completed';
  specialNotes?: string;
}

interface DaySchedule {
  date: string;
  dayName: string;
  orders: OrderItem[];
  totalOrders: number;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'High': return 'bg-destructive/15 text-destructive border-destructive/30';
    case 'Medium': return 'bg-warning/15 text-warning border-warning/30';
    case 'Low': return 'bg-success/15 text-success border-success/30';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'in-progress': return <Clock className="h-4 w-4 text-warning" />;
    case 'pending': return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

interface KitchenMonitorProps {
  storeName: string;
  storeIcon: React.ComponentType<{ className?: string }>;
  weekData: DaySchedule[];
  primaryColor: string;
  accentColor: string;
}

function KitchenMonitor({ storeName, storeIcon: StoreIcon, weekData, primaryColor, accentColor }: KitchenMonitorProps) {
  const hasData = weekData.length > 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${accentColor}`}>
              <StoreIcon className={`h-8 w-8 ${primaryColor}`} />
            </div>
            <div>
              <CardTitle className="text-2xl">{storeName} Kitchen Monitor</CardTitle>
              <p className="text-muted-foreground">Weekly Production Schedule</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">This Week</span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-center">
            <CalendarIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Schedule Coming Soon
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Weekly production schedule will be available here once connected to order data.
            </p>
            <Badge variant="secondary" className="mt-4">
              Issue #394
            </Badge>
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-4 h-[600px]">
            {weekData.map((day, index) => (
              <div key={index} className="flex flex-col">
                {/* Day Header */}
                <div className="mb-4 text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${accentColor} mb-2`}>
                    <div>
                      <div className={`font-medium ${primaryColor}`}>{day.dayName}</div>
                      <div className={`text-sm ${primaryColor}`}>{day.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {day.totalOrders} orders
                    </Badge>
                  </div>
                </div>

                {/* Orders List */}
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {day.orders.map((order) => (
                    <Card key={order.id} className={`border-l-4 ${order.priority === 'High' ? 'border-l-destructive' : order.priority === 'Medium' ? 'border-l-warning' : 'border-l-success'} shadow-sm hover:shadow-md transition-shadow`}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          {/* Order Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{order.id}</span>
                              {getStatusIcon(order.status)}
                            </div>
                            <Badge className={`text-xs ${getPriorityColor(order.priority)}`}>
                              {order.priority}
                            </Badge>
                          </div>

                          {/* Customer & Time */}
                          <div>
                            <p className="font-medium text-sm truncate">{order.customerName}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {order.dueDate}
                            </div>
                          </div>

                          {/* Items */}
                          <div className="space-y-1">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="text-xs text-muted-foreground truncate">
                                {item}
                              </div>
                            ))}
                          </div>

                          {/* Quantity */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">
                              Qty: {order.quantity}
                            </span>
                            {order.status === 'in-progress' && (
                              <div className="w-2 h-2 bg-warning rounded-full animate-pulse"></div>
                            )}
                          </div>

                          {/* Special Notes */}
                          {order.specialNotes && (
                            <div className="text-xs text-primary bg-primary/10 p-2 rounded border border-primary/20">
                              {order.specialNotes}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SchedulePage() {
  // TODO (#394): Replace with React Query hook to fetch real schedule data
  const bannosWeekData: DaySchedule[] = [];
  const flourlaneWeekData: DaySchedule[] = [];

  return (
    <div className="p-6 space-y-8">
      {/* Page Header */}
      <div>
        <h1>Production Schedule</h1>
        <p className="text-muted-foreground">
          Weekly production schedules for kitchen monitors
        </p>
      </div>

      {/* Bannos Monitor */}
      <div>
        <KitchenMonitor
          storeName="Bannos"
          storeIcon={Cake}
          weekData={bannosWeekData}
          primaryColor="text-pink-600"
          accentColor="bg-pink-100"
        />
      </div>

      {/* Flourlane Monitor */}
      <div>
        <KitchenMonitor
          storeName="Flourlane"
          storeIcon={Wheat}
          weekData={flourlaneWeekData}
          primaryColor="text-amber-600"
          accentColor="bg-amber-100"
        />
      </div>
    </div>
  );
}
