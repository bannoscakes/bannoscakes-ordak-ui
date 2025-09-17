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
  MessageSquare,
  Briefcase,
} from "lucide-react";
import { StaffOrderDetailDrawer } from "./StaffOrderDetailDrawer";
import { ScannerOverlay } from "./ScannerOverlay";
import { OrderOverflowMenu } from "./OrderOverflowMenu";
import { MessagesPage } from "./messaging/MessagesPage";
import { toast } from "sonner";

interface QueueItem {
  id: string;
  orderNumber: string;
  customerName: string;
  product: string;
  size: "S" | "M" | "L";
  quantity: number;
  deliveryTime: string;
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

// Mock assigned orders data
const getAssignedOrders = (): QueueItem[] => [
  {
    id: "BAN-Q01",
    orderNumber: "BAN-001",
    customerName: "Sweet Delights Co.",
    product: "Chocolate Cupcakes",
    size: "M",
    quantity: 150,
    deliveryTime: "09:30",
    priority: "High",
    status: "In Production",
    flavor: "Chocolate",
    dueTime: "10:00 AM",
    method: "Delivery",
    store: "bannos",
    stage: "filling",
  },
  {
    id: "FLR-Q03",
    orderNumber: "FLR-003",
    customerName: "Chocolate Dreams Café",
    product: "Cocoa Swirl Bread",
    size: "M",
    quantity: 60,
    deliveryTime: "10:00",
    priority: "High",
    status: "Pending",
    flavor: "Chocolate",
    dueTime: "11:15 AM",
    method: "Delivery",
    store: "flourlane",
    stage: "covering",
  },
  {
    id: "BAN-Q04",
    orderNumber: "BAN-004",
    customerName: "Birthday Bash",
    product: "Caramel Cake",
    size: "M",
    quantity: 60,
    deliveryTime: "09:45",
    priority: "High",
    status: "Pending",
    flavor: "Caramel",
    dueTime: "10:30 AM",
    method: "Delivery",
    store: "bannos",
    stage: "decorating",
  },
  {
    id: "FLR-Q07",
    orderNumber: "FLR-007",
    customerName: "Sweet Bakery Outlet",
    product: "Glazed Honey Donuts",
    size: "M",
    quantity: 100,
    deliveryTime: "08:00",
    priority: "High",
    status: "Pending",
    flavor: "Vanilla",
    dueTime: "09:00 AM",
    method: "Delivery",
    store: "flourlane",
    stage: "packing",
    storage: "Kitchen Coolroom",
  },
  {
    id: "BAN-Q08",
    orderNumber: "BAN-008",
    customerName: "School Event",
    product: "Mini Cupcakes",
    size: "S",
    quantity: 150,
    deliveryTime: "12:00",
    priority: "Medium",
    status: "Pending",
    flavor: "Strawberry",
    dueTime: "01:00 PM",
    method: "Delivery",
    store: "bannos",
    stage: "filling",
  },
];

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
  const [orders, setOrders] = useState<QueueItem[]>(
    getAssignedOrders(),
  );
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
  const unreadMessageCount = 3;

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
    // Resume shift time calculation
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

  const handleOrderCompleted = (orderId: string) => {
    setOrders(orders.filter((order) => order.id !== orderId));
    setScannerOpen(false);
    setSelectedOrder(null);
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

        {/* Packing Queue Shortcuts */}
        <Card className="p-4">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">
              Quick Access
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() =>
                  window.open(
                    "/?page=bannos-production&tab=packing",
                    "_blank",
                  )
                }
              >
                Open Packing Queue — Bannos
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() =>
                  window.open(
                    "/?page=flourlane-production&tab=packing",
                    "_blank",
                  )
                }
              >
                Open Packing Queue — Flourlane
              </Button>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger
              value="orders"
              className="flex items-center gap-2"
            >
              <Briefcase className="h-4 w-4" />
              My Orders
            </TabsTrigger>
            <TabsTrigger
              value="messages"
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Messages
              {unreadMessageCount > 0 && (
                <Badge className="bg-red-500 text-white text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center ml-1">
                  {unreadMessageCount}
                </Badge>
              )}
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
                          onEditOrder={undefined} // No edit in staff workspace
                          onAssignToStaff={undefined} // No assign in staff workspace
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

          <TabsContent value="messages" className="mt-6">
            <Card className="h-[600px]">
              <MessagesPage staffName={staffName} />
            </Card>
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