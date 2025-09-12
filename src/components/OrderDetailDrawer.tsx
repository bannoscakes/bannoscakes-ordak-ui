import { useState } from "react";
import { X, Bot, Printer, QrCode } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { Separator } from "./ui/separator";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner@2.0.3";

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
  
  const storeName = store === "bannos" ? "Bannos" : "Flourlane";
  
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
    deliveryDate: "2024-12-03",
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
  const extendedOrder = getExtendedOrderData(order, store);
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
      <SheetContent className="w-[480px] p-0">
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

          {/* Subheader */}
          <div className="px-6 pt-4 pb-6 space-y-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Customer:</span> {extendedOrder.customerName}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Store:</span> {storeName}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Order #:</span> {extendedOrder.orderNumber}
            </p>
          </div>

          <Separator />

          {/* Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Product */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Product
              </label>
              <p className="text-sm text-foreground">
                {extendedOrder.product}
              </p>
            </div>

            {/* Size */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Size
              </label>
              <p className="text-sm text-foreground">
                {extendedOrder.size}
              </p>
            </div>

            {/* Flavour */}
            {extendedOrder.flavor && extendedOrder.flavor !== "Other" && (
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Flavour
                </label>
                <p className="text-sm text-foreground">{extendedOrder.flavor}</p>
              </div>
            )}

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

            {/* Priority */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Priority
              </label>
              <Badge className={`text-xs ${getPriorityColor(extendedOrder.priority)}`}>
                {extendedOrder.priority}
              </Badge>
            </div>

            {/* Due Date */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Due Date
              </label>
              <p className="text-sm text-foreground">
                {extendedOrder.deliveryDate}
              </p>
            </div>

            {/* Method */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Method
              </label>
              <p className="text-sm text-foreground">{extendedOrder.method}</p>
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

            {/* Product Image */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Product Image
              </label>
              <div className="flex items-start gap-3">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted/30 border">
                  <ImageWithFallback
                    src={extendedOrder.productImage}
                    alt={extendedOrder.product}
                    className="w-full h-full object-cover"
                  />
                </div>
                {extendedOrder.imageCaption && (
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{extendedOrder.imageCaption}</p>
                  </div>
                )}
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