import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Calendar as CalendarIcon,
  Wheat,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { TallCakeIcon } from "./TallCakeIcon";

interface OrderItem {
  id: string;
  customerName: string;
  items: string[];
  quantity: number;
  deliveryTime: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
  specialNotes?: string;
}

interface DaySchedule {
  date: string;
  dayName: string;
  orders: OrderItem[];
  totalOrders: number;
}

// Mock data for Flourlane (bread/bakery store)
const flourlaneWeekData: DaySchedule[] = [
  {
    date: "Sep 01",
    dayName: "Mon",
    orders: [
      {
        id: "F001",
        customerName: "Green Valley Cafe",
        items: ["Sourdough x10", "Bagels x24"],
        quantity: 34,
        deliveryTime: "6:00 AM",
        priority: "high",
        status: "in-progress"
      },
      {
        id: "F002",
        customerName: "Downtown Deli",
        items: ["Rye Bread x6", "Whole Wheat x8"],
        quantity: 14,
        deliveryTime: "7:30 AM",
        priority: "high",
        status: "pending"
      },
      {
        id: "F003",
        customerName: "Morning Bistro",
        items: ["Croissants x20", "Danish x12"],
        quantity: 32,
        deliveryTime: "8:00 AM",
        priority: "medium",
        status: "pending"
      }
    ],
    totalOrders: 3
  },
  {
    date: "Sep 02",
    dayName: "Tue",
    orders: [
      {
        id: "F004",
        customerName: "City Market",
        items: ["French Baguettes x15"],
        quantity: 15,
        deliveryTime: "5:30 AM",
        priority: "high",
        status: "pending"
      },
      {
        id: "F005",
        customerName: "Local Restaurant",
        items: ["Dinner Rolls x40"],
        quantity: 40,
        deliveryTime: "4:00 PM",
        priority: "medium",
        status: "pending"
      }
    ],
    totalOrders: 2
  },
  {
    date: "Sep 03",
    dayName: "Wed",
    orders: [
      {
        id: "F006",
        customerName: "School District",
        items: ["Sandwich Bread x25", "Hamburger Buns x50"],
        quantity: 75,
        deliveryTime: "7:00 AM",
        priority: "high",
        status: "pending",
        specialNotes: "Weekly delivery"
      }
    ],
    totalOrders: 1
  },
  {
    date: "Sep 04",
    dayName: "Thu",
    orders: [
      {
        id: "F007",
        customerName: "Corner Cafe",
        items: ["Artisan Loaves x8"],
        quantity: 8,
        deliveryTime: "9:00 AM",
        priority: "medium",
        status: "pending"
      },
      {
        id: "F008",
        customerName: "Sunset Diner",
        items: ["Muffins x24", "Scones x12"],
        quantity: 36,
        deliveryTime: "6:30 AM",
        priority: "high",
        status: "pending"
      }
    ],
    totalOrders: 2
  },
  {
    date: "Sep 05",
    dayName: "Fri",
    orders: [
      {
        id: "F009",
        customerName: "Weekend Market",
        items: ["Focaccia x12", "Ciabatta x10"],
        quantity: 22,
        deliveryTime: "8:00 AM",
        priority: "medium",
        status: "pending"
      },
      {
        id: "F010",
        customerName: "Pizza Palace",
        items: ["Pizza Dough x30"],
        quantity: 30,
        deliveryTime: "11:00 AM",
        priority: "high",
        status: "pending"
      }
    ],
    totalOrders: 2
  },
  {
    date: "Sep 06",
    dayName: "Sat",
    orders: [
      {
        id: "F011",
        customerName: "Farmers Market",
        items: ["Assorted Breads x20", "Pastries x30"],
        quantity: 50,
        deliveryTime: "6:00 AM",
        priority: "high",
        status: "pending",
        specialNotes: "Market stall setup"
      },
      {
        id: "F012",
        customerName: "Brunch Spot",
        items: ["Brioche x8", "Challah x4"],
        quantity: 12,
        deliveryTime: "9:00 AM",
        priority: "medium",
        status: "pending"
      }
    ],
    totalOrders: 2
  }
];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'text-red-600 bg-red-50 border-red-200';
    case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'low': return 'text-green-600 bg-green-50 border-green-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'in-progress': return <Clock className="h-4 w-4 text-orange-600" />;
    case 'pending': return <AlertCircle className="h-4 w-4 text-gray-400" />;
    default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
  }
};

export function FlourlaneMonitorPage() {
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
                <span className="font-medium">Sep 01 - Sep 06, 2025</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-4 h-[600px]">
            {flourlaneWeekData.map((day, index) => (
              <div key={index} className="flex flex-col">
                {/* Day Header */}
                <div className="mb-4 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-100 mb-2">
                    <div>
                      <div className="font-medium text-pink-600">{day.dayName}</div>
                      <div className="text-sm text-pink-600">{day.date}</div>
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
                    <Card key={order.id} className={`border-l-4 ${order.priority === 'high' ? 'border-l-red-500' : order.priority === 'medium' ? 'border-l-orange-500' : 'border-l-green-500'} shadow-sm hover:shadow-md transition-shadow`}>
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
                              {order.deliveryTime}
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
                              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                            )}
                          </div>

                          {/* Special Notes */}
                          {order.specialNotes && (
                            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border">
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
        </CardContent>
      </Card>
    </div>
  );
}