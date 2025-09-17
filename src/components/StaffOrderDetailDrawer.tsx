import { useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { Separator } from "./ui/separator";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Printer, QrCode, ExternalLink, Bot } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";

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

interface StaffOrderDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  order: QueueItem | null;
  onScanBarcode: () => void;
}

// Sample extended order data for staff view
const getExtendedOrderData = (order: QueueItem | null) => {
  if (!order) return null;
  
  return {
    ...order,
    writingOnCake: order.id.includes("003") || order.id.includes("C03") 
      ? "Happy Birthday Sarah! Love, Mom & Dad" 
      : order.id.includes("015") || order.id.includes("C01")
      ? "Congratulations on your Wedding!"
      : "",
    deliveryDate: "2024-12-03",
    notes: order.priority === "High" 
      ? "Customer requested early morning pickup. Handle with extra care - VIP client."
      : order.method === "Delivery"
      ? "Standard delivery. Contact customer 30 mins before arrival."
      : "Customer will pickup. Ensure order is ready at specified time.",
    productImage: order.store === "bannos" 
      ? "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop"
      : "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
  };
};

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

const getStoreColor = (store: string) => {
  return store === 'bannos' 
    ? 'bg-blue-100 text-blue-700 border-blue-200' 
    : 'bg-pink-100 text-pink-700 border-pink-200';
};

export function StaffOrderDetailDrawer({ isOpen, onClose, order, onScanBarcode }: StaffOrderDetailDrawerProps) {
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const [qcIssue, setQcIssue] = useState("None");
  const [qcComments, setQcComments] = useState("");
  const extendedOrder = getExtendedOrderData(order);
  
  if (!extendedOrder) return null;

  const storeName = extendedOrder.store === "bannos" ? "Bannos" : "Flourlane";

  const handlePrintBarcode = () => {
    setShowPrintConfirm(true);
  };

  const confirmPrint = () => {
    setShowPrintConfirm(false);
    toast.success("Barcode sent to printer");
  };

  const handleViewInShopify = () => {
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

  if (showPrintConfirm) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-[480px] p-0">
          <div className="h-full flex flex-col items-center justify-center p-6 space-y-6">
            <div className="text-center space-y-2">
              <Printer className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-medium">Print Barcode</h3>
              <p className="text-sm text-muted-foreground">
                Print barcode for Order #{extendedOrder.orderNumber}?
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={confirmPrint}>Print</Button>
              <Button variant="outline" onClick={() => setShowPrintConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[480px] p-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-lg font-medium text-foreground">
                  {extendedOrder.orderNumber}
                </SheetTitle>
                <p className="text-sm text-muted-foreground">{extendedOrder.customerName}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handlePrintBarcode}>
                <Printer className="mr-2 h-4 w-4" />
                Print Barcode
              </Button>
            </div>
            <SheetDescription className="sr-only">
              Order details for {extendedOrder.orderNumber}
            </SheetDescription>
          </SheetHeader>

          <Separator className="my-4" />

          {/* Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Product Image */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Product Image
              </label>
              <div className="w-full h-48 rounded-lg overflow-hidden bg-muted/30 border">
                <ImageWithFallback
                  src={extendedOrder.productImage}
                  alt={extendedOrder.product}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Store */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Store
                </label>
                <Badge className={`text-xs ${getStoreColor(extendedOrder.store)}`}>
                  {storeName}
                </Badge>
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
            </div>

            {/* Product Title */}
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
                {getRealisticSize(extendedOrder.size, extendedOrder.product, extendedOrder.store)}
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

            {/* Quantity */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Quantity
              </label>
              <p className="text-sm text-foreground">{extendedOrder.quantity}</p>
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
            {extendedOrder.stage === "packing" && (
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
            {extendedOrder.stage === "packing" ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleViewInShopify}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
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
                    onClick={onScanBarcode}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Scan Barcode
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleViewInShopify}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View in Shopify
                </Button>
                <Button
                  className="flex-1"
                  onClick={onScanBarcode}
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Scan Barcode
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}