// @ts-nocheck
import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  Search,
  LogOut,
  Play,
  Square,
  Coffee,
  Clock,
  Briefcase,
} from "lucide-react";
import { StaffOrderDetailDrawer } from "./StaffOrderDetailDrawer";
import { ScannerOverlay } from "./ScannerOverlay";
import { OrderOverflowMenu } from "./OrderOverflowMenu";
import { toast } from "sonner";

// Import mock RPCs
import { get_queue } from "@/lib/rpc";
import type { MockOrder } from "@/mocks/mock-data";

interface QueueItem {
  id: string;
  orderNumber: string;
  customerName: string;
  product: string;
  size: "S" | "M" | "L";
  quantity: number;
  deliveryTime?: string;
  priority: "High" | "Medium" | "Low";
  status:
    | "In Production"
    | "Pending"
    | "Quality Check"
    | "Completed"
    | "Scheduled";
  flavor: string;
  dueTime: string;
  method?: "Delivery" | "Pickup";
  storage?: string;
  store: "bannos" | "flourlane";
  stage: string;
}

interface StaffWorkspacePageProps {
  staffName: string;
  onSignOut: () => void;
}

type ShiftStatus = "not-started" | "on-shift" | "on-break";

// Convert MockOrder to QueueItem
function mapMockOrderToQueueItem(order: MockOrder): QueueItem {
  const store = order.id.startsWith("bannos") ? "bannos" : "flourlane";
  return {
    id: order.id,
    orderNumber: order.id,
    customerName: `Customer ${order.id.split('-')[1]}`,
    product: order.product_title,
    size: 'M' as const,
    quantity: 1,
    // deliveryTime: undefined, // time window not used in this system
    priority: order.priority,
    status: mapStageToStatus(order.stage),
    flavor: "Chocolate",
    dueTime: "10:00 AM",
    method: 'Delivery' as const,
    storage: order.storage || undefined,
    store: store,
    stage: order.stage.toLowerCase(),
  };
}

function mapStageToStatus(stage: MockOrder["stage"]): QueueItem["status"] {
  switch(stage) {
    case "Filling": 
    case "Covering": 
    case "Decorating": 
      return "In Production";
    case "Packing": 
      return "Quality Check";
    case "Complete": 
      return "Completed";
    default: 
      return "Pending";
  }
}

// Convert legacy size to realistic display
const getRealisticSize = (
  originalSize: string,
  product: string,
  store: string,
) => {
  if (product.toLowerCase().includes("cupcake")) {
    return originalSize === "S"
      ? "Mini"
      : originalSize === "M"
        ? "Standard"
        : "Jumbo";
  } else if (product.toLowerCase().includes("wedding")) {
    return originalSize === "S"
      ? "6-inch Round"
      : originalSize === "M"
        ? "8-inch Round"
        : "10-inch Round";
  } else if (
    product.toLowerCase().includes("birthday") ||
    product.toLowerCase().includes("cake")
  ) {
    return originalSize === "S"
      ? "Small"
      : originalSize === "M"
        ? "Medium Tall"
        : "8-inch Round";
  } else if (store === "flourlane") {
    return originalSize === "S"
      ? "Small Loaf"
      : originalSize === "M"
        ? "Standard"
        : "Large Batch";
  }
  return originalSize === "S"
    ? "Small"
    : originalSize === "M"
      ? "Medium"
      : "Large";
};

export function StaffWorkspacePage({
  staffName,
  onSignOut,
}: StaffWorkspacePageProps) {
  const [orders, setOrders] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [shiftStatus, setShiftStatus] =
    useState<ShiftStatus>("not-started");
  const [shiftStartTime, setShiftStartTime] =
    useState<Date | null>(null);
  const [breakStartTime, setBreakStartTime] =
    useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState("");
  const [selectedOrder, setSelectedOrder] =
    useState<QueueItem | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");

  // Mock unread message count

  // Load orders from mock
  async function loadStaffOrders() {
    setLoading(true);
    try {
      const mockOrders = await get_queue();
      // Filter for assigned orders (simulate staff assignment)
      // For now, let's show orders that have assignee_id not null OR the first 3 orders
      const assignedOrders = mockOrders.filter(o => o.assignee_id !== null);
      
      // If no assigned orders, simulate by assigning the first few
      if (assignedOrders.length === 0) {
        assignedOrders.push(...mockOrders.slice(0, 3));
      }
      
      const mappedOrders = assignedOrders.map(mapMockOrderToQueueItem);
      setOrders(mappedOrders);
    } catch (error) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  // Load orders on mount
  useEffect(() => {
    loadStaffOrders();
  }, []);

  // Update elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      if (shiftStatus === "on-shift" && shiftStartTime) {
        const now = new Date();
        const diff = now.getTime() - shiftStartTime.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor(
          (diff % (1000 * 60 * 60)) / (1000 * 60),
        );
        setElapsedTime(`${hours}h ${minutes}m`);
      } else if (shiftStatus === "on-break" && breakStartTime) {
        const now = new Date();
        const diff = now.getTime() - breakStartTime.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setElapsedTime(
          `${minutes}:${seconds.toString().padStart(2, "0")}`,
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [shiftStatus, shiftStartTime, breakStartTime]);

  const filteredOrders = orders.filter(
    (order) =>
      order.orderNumber
        .toLowerCase()
        .includes(searchValue.toLowerCase()) ||
      order.customerName
        .toLowerCase()
        .includes(searchValue.toLowerCase()) ||
      order.product
        .toLowerCase()
        .includes(searchValue.toLowerCase()),
  );

  const handleStartShift = () => {
    setShiftStatus("on-shift");
    setShiftStartTime(new Date());
    setElapsedTime("0h 0m");
    toast.success("Shift started");
  };

  const handleEndShift = () => {
    setShiftStatus("not-started");
    setShiftStartTime(null);
    setBreakStartTime(null);
    setElapsedTime("");
    toast.success("Shift ended");
  };

  const handleStartBreak = () => {
    setShiftStatus("on-break");
    setBreakStartTime(new Date());
    setElapsedTime("0:00");
    toast.success("Break started");
  };

  const handleEndBreak = () => {
    setShiftStatus("on-shift");
    setBreakStartTime(null);
    toast.success("Break ended");
  };

  const handleOpenOrder = (order: QueueItem) => {
    setSelectedOrder(order);
    setOrderDetailOpen(true);
  };

  const handleScanOrder = (order: QueueItem) => {
    if (shiftStatus === "on-break") {
      toast.error("Cannot scan orders while on break");
      return;
    }
    setSelectedOrder(order);
    setScannerOpen(true);
  };

  const handleOrderCompleted = async (orderId: string) => {
    // Remove from local state
    setOrders(orders.filter((order) => order.id !== orderId));
    setScannerOpen(false);
    setSelectedOrder(null);
    
    // Reload orders to get updated state
    await loadStaffOrders();
  };

  const handleRefresh = () => {
    loadStaffOrders();
  };

  const getStoreColor = (store: string) => {
    return store === "bannos"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : "bg-pink-100 text-pink-700 border-pink-200";
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      High: "bg-red-100 text-red-700 border-red-200",
      Medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
      Low: "bg-green-100 text-green-700 border-green-200",
    };
    return (
      colors[priority as keyof typeof colors] ||
      "bg-gray-100 text-gray-700"
    );
  };

  const getStorageColor = () => {
    return "bg-purple-100 text-purple-700 border-purple-200";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-muted rounded-lg mb-4 mx-auto"></div>
          <div className="h-4 bg-muted rounded w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-medium text-foreground">
              Staff Workspace
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-foreground font-medium">
                {staffName}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
              >
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Shift Controls */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {shiftStatus === "not-started" ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    Not on shift
                  </span>
                  <Button onClick={handleStartShift}>
                    <Play className="mr-2 h-4 w-4" />
                    Start Shift
                  </Button>
                </>
              ) : shiftStatus === "on-shift" ? (
                <>
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <Clock className="mr-1 h-3 w-3" />
                    On Shift {elapsedTime}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEndShift}
                  >
                    <Square className="mr-2 h-4 w-4" />
                    End Shift
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartBreak}
                  >
                    <Coffee className="mr-2 h-4 w-4" />
                    Start Break
                  </Button>
                </>
              ) : (
                <>
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                    <Coffee className="mr-1 h-3 w-3" />
                    On Break {elapsedTime}
                  </Badge>
                  <Button onClick={handleEndBreak}>
                    <Play className="mr-2 h-4 w-4" />
                    End Break
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-1 max-w-md">
            <TabsTrigger
              value="orders"
              className="flex items-center gap-2"
            >
              <Briefcase className="h-4 w-4" />
              My Orders ({orders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="orders"
            className="space-y-6 mt-6"
          >
            {/* Search */}
            <Card className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assigned orders..."
                  value={searchValue}
                  onChange={(e) =>
                    setSearchValue(e.target.value)
                  }
                  className="pl-10"
                />
              </div>
            </Card>

            {/* Assigned Orders */}
            <div className="relative">
              {shiftStatus === "on-break" && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <Coffee className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">
                      Paused during break
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((order) => (
                  <Card
                    key={order.id}
                    className="p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-3">
                      {/* Header with Store and Overflow Menu */}
                      <div className="flex items-center justify-between">
                        <Badge
                          className={`text-xs ${getStoreColor(order.store)}`}
                        >
                          {order.store === "bannos"
                            ? "Bannos"
                            : "Flourlane"}
                        </Badge>
                        <OrderOverflowMenu
                          onOpenOrder={() =>
                            handleOpenOrder(order)
                          }
                          onEditOrder={undefined}
                          onAssignToStaff={undefined}
                          onViewDetails={() =>
                            window.open(
                              `https://admin.shopify.com/orders/${order.orderNumber}`,
                              "_blank",
                            )
                          }
                          isCompleteTab={false}
                        />
                      </div>

                      {/* Order Number */}
                      <div>
                        <p className="font-medium text-foreground">
                          {order.orderNumber}
                        </p>
                      </div>

                      {/* Product Title */}
                      <div>
                        <p className="text-sm text-foreground">
                          {order.product}
                        </p>
                      </div>

                      {/* Size */}
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Size:{" "}
                          {getRealisticSize(
                            order.size,
                            order.product,
                            order.store,
                          )}
                        </p>
                      </div>

                      {/* Priority and Due Date */}
                      <div className="flex items-center justify-between">
                        <Badge
                          className={`text-xs ${getPriorityColor(order.priority)}`}
                        >
                          {order.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Due: {order.dueTime.split(" ")[0]}
                        </span>
                      </div>

                      {/* Method and Storage */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {order.method}
                        </span>
                        {order.storage && (
                          <Badge
                            className={`text-xs ${getStorageColor()}`}
                          >
                            {order.storage}
                          </Badge>
                        )}
                      </div>

                      {/* Stage and Scan Button */}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground capitalize">
                          Stage: {order.stage}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleScanOrder(order)}
                          disabled={shiftStatus === "on-break"}
                        >
                          Scan to Complete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {filteredOrders.length === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No assigned orders found
                  </p>
                </Card>
              )}
            </div>
          </TabsContent>

        </Tabs>
      </div>

      {/* Order Detail Drawer */}
      <StaffOrderDetailDrawer
        isOpen={orderDetailOpen}
        onClose={() => setOrderDetailOpen(false)}
        order={selectedOrder}
        onScanBarcode={() => {
          setOrderDetailOpen(false);
          setScannerOpen(true);
        }}
      />

      {/* Scanner Overlay */}
      <ScannerOverlay
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        order={selectedOrder}
        onOrderCompleted={handleOrderCompleted}
      />
    </div>
  );
}