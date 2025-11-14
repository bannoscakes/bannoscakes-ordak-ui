import { useState, useEffect } from "react";
import { Bot, Printer, QrCode } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { Separator } from "./ui/separator";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { getOrder } from "../lib/rpc-client";

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
  store?: 'bannos' | 'flourlane';
  stage?: string;
}

interface OrderDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  order: QueueItem | null;
  store: "bannos" | "flourlane";
}

// Sample extended order data
const getExtendedOrderData = (order: QueueItem | null, store: "bannos" | "flourlane") => {
  if (!order) return null;
  
  // Generate realistic size values based on product type and original size
  const getRealisticSize = (originalSize: string, product: string) => {
    if (product.toLowerCase().includes("cupcake")) {
      return originalSize === 'S' ? 'Mini' : originalSize === 'M' ? 'Standard' : 'Jumbo';
    } else if (product.toLowerCase().includes("wedding")) {
      return originalSize === 'S' ? '6-inch Round' : originalSize === 'M' ? '8-inch Round' : '10-inch Round';
    } else if (product.toLowerCase().includes("birthday") || product.toLowerCase().includes("cake")) {
      return originalSize === 'S' ? 'Small' : originalSize === 'M' ? 'Medium Tall' : '8-inch Round';
    } else if (store === "flourlane") {
      // Bread/bakery items
      return originalSize === 'S' ? 'Small Loaf' : originalSize === 'M' ? 'Standard' : 'Large Batch';
    }
    // Default fallback
    return originalSize === 'S' ? 'Small' : originalSize === 'M' ? 'Medium' : 'Large';
  };
  
  // Sample data that would come from a full order object
  return {
    ...order,
    size: getRealisticSize(order.size, order.product), // Override with realistic size
    writingOnCake: order.id.includes("BAN-C03") || order.id.includes("FLR-C03") 
      ? "Happy Birthday Sarah! Love, Mom & Dad" 
      : order.id.includes("015") || order.id.includes("C01")
      ? "Congratulations on your Wedding!"
      : "",
    accessories: order.product.toLowerCase().includes("wedding") 
      ? ["Cake Stand", "Decorative Flowers", "Cake Topper"]
      : order.product.toLowerCase().includes("cupcake")
      ? ["Cupcake Liners", "Decorative Picks"]
      : [],
    deliveryDate: order.dueTime || order.deliveryTime || new Date().toISOString().split('T')[0],
    notes: order.priority === "High" 
      ? "Customer requested early morning pickup. Handle with extra care - VIP client."
      : order.method === "Delivery"
      ? "Standard delivery. Contact customer 30 mins before arrival."
      : "Customer will pickup. Ensure order is ready at specified time.",
    productImage: store === "bannos" 
      ? "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop"
      : "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
    imageCaption: order.product
  };
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

export function OrderDetailDrawer({ isOpen, onClose, order, store }: OrderDetailDrawerProps) {
  const [qcIssue, setQcIssue] = useState("None");
  const [qcComments, setQcComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [realOrder, setRealOrder] = useState<QueueItem | null>(null);
  
  // Fetch real order data when drawer opens
  useEffect(() => {
    if (isOpen && order) {
      fetchRealOrderData();
    }
  }, [isOpen, order, store]);

  const fetchRealOrderData = async () => {
    if (!order) return;
    
    try {
      setLoading(true);
      
      // Fetch the specific order using getOrder RPC
      const foundOrder = await getOrder(order.id, store);
      
      if (foundOrder) {
        // Map database order to UI format
        const mappedOrder: QueueItem = {
          id: foundOrder.id,
          orderNumber: foundOrder.human_id || foundOrder.shopify_order_number || foundOrder.id,
          customerName: foundOrder.customer_name || "Unknown Customer",
          product: foundOrder.product_title || "Unknown Product",
          size: foundOrder.size || "M",
          quantity: foundOrder.item_qty || 1,
          deliveryTime: foundOrder.due_date || new Date().toISOString(),
          priority: foundOrder.priority === 1 ? "High" : foundOrder.priority === 0 ? "Medium" : "Low",
          status: mapStageToStatus(foundOrder.stage),
          flavor: foundOrder.flavour || "Unknown",
          dueTime: foundOrder.due_date || new Date().toISOString(),
          method: foundOrder.delivery_method === "delivery" ? "Delivery" : "Pickup",
          storage: foundOrder.storage || "Default",
          store: foundOrder.store || store,
          stage: foundOrder.stage || "Filling"
        };
        
        setRealOrder(mappedOrder);
      } else {
        // Fallback to original order if not found in database
        setRealOrder(order);
      }
    } catch (error) {
      console.error('Error fetching order data:', error);
      toast.error('Failed to load order details');
      // Fallback to original order
      setRealOrder(order);
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

  const extendedOrder = getExtendedOrderData(realOrder || order, store);
  const storeName = store === "bannos" ? "Bannos" : "Flourlane";
  
  if (!extendedOrder) return null;

  const handleViewDetails = () => {
    // This would link to Shopify order
    window.open(`https://admin.shopify.com/orders/${extendedOrder.orderNumber}`, '_blank');
  };

  const handlePrintPackingSlip = () => {
    toast.success("Packing slip sent to printer");
  };

  const handlePrintCareCard = () => {
    toast.success("Care Card QR sent to printer");
  };

  const handleRunAIQC = () => {
    toast.success("AI QC assistant opened");
  };

  const handleScanBarcode = () => {
    toast.success("Barcode scanner opened");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="!w-[540px] max-w-full sm:!max-w-[540px] p-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-medium text-foreground">
                Order Details
              </SheetTitle>
            </div>
            <SheetDescription className="sr-only">
              Detailed view of order {extendedOrder.orderNumber} for {extendedOrder.customerName}
            </SheetDescription>
          </SheetHeader>

          {/* Loading State */}
          {loading && (
            <div className="px-6 py-8 text-center">
              <div className="text-sm text-muted-foreground">Loading order details...</div>
            </div>
          )}

          {/* Subheader */}
          {!loading && (
            <div className="px-6 pt-4 pb-6 space-y-4">
              <div className="grid gap-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Customer:</span> {extendedOrder.customerName}
                </p>
                <p>
                  <span className="font-medium text-foreground">Store:</span> {storeName}
                </p>
                <p>
                  <span className="font-medium text-foreground">Order #:</span> {extendedOrder.orderNumber}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Priority</p>
                  <div className="mt-2">
                    <Badge className={`text-xs ${getPriorityColor(extendedOrder.priority)}`}>
                      {extendedOrder.priority}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Due Date</p>
                  <p className="mt-2 text-foreground">
                    {extendedOrder.deliveryDate}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Method</p>
                  <p className="mt-2 text-foreground">{extendedOrder.method}</p>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Body - Scrollable */}
          {!loading && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Product Image + Product */}
            <div className="space-y-4">
              {extendedOrder.productImage && (
                <div>
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted/30 border">
                    <ImageWithFallback
                      src={extendedOrder.productImage}
                      alt={extendedOrder.product}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {extendedOrder.imageCaption && (
                    <p className="mt-2 text-xs text-muted-foreground">{extendedOrder.imageCaption}</p>
                  )}
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Product
                </label>
                <p className="text-sm text-foreground">
                  {extendedOrder.product}
                </p>
              </div>
            </div>

            {/* Size + Flavour */}
            <div className={`grid gap-4 ${extendedOrder.flavor && extendedOrder.flavor !== "Other" ? "grid-cols-2" : "grid-cols-1"}`}>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Size
                </label>
                <p className="text-sm text-foreground">
                  {extendedOrder.size}
                </p>
              </div>
              {extendedOrder.flavor && extendedOrder.flavor !== "Other" && (
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Flavour
                  </label>
                  <p className="text-sm text-foreground">{extendedOrder.flavor}</p>
                </div>
              )}
            </div>

            {/* Writing on Cake */}
            {extendedOrder.writingOnCake && (
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Writing on Cake
                </label>
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <p className="text-sm text-foreground">{extendedOrder.writingOnCake}</p>
                </div>
              </div>
            )}

            {/* Accessories */}
            {extendedOrder.accessories && extendedOrder.accessories.length > 0 && (
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Accessories
                </label>
                <div className="flex flex-wrap gap-2">
                  {extendedOrder.accessories.map((accessory, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {accessory}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Quantity
              </label>
              <p className="text-sm text-foreground">{extendedOrder.quantity}</p>
            </div>

            {/* Storage */}
            {extendedOrder.storage && (
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Storage
                </label>
                <Badge className={`text-xs ${getStorageColor()}`}>
                  {extendedOrder.storage}
                </Badge>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Notes
              </label>
              <div className="p-3 bg-muted/30 rounded-lg border min-h-[80px]">
                <p className="text-sm text-foreground">{extendedOrder.notes}</p>
              </div>
            </div>

            {/* Quality Control Section - Only for Packing stage */}
            {order?.stage === "packing" && (
              <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Quality Control
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRunAIQC}
                    className="text-xs text-blue-600 hover:text-blue-700 p-0 h-auto"
                  >
                    <Bot className="mr-1 h-3 w-3" />
                    Run AI QC
                  </Button>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-foreground block mb-2">
                    QC Issue
                  </label>
                  <Select value={qcIssue} onValueChange={setQcIssue}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Damaged Cake">Damaged Cake</SelectItem>
                      <SelectItem value="Wrong spelling">Wrong spelling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-2">
                    QC Comments (optional)
                  </label>
                  <Textarea
                    placeholder="Enter QC comments..."
                    value={qcComments}
                    onChange={(e) => setQcComments(e.target.value)}
                    className="min-h-[60px] text-sm"
                  />
                </div>
              </div>
            )}
          </div>
          )}

          <Separator />

          {/* Footer */}
          <div className="p-6">
            {order?.stage === "packing" ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleViewDetails}
                  >
                    View in Shopify
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handlePrintPackingSlip}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print Packing Slip
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handlePrintCareCard}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Print Care Card QR
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleScanBarcode}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Scan Barcode
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleViewDetails}
              >
                View Details in Shopify
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}