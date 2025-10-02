// @ts-nocheck
import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Search, LogOut, Play, Square, Coffee, Clock, Users, ArrowRight } from "lucide-react";
import { StaffOrderDetailDrawer } from "./StaffOrderDetailDrawer";
import { ScannerOverlay } from "./ScannerOverlay";
import { OrderOverflowMenu } from "./OrderOverflowMenu";
import { TallCakeIcon } from "./TallCakeIcon";
import { toast } from "sonner";
import { getQueue } from "../lib/rpc-client";

interface QueueItem {
  id: string;
  orderNumber: string;
  customerName: string;
  product: string;
  size: 'S' | 'M' | 'L';
  quantity: number;
  deliveryTime: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'In Production' | 'Pending' | 'Quality Check' | 'Completed' | 'Scheduled';
  flavor: string;
  dueTime: string;
  method?: 'Delivery' | 'Pickup';
  storage?: string;
  store: 'bannos' | 'flourlane';
  stage: string;
}

interface SupervisorWorkspacePageProps {
  supervisorName: string;
  onSignOut: () => void;
  onNavigateToBannosQueue: () => void;
  onNavigateToFlourlaneQueue: () => void;
}

type ShiftStatus = 'not-started' | 'on-shift' | 'on-break';

// Mock assigned orders for supervisor
const getSupervisorAssignedOrders = (): QueueItem[] => [
  {
    id: "SUP-001",
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
    stage: "quality-check"
  },
  {
    id: "SUP-002",
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
    stage: "final-check"
  }
];

// Convert legacy size to realistic display
const getRealisticSize = (originalSize: string, product: string, store: string) => {
  if (product.toLowerCase().includes("cupcake")) {
    return originalSize === 'S' ? 'Mini' : originalSize === 'M' ? 'Standard' : 'Jumbo';
  } else if (product.toLowerCase().includes("wedding")) {
    return originalSize === 'S' ? '6-inch Round' : originalSize === 'M' ? '8-inch Round' : '10-inch Round';
  } else if (product.toLowerCase().includes("birthday") || product.toLowerCase().includes("cake")) {
    return originalSize === 'S' ? 'Small' : originalSize === 'M' ? 'Medium Tall' : '8-inch Round';
  } else if (store === "flourlane") {
    return originalSize === 'S' ? 'Small Loaf' : originalSize === 'M' ? 'Standard' : 'Large Batch';
  }
  return originalSize === 'S' ? 'Small' : originalSize === 'M' ? 'Medium' : 'Large';
};

export function SupervisorWorkspacePage({ 
  supervisorName, 
  onSignOut, 
  onNavigateToBannosQueue, 
  onNavigateToFlourlaneQueue 
}: SupervisorWorkspacePageProps) {
  const [orders, setOrders] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus>('not-started');
  const [shiftStartTime, setShiftStartTime] = useState<Date | null>(null);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<QueueItem | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [showMyTasks, setShowMyTasks] = useState(true);

  // Update elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      if (shiftStatus === 'on-shift' && shiftStartTime) {
        const now = new Date();
        const diff = now.getTime() - shiftStartTime.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setElapsedTime(`${hours}h ${minutes}m`);
      } else if (shiftStatus === 'on-break' && breakStartTime) {
        const now = new Date();
        const diff = now.getTime() - breakStartTime.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setElapsedTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [shiftStatus, shiftStartTime, breakStartTime]);

  const filteredOrders = orders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchValue.toLowerCase()) ||
    order.customerName.toLowerCase().includes(searchValue.toLowerCase()) ||
    order.product.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Load orders from database
  useEffect(() => {
    loadSupervisorOrders();
  }, []);

  const loadSupervisorOrders = async () => {
    setLoading(true);
    try {
      // Fetch orders from both stores
      const [bannosOrders, flourlaneOrders] = await Promise.all([
        getQueue({ store: "bannos", limit: 100 }),
        getQueue({ store: "flourlane", limit: 100 })
      ]);
      
      // Combine all orders
      const allOrders = [...bannosOrders, ...flourlaneOrders];
      
      // Map database orders to UI format
      const mappedOrders = allOrders.map((order: any) => ({
        id: order.id,
        orderNumber: order.human_id || order.shopify_order_number || order.id,
        customerName: order.customer_name || "Unknown Customer",
        product: order.product_title || "Unknown Product",
        size: order.size || "M",
        quantity: order.item_qty || 1,
        deliveryTime: order.due_date || new Date().toISOString(),
        priority: order.priority === 1 ? "High" : order.priority === 0 ? "Medium" : "Low",
        status: mapStageToStatus(order.stage),
        flavor: order.flavour || "Unknown",
        dueTime: order.due_date || new Date().toISOString(),
        method: order.delivery_method === "delivery" ? "Delivery" : "Pickup",
        storage: order.storage || "Default",
        store: order.store || "bannos",
        stage: order.stage || "Filling"
      }));
      
      setOrders(mappedOrders);
    } catch (error) {
      console.error("Error loading supervisor orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const mapStageToStatus = (stage: string) => {
    switch (stage) {
      case "Filling": return "In Production";
      case "Covering": return "In Production";
      case "Decorating": return "In Production";
      case "Packing": return "Quality Check";
      case "Complete": return "Completed";
      default: return "Pending";
    }
  };

  const handleStartShift = () => {
    setShiftStatus('on-shift');
    setShiftStartTime(new Date());
    setElapsedTime('0h 0m');
    toast.success("Supervisor shift started");
  };

  const handleEndShift = () => {
    setShiftStatus('not-started');
    setShiftStartTime(null);
    setBreakStartTime(null);
    setElapsedTime('');
    toast.success("Supervisor shift ended");
  };

  const handleStartBreak = () => {
    setShiftStatus('on-break');
    setBreakStartTime(new Date());
    setElapsedTime('0:00');
    toast.success("Break started");
  };

  const handleEndBreak = () => {
    setShiftStatus('on-shift');
    setBreakStartTime(null);
    toast.success("Break ended");
  };

  const handleOpenOrder = (order: QueueItem) => {
    setSelectedOrder(order);
    setOrderDetailOpen(true);
  };

  const handleScanOrder = (order: QueueItem) => {
    if (shiftStatus === 'on-break') {
      toast.error("Cannot scan orders while on break");
      return;
    }
    setSelectedOrder(order);
    setScannerOpen(true);
  };

  const handlePrintBarcode = (order: QueueItem) => {
    toast.success(`Barcode for ${order.orderNumber} sent to printer`);
  };

  const handleOrderCompleted = (orderId: string) => {
    setOrders(orders.filter(order => order.id !== orderId));
    setScannerOpen(false);
    setSelectedOrder(null);
  };

  const getStoreColor = (store: string) => {
    return store === 'bannos' 
      ? 'bg-blue-100 text-blue-700 border-blue-200' 
      : 'bg-pink-100 text-pink-700 border-pink-200';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      "High": "bg-red-100 text-red-700 border-red-200",
      "Medium": "bg-yellow-100 text-yellow-700 border-yellow-200",
      "Low": "bg-green-100 text-green-700 border-green-200"
    };
    return colors[priority as keyof typeof colors] || "bg-gray-100 text-gray-700";
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
            <h1 className="text-xl font-medium text-foreground">Supervisor Workspace</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-foreground font-medium">{supervisorName}</span>
              
              {/* Shift Controls */}
              {shiftStatus === 'not-started' ? (
                <Button size="sm" onClick={handleStartShift}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Shift
                </Button>
              ) : shiftStatus === 'on-shift' ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <Clock className="mr-1 h-3 w-3" />
                    On Shift {elapsedTime}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={handleEndShift}>
                    <Square className="mr-2 h-4 w-4" />
                    End Shift
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleStartBreak}>
                    <Coffee className="mr-2 h-4 w-4" />
                    Start Break
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                    <Coffee className="mr-1 h-3 w-3" />
                    On Break {elapsedTime}
                  </Badge>
                  <Button size="sm" onClick={handleEndBreak}>
                    <Play className="mr-2 h-4 w-4" />
                    End Break
                  </Button>
                </div>
              )}
              
              <Button variant="outline" size="sm" onClick={onSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Queue Shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bannos Queue Shortcut */}
          <Card className="p-6 hover:bg-muted/30 transition-colors cursor-pointer" onClick={onNavigateToBannosQueue}>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="font-medium text-foreground">Open Bannos Queue</h3>
                </div>
                <p className="text-sm text-muted-foreground">Assign orders</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>

          {/* Flourlane Queue Shortcut */}
          <Card className="p-6 hover:bg-muted/30 transition-colors cursor-pointer" onClick={onNavigateToFlourlaneQueue}>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                    <TallCakeIcon className="h-4 w-4 text-pink-600" />
                  </div>
                  <h3 className="font-medium text-foreground">Open Flourlane Queue</h3>
                </div>
                <p className="text-sm text-muted-foreground">Assign orders</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        </div>

        {/* My Tasks Section (Optional) */}
        {showMyTasks && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-foreground">Assigned to me (Today)</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowMyTasks(false)}
                className="text-muted-foreground"
              >
                Hide
              </Button>
            </div>

            {/* Search */}
            <Card className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assigned orders..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-10"
                />
              </div>
            </Card>

            {/* Orders */}
            <div className="relative">
              {shiftStatus === 'on-break' && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <Coffee className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">Paused during break</p>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading orders...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOrders.map((order) => (
                  <Card key={order.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="space-y-3">
                      {/* Header with Store and Overflow Menu */}
                      <div className="flex items-center justify-between">
                        <Badge className={`text-xs ${getStoreColor(order.store)}`}>
                          {order.store === 'bannos' ? 'Bannos' : 'Flourlane'}
                        </Badge>
                        <OrderOverflowMenu
                          onOpenOrder={() => handleOpenOrder(order)}
                          onEditOrder={undefined}
                          onAssignToStaff={undefined}
                          onViewDetails={() => window.open(`https://admin.shopify.com/orders/${order.orderNumber}`, '_blank')}
                          isCompleteTab={false}
                        />
                      </div>

                      {/* Order Number */}
                      <div>
                        <p className="font-medium text-foreground">{order.orderNumber}</p>
                      </div>

                      {/* Product Title */}
                      <div>
                        <p className="text-sm text-foreground">{order.product}</p>
                      </div>

                      {/* Size */}
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Size: {getRealisticSize(order.size, order.product, order.store)}
                        </p>
                      </div>

                      {/* Priority and Due Date */}
                      <div className="flex items-center justify-between">
                        <Badge className={`text-xs ${getPriorityColor(order.priority)}`}>
                          {order.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Due: {order.dueTime.split(' ')[0]}
                        </span>
                      </div>

                      {/* Method and Storage */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{order.method}</span>
                        {order.storage && (
                          <Badge className={`text-xs ${getStorageColor()}`}>
                            {order.storage}
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleScanOrder(order)}
                          disabled={shiftStatus === 'on-break'}
                          className="flex-1"
                        >
                          Scan to Complete
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handlePrintBarcode(order)}
                          disabled={shiftStatus === 'on-break'}
                        >
                          Print Barcode
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                </div>
              )}

              {!loading && filteredOrders.length === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No assigned orders found</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Show My Tasks Button (if hidden) */}
        {!showMyTasks && (
          <Card className="p-4">
            <Button 
              variant="outline" 
              onClick={() => setShowMyTasks(true)}
              className="w-full"
            >
              Show My Tasks
            </Button>
          </Card>
        )}
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