import { useState, useEffect, useMemo } from "react";
import { Bot, Printer, QrCode, ExternalLink, Package, RotateCcw } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { type ShippingAddress } from "../lib/rpc-client";
import { printBarcodeWorkflow } from "../lib/barcode-service";
import { printPackingSlip } from "../lib/packing-slip-service";
import { formatOrderNumber, formatDate } from "../lib/format-utils";
import { BarcodeGenerator } from "./BarcodeGenerator";
import { useSetStorage, useQcReturnToDecorating } from "../hooks/useQueueMutations";
import { useStorageLocations } from "../hooks/useSettingsQueries";
import { useOrderDetail } from "../hooks/useOrderQueries";

// Fallback storage locations if fetch fails or store is undefined
const DEFAULT_STORAGE_LOCATIONS = [
  "Store Fridge",
  "Store Freezer",
  "Kitchen Coolroom",
  "Kitchen Freezer",
  "Basement Coolroom"
];

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
  shopifyOrderId?: number;  // Actual Shopify order ID for admin URLs
  customerName: string;
  product: string;
  size: string;
  quantity: number;
  dueDate: string | null;
  priority: 'High' | 'Medium' | 'Low' | null;
  status: 'In Production' | 'Pending' | 'Quality Check' | 'Completed' | 'Scheduled';
  flavour: string;
  method?: 'Delivery' | 'Pickup';
  storage?: string;
  store: 'bannos' | 'flourlane';
  stage: string;
  // Database fields for order details
  cakeWriting?: string;
  notes?: string;
  productImage?: string | null;
  accessories?: AccessoryItem[] | null;
  shippingAddress?: ShippingAddress | null;  // For packing slip
}

interface StaffOrderDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  order: QueueItem | null;
  onScanBarcode: () => void;
  onOrderCompleted?: (orderId: string) => void;
}

// Extended order data - uses real values from database, no mock overrides
const getExtendedOrderData = (order: QueueItem | null) => {
  if (!order) return null;

  // Use real values from the order, with safe fallbacks
  return {
    ...order,
    // Use real size from database (no mock override)
    size: order.size || '',
    // Use real cake writing from database
    writingOnCake: order.cakeWriting || '',
    // Pass raw accessories for flexible rendering (not pre-formatted strings)
    accessories: order.accessories || [],
    // Use real due date
    deliveryDate: order.dueDate || null,
    // Use real notes from database (null means no notes)
    notes: order.notes || '',
    // Use real product image from database
    productImage: order.productImage || null,
    imageCaption: order.product,
    // Shopify order ID for admin links
    shopifyOrderId: order.shopifyOrderId || null,
    // Shipping address for packing slip
    shippingAddress: order.shippingAddress || null
  };
};

const getPriorityColor = (priority: string | null) => {
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

const mapStageToStatus = (stage: string): 'In Production' | 'Pending' | 'Quality Check' | 'Completed' | 'Scheduled' => {
  switch (stage) {
    case "Filling": return "In Production";
    case "Covering": return "In Production";
    case "Decorating": return "In Production";
    case "Packing": return "Quality Check";
    case "Complete": return "Completed";
    default: return "Pending";
  }
};

export function StaffOrderDetailDrawer({ isOpen, onClose, order, onScanBarcode, onOrderCompleted }: StaffOrderDetailDrawerProps) {
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const [qcIssue, setQcIssue] = useState("None");
  const [qcComments, setQcComments] = useState("");
  const [selectedStorage, setSelectedStorage] = useState("");

  // Use centralized mutation hooks for cache invalidation
  const setStorageMutation = useSetStorage();
  const qcReturnMutation = useQcReturnToDecorating();

  // Fetch storage locations using React Query (with fallback for errors/undefined store)
  const { data: availableStorageLocations = DEFAULT_STORAGE_LOCATIONS, isLoading: storageLoading } = useStorageLocations(order?.store);

  // Fetch order detail using React Query (handles race conditions automatically)
  const { data: fetchedOrder, isLoading: loading, error } = useOrderDetail(
    order?.id,
    order?.store,
    { enabled: isOpen && !!order }
  );

  // Show error toast when fetch fails
  useEffect(() => {
    if (error) {
      console.error('Error fetching order data:', error);
      toast.error('Failed to load order details');
    }
  }, [error]);

  // Map fetched order to UI format, fallback to original order
  const realOrder = useMemo((): QueueItem | null => {
    if (fetchedOrder) {
      return {
        id: fetchedOrder.id,
        orderNumber: fetchedOrder.human_id || String(fetchedOrder.shopify_order_number) || fetchedOrder.id,
        shopifyOrderNumber: String(fetchedOrder.shopify_order_number || ''),
        shopifyOrderId: fetchedOrder.shopify_order_id || undefined,
        customerName: fetchedOrder.customer_name || '',
        product: fetchedOrder.product_title || '',
        size: fetchedOrder.size || '',
        quantity: fetchedOrder.item_qty || 1,
        dueDate: fetchedOrder.due_date || null,
        priority: fetchedOrder.priority,
        status: mapStageToStatus(fetchedOrder.stage),
        flavour: fetchedOrder.flavour || "",
        method: fetchedOrder.delivery_method?.toLowerCase() === "delivery" ? "Delivery" : "Pickup",
        storage: fetchedOrder.storage || "",
        store: fetchedOrder.store || order?.store || 'bannos',
        stage: fetchedOrder.stage || "Filling",
        cakeWriting: fetchedOrder.cake_writing || '',
        notes: fetchedOrder.notes || '',
        productImage: fetchedOrder.product_image || null,
        accessories: fetchedOrder.accessories || null,
        shippingAddress: fetchedOrder.shipping_address || null
      };
    }
    return order || null;
  }, [fetchedOrder, order]);

  const extendedOrder = getExtendedOrderData(realOrder || order);
  const currentStage = realOrder?.stage || order?.stage || "";
  const isPackingStage = currentStage === "Packing";
  const storeName = extendedOrder?.store === "bannos" ? "Bannos" : "Flourlane";

  // Sync selectedStorage with order's current storage when order changes
  useEffect(() => {
    if (extendedOrder?.storage !== undefined) {
      setSelectedStorage(extendedOrder.storage || "");
    }
  }, [extendedOrder?.storage]);

  // Early return after all hooks
  if (!extendedOrder) return null;

  const handleStorageChange = (newStorage: string) => {
    if (!extendedOrder || newStorage === selectedStorage) return;

    setStorageMutation.mutate(
      { orderId: extendedOrder.id, store: extendedOrder.store, storageLocation: newStorage },
      {
        onSuccess: () => {
          setSelectedStorage(newStorage);
          toast.success(`Storage location updated to ${newStorage}`);
        },
        onError: (error) => {
          console.error('Error updating storage location:', error);
          toast.error('Failed to update storage location');
        }
      }
    );
  };

  const handleQCReturn = () => {
    if (qcIssue === "None") {
      toast.error("Please select a QC issue before returning order");
      return;
    }

    const notes = qcComments ? `${qcIssue}: ${qcComments}` : qcIssue;
    qcReturnMutation.mutate(
      { orderId: extendedOrder.id, store: extendedOrder.store, notes },
      {
        onSuccess: () => {
          toast.success(`Order returned to Decorating stage: ${qcIssue}`);
          onClose();
          // Notify parent to refresh workspace (order moved to different stage)
          onOrderCompleted?.(extendedOrder.id);
        },
        onError: (error) => {
          console.error('Failed to return order to decorating:', error);
          toast.error('Failed to return order to decorating stage');
        }
      }
    );
  };

  const handlePrintBarcode = () => {
    setShowPrintConfirm(true);
  };

  const handleBarcodePrint = async () => {
    try {
      // Call print_barcode workflow: logs to stage_events, sets filling_start_ts, triggers browser print
      await printBarcodeWorkflow(
        extendedOrder.store as 'bannos' | 'flourlane',
        extendedOrder.id
      );
      const displayOrderNumber = extendedOrder.shopifyOrderNumber
        ? formatOrderNumber(extendedOrder.shopifyOrderNumber, extendedOrder.store)
        : extendedOrder.orderNumber;
      toast.success(`Barcode printed for ${displayOrderNumber}`);
    } catch (error) {
      console.error('Error printing barcode:', error);
      toast.error("Failed to print barcode");
    }
  };

  const handleBarcodeDownload = () => {
    // BarcodeGenerator handles download automatically
    toast.success("Barcode downloaded");
  };

  const handleViewInShopify = () => {
    const shopifyId = extendedOrder?.shopifyOrderId;
    if (!shopifyId) {
      toast.error("Shopify order ID not available");
      return;
    }
    // Use correct Shopify admin URL format with store slug
    const storeSlug = extendedOrder.store === 'bannos' ? 'bannos' : 'flour-lane';
    window.open(`https://admin.shopify.com/store/${storeSlug}/orders/${shopifyId}`, '_blank');
  };

  const handlePrintPackingSlip = () => {
    try {
      const displayOrderNumber = extendedOrder.shopifyOrderNumber
        ? formatOrderNumber(extendedOrder.shopifyOrderNumber, extendedOrder.store)
        : extendedOrder.orderNumber;
      printPackingSlip({
        orderNumber: displayOrderNumber,
        customerName: extendedOrder.customerName,
        dueDate: extendedOrder.deliveryDate,
        deliveryMethod: extendedOrder.method || 'Pickup',
        product: extendedOrder.product,
        size: extendedOrder.size,
        quantity: extendedOrder.quantity,
        flavour: extendedOrder.flavour,
        cakeWriting: extendedOrder.writingOnCake,
        accessories: extendedOrder.accessories,
        notes: extendedOrder.notes,
        productImage: extendedOrder.productImage,
        shippingAddress: extendedOrder.shippingAddress,
        store: extendedOrder.store
      });
      toast.success("Packing slip opened for printing");
    } catch (error) {
      console.error('Error printing packing slip:', error);
      toast.error("Failed to open packing slip. Check popup blocker settings.");
    }
  };

  const handlePrintCareCard = () => {
    toast.success("Care Card QR sent to printer");
  };

  const handleRunAIQC = () => {
    toast.success("AI QC assistant opened");
  };

  if (showPrintConfirm) {
    return (
      <Dialog open={showPrintConfirm} onOpenChange={setShowPrintConfirm}>
        <DialogContent className="w-[400px] max-w-[90vw] p-6">
          <DialogHeader>
            <DialogTitle>Print Barcode</DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-center py-4">
            <div className="w-full max-w-[320px]">
              <BarcodeGenerator
                orderId={extendedOrder.shopifyOrderNumber
                  ? formatOrderNumber(extendedOrder.shopifyOrderNumber, extendedOrder.store)
                  : extendedOrder.orderNumber}
                productTitle={extendedOrder.product}
                dueDate={extendedOrder.deliveryDate}
                store={extendedOrder.store}
                onPrint={handleBarcodePrint}
                onDownload={handleBarcodeDownload}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
              <Button variant="outline" size="sm" onClick={handlePrintBarcode} disabled={loading}>
                <Printer className="mr-2 h-4 w-4" />
                Print Barcode
              </Button>
            </div>
            <SheetDescription className="sr-only">
              Detailed view of order {extendedOrder.shopifyOrderNumber
                ? formatOrderNumber(extendedOrder.shopifyOrderNumber, extendedOrder.store)
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
                    ? formatOrderNumber(extendedOrder.shopifyOrderNumber, extendedOrder.store)
                    : extendedOrder.orderNumber}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Priority</p>
                  <div className="mt-2">
                    <Badge className={`text-xs ${getPriorityColor(extendedOrder.priority)}`}>
                      {extendedOrder.priority || '-'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Due Date</p>
                  <p className={`mt-2 ${extendedOrder.deliveryDate ? 'text-foreground' : 'text-red-600 font-bold'}`}>
                    {extendedOrder.deliveryDate ? formatDate(extendedOrder.deliveryDate) : 'No due date'}
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
            <div className={`grid gap-4 ${extendedOrder.flavour && extendedOrder.flavour !== "Other" ? "grid-cols-3" : "grid-cols-2"}`}>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Size
                </label>
                <p className="text-sm text-foreground">
                  {extendedOrder.size}
                </p>
              </div>
              {extendedOrder.flavour && extendedOrder.flavour !== "Other" && (
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Flavour
                  </label>
                  <p className="text-sm text-foreground">{extendedOrder.flavour}</p>
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
                  {extendedOrder.accessories.map((acc: AccessoryItem, index: number) => (
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

                {/* Storage Location Section */}
                <div className="border-t border-amber-300 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-amber-600" />
                    <label className="text-sm font-medium text-foreground">
                      Storage Location
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-2">
                      Select where to store this order
                    </label>
                    {storageLoading ? (
                      <div className="p-3 bg-muted/30 rounded-lg border text-center">
                        <span className="text-xs text-muted-foreground">Loading storage locations...</span>
                      </div>
                    ) : (
                      <Select
                        value={selectedStorage || "none"}
                        onValueChange={handleStorageChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select storage location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              <span>No storage assigned</span>
                            </div>
                          </SelectItem>
                          {availableStorageLocations.map((location) => (
                            <SelectItem key={location} value={location}>
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                <span>{location}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {selectedStorage && selectedStorage !== "none" && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                        ✓ Order will be stored in: <strong>{selectedStorage}</strong>
                      </div>
                    )}
                  </div>
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
                    onClick={handleViewInShopify}
                    disabled={loading}
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
                    disabled={loading}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print Packing Slip
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handlePrintCareCard}
                    disabled={loading}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Print Care Card QR
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={onScanBarcode}
                    disabled={loading}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Scan Barcode
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleQCReturn}
                    disabled={loading || qcIssue === "None"}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Return to Decorating
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleViewInShopify}
                  disabled={loading}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View in Shopify
                </Button>
                <Button
                  className="flex-1"
                  onClick={onScanBarcode}
                  disabled={loading}
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
