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
import { formatOrderNumber } from "../lib/format-utils";

interface AccessoryItem {
  title: string;
  quantity: number;
  price: string;
  variant_title?: string | null;
}

interface QueueItem {
  id: string;
  orderNumber: string;
  shopifyOrderNumber: string;
  customerName: string;
  product: string;
  size: string; // Real sizes from database (e.g., "Medium", "Large", "Small Tall")
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
  // Database fields for order details
  cakeWriting?: string;
  notes?: string;
  productImage?: string | null;
  accessories?: AccessoryItem[] | null;
}

interface OrderDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  order: QueueItem | null;
  store: "bannos" | "flourlane";
}

// Extended order data - uses real values from database, no mock overrides
const getExtendedOrderData = (order: QueueItem | null, _store: "bannos" | "flourlane") => {
  if (!order) return null;
  
  // Use real values from the order, with safe fallbacks
  return {
    ...order,
    // Use real size from database (no mock override)
    size: order.size || 'Unknown',
    // Use real cake writing from database
    writingOnCake: order.cakeWriting || '',
    // Pass raw accessories for flexible rendering (not pre-formatted strings)
    accessories: order.accessories || [],
    // Use real due date
    deliveryDate: order.dueTime || order.deliveryTime || new Date().toISOString().split('T')[0],
    // Use real notes from database (null means no notes)
    notes: order.notes || '',
    // Use real product image from database
    productImage: order.productImage || null,
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
          shopifyOrderNumber: String(foundOrder.shopify_order_number || ''),
          customerName: foundOrder.customer_name || "Unknown Customer",
          product: foundOrder.product_title || "Unknown Product",
          size: foundOrder.size || "Unknown",
          quantity: foundOrder.item_qty || 1,
          deliveryTime: foundOrder.due_date || new Date().toISOString(),
          priority: foundOrder.priority === 1 ? "High" : foundOrder.priority === 0 ? "Medium" : "Low",
          status: mapStageToStatus(foundOrder.stage),
          flavor: foundOrder.flavour || "",
          dueTime: foundOrder.due_date || new Date().toISOString(),
          // Fix case-insensitive check for delivery_method
          method: foundOrder.delivery_method?.toLowerCase() === "delivery" ? "Delivery" : "Pickup",
          storage: foundOrder.storage || "Default",
          store: foundOrder.store || store,
          stage: foundOrder.stage || "Filling",
          // Add real data from database
          cakeWriting: foundOrder.cake_writing || '',
          notes: foundOrder.notes || '',
          productImage: foundOrder.product_image || null,
          accessories: foundOrder.accessories || null
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
  const currentStage = (realOrder?.stage || order?.stage || "").toLowerCase();
  const isPackingStage = currentStage === "packing";
  const storeName = store === "bannos" ? "Bannos" : "Flourlane";
  
  if (!extendedOrder) return null;

  const handleViewDetails = () => {
    const id = extendedOrder?.shopifyOrderNumber?.trim();
    if (!id) {
      toast.error("Shopify order number not available");
      return;
    }
    window.open(`https://admin.shopify.com/orders/${encodeURIComponent(id)}`, '_blank');
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
              Detailed view of order {extendedOrder.shopifyOrderNumber
                ? formatOrderNumber(extendedOrder.shopifyOrderNumber, store)
                : extendedOrder.orderNumber} for {extendedOrder.customerName}
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
                  <span className="font-medium text-foreground">Order:</span> {extendedOrder.shopifyOrderNumber
                    ? formatOrderNumber(extendedOrder.shopifyOrderNumber, store)
                    : extendedOrder.orderNumber}
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

            {/* Size + Flavour + Quantity (cake details together) */}
            <div className={`grid gap-4 ${extendedOrder.flavor && extendedOrder.flavor !== "Other" ? "grid-cols-3" : "grid-cols-2"}`}>
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
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Quantity
                </label>
                <p className="text-sm text-foreground">{extendedOrder.quantity}</p>
              </div>
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

            {/* Accessories - list format with per-item quantities */}
            {extendedOrder.accessories && extendedOrder.accessories.length > 0 && (
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Accessories
                </label>
                <div className="p-3 bg-muted/30 rounded-lg border space-y-2">
                  {extendedOrder.accessories.map((acc, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">
                        {acc.title}
                        {acc.variant_title && (
                          <span className="text-muted-foreground ml-1">#{acc.variant_title}</span>
                        )}
                      </span>
                      <span className="text-muted-foreground font-medium">× {acc.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
            {isPackingStage && (
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
            {isPackingStage ? (
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