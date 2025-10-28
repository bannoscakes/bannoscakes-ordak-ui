import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Calendar as CalendarIcon,
  Cake,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { Stage } from "@/types/stage";
import { useEffect, useState } from "react";
import { getQueue } from "../lib/rpc-client";

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

// Mock data for Bannos (cake/dessert store)
const bannosWeekData: DaySchedule[] = [
  {
    date: "Sep 01",
    dayName: "Mon",
    orders: [
      {
        id: "B001",
        customerName: "Maria Garcia",
        items: ["Chocolate Cake", "Cupcakes x12"],
        quantity: 2,
        deliveryTime: "10:00 AM",
        priority: "high",
        status: "pending"
      },
      {
        id: "B002", 
        customerName: "John Smith",
        items: ["Wedding Cake"],
        quantity: 1,
        deliveryTime: "2:00 PM",
        priority: "high",
        status: "in-progress",
        specialNotes: "3-tier, vanilla & strawberry"
      },
      {
        id: "B003",
        customerName: "Lisa Chen",
        items: ["Birthday Cake"],
        quantity: 1,
        deliveryTime: "4:00 PM",
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
        id: "B004",
        customerName: "David Wilson",
        items: ["Cheesecake", "Brownies x6"],
        quantity: 2,
        deliveryTime: "11:00 AM",
        priority: "medium",
        status: "pending"
      },
      {
        id: "B005",
        customerName: "Sarah Johnson",
        items: ["Custom Cake"],
        quantity: 1,
        deliveryTime: "3:00 PM",
        priority: "high",
        status: "pending",
        specialNotes: "Gluten-free, chocolate"
      }
    ],
    totalOrders: 2
  },
  {
    date: "Sep 03",
    dayName: "Wed",
    orders: [
      {
        id: "B006",
        customerName: "Robert Miller",
        items: ["Tiramisu", "Macarons x24"],
        quantity: 2,
        deliveryTime: "9:00 AM",
        priority: "medium",
        status: "pending"
      }
    ],
    totalOrders: 1
  },
  {
    date: "Sep 04",
    dayName: "Thu",
    orders: [
      {
        id: "B007",
        customerName: "Emma Davis",
        items: ["Anniversary Cake"],
        quantity: 1,
        deliveryTime: "1:00 PM",
        priority: "high",
        status: "pending"
      },
      {
        id: "B008",
        customerName: "Michael Brown",
        items: ["Cupcakes x18"],
        quantity: 1,
        deliveryTime: "5:00 PM",
        priority: "low",
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
        id: "B009",
        customerName: "Jessica Wilson",
        items: ["Graduation Cake"],
        quantity: 1,
        deliveryTime: "10:00 AM",
        priority: "high",
        status: "pending"
      },
      {
        id: "B010",
        customerName: "Daniel Lee",
        items: ["Donuts x12"],
        quantity: 1,
        deliveryTime: "12:00 PM",
        priority: "medium",
        status: "pending"
      },
      {
        id: "B011",
        customerName: "Ashley Taylor",
        items: ["Strawberry Cake"],
        quantity: 1,
        deliveryTime: "3:00 PM",
        priority: "medium",
        status: "pending"
      }
    ],
    totalOrders: 3
  },
  {
    date: "Sep 06",
    dayName: "Sat",
    orders: [
      {
        id: "B012",
        customerName: "Christopher Garcia",
        items: ["Birthday Cake", "Cupcakes x6"],
        quantity: 2,
        deliveryTime: "11:00 AM",
        priority: "high",
        status: "pending"
      },
      {
        id: "B013",
        customerName: "Amanda Martinez",
        items: ["Cheesecake"],
        quantity: 1,
        deliveryTime: "2:00 PM",
        priority: "low",
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

interface BannosMonitorPageProps {
  stats?: Record<Stage, number>;
}

export function BannosMonitorPage({ stats }: BannosMonitorPageProps) {
  const [weekData, setWeekData] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyOrders();
  }, []);

  const fetchWeeklyOrders = async () => {
    try {
      setLoading(true);
      const orders = await getQueue({
        store: 'bannos',
        limit: 100,
        sort_by: 'due_date',
        sort_order: 'ASC'
      });

      const groupedByDate: Record<string, any[]> = {};
      orders.forEach((order: any) => {
        const dueDate = order.due_date || 'No Date';
        if (!groupedByDate[dueDate]) {
          groupedByDate[dueDate] = [];
        }
        groupedByDate[dueDate].push({
          id: order.id,
          customerName: order.customer_name || 'Unknown',
          items: [order.product_title || 'Unknown'],
          quantity: order.item_qty || 1,
          deliveryTime: '10:00 AM',
          priority: (order.priority?.toLowerCase() || 'medium') as 'high' | 'medium' | 'low',
          status: (order.stage === 'Complete' ? 'completed' : order.assignee_id ? 'in-progress' : 'pending') as 'pending' | 'in-progress' | 'completed',
          specialNotes: order.notes || undefined
        });
      });

      const weekSchedule = Object.entries(groupedByDate).slice(0, 6).map(([date, dayOrders]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        orders: dayOrders,
        totalOrders: dayOrders.length
      }));

      setWeekData(weekSchedule);
    } catch (error) {
      console.error('Failed to fetch weekly orders:', error);
      setWeekData([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <Card className="h-full">
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-64 mb-6"></div>
              <div className="grid grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
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
              <div className="p-3 rounded-xl bg-blue-100">
                <Cake className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">Bannos Kitchen Monitor</CardTitle>
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
            {weekData.map((day, index) => (
              <div key={index} className="flex flex-col">
                {/* Day Header */}
                <div className="mb-4 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-2">
                    <div>
                      <div className="font-medium text-blue-600">{day.dayName}</div>
                      <div className="text-sm text-blue-600">{day.date}</div>
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