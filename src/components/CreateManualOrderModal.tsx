import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "./ui/utils";
import { createManualOrder } from "../lib/rpc-client";
import type { Store } from "../types/db";

interface CreateManualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
  onCreated?: () => void;
}

interface FormData {
  customerName: string;
  orderNumber: string;
  store: string;
  deliveryDate: Date | undefined;
  productTitle: string;
  cakeSize: string;
  flavor: string;
  writingOnCake: string;
  imageUrl: string;
  orderNotes: string;
}

const initialFormData: FormData = {
  customerName: "",
  orderNumber: "",
  store: "",
  deliveryDate: undefined,
  productTitle: "",
  cakeSize: "",
  flavor: "",
  writingOnCake: "",
  imageUrl: "",
  orderNotes: "",
};

export function CreateManualOrderModal({
  isOpen,
  onClose,
  store,
  onCreated,
}: CreateManualOrderModalProps) {
  const [formData, setFormData] = useState<FormData>({
    ...initialFormData,
    store: store,
  });
  const [loading, setLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.customerName.trim()) return "Customer name is required";
    if (!formData.orderNumber.trim()) return "Order number is required";
    if (!formData.store.trim()) return "Store is required";
    if (!formData.deliveryDate) return "Delivery date is required";
    if (!formData.productTitle.trim()) return "Product title is required";
    if (!formData.cakeSize.trim()) return "Cake size is required";
    if (!formData.flavor.trim()) return "Flavor is required";

    // Validate order number format (B or F followed by digits)
    const orderNum = formData.orderNumber.trim().toUpperCase();
    if (!/^[BF]\d+$/.test(orderNum)) {
      return "Order number must be in format B12345 (Bannos) or F12345 (Flourlane)";
    }

    // Validate store matches order number prefix
    const storeInput = formData.store.trim().toLowerCase();
    if (storeInput !== "bannos" && storeInput !== "flourlane") {
      return "Store must be 'bannos' or 'flourlane'";
    }

    const expectedPrefix = storeInput === "bannos" ? "B" : "F";
    if (!orderNum.startsWith(expectedPrefix)) {
      return `Order number should start with '${expectedPrefix}' for ${storeInput}`;
    }

    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      setLoading(true);

      const storeValue = formData.store.trim().toLowerCase() as Store;
      const orderNumber = formData.orderNumber.trim().toUpperCase();

      await createManualOrder({
        store: storeValue,
        order_number: orderNumber,
        customer_name: formData.customerName.trim(),
        product_title: formData.productTitle.trim(),
        size: formData.cakeSize.trim(),
        flavour: formData.flavor.trim(),
        due_date: formData.deliveryDate!.toISOString().split("T")[0],
        writing_on_cake: formData.writingOnCake.trim() || null,
        image_url: formData.imageUrl.trim() || null,
        notes: formData.orderNotes.trim() || null,
      });

      toast.success(`Manual order ${orderNumber} created successfully`);
      handleClose();
      onCreated?.();
    } catch (err) {
      console.error("Error creating manual order:", err);
      toast.error("Failed to create manual order");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ ...initialFormData, store: store });
    setCalendarOpen(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create Manual Order
          </DialogTitle>
          <DialogDescription>
            Add a custom order for weddings, events, deposits, or internal testing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Row 1: Customer Name & Order Number */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">
                Customer Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => updateField("customerName", e.target.value)}
                placeholder="Enter customer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderNumber">
                Order Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="orderNumber"
                value={formData.orderNumber}
                onChange={(e) => updateField("orderNumber", e.target.value.toUpperCase())}
                placeholder="B20655 or F10302"
              />
              <p className="text-xs text-muted-foreground">
                Format: B12345 for Bannos, F12345 for Flourlane
              </p>
            </div>
          </div>

          {/* Row 2: Store & Delivery Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store">
                Store <span className="text-red-500">*</span>
              </Label>
              <Input
                id="store"
                value={formData.store}
                onChange={(e) => updateField("store", e.target.value.toLowerCase())}
                placeholder="bannos or flourlane"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Delivery Date <span className="text-red-500">*</span>
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.deliveryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.deliveryDate
                      ? format(formData.deliveryDate, "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.deliveryDate}
                    onSelect={(date) => {
                      updateField("deliveryDate", date);
                      setCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Row 3: Product Title */}
          <div className="space-y-2">
            <Label htmlFor="productTitle">
              Product Title / Description <span className="text-red-500">*</span>
            </Label>
            <Input
              id="productTitle"
              value={formData.productTitle}
              onChange={(e) => updateField("productTitle", e.target.value)}
              placeholder="e.g., Custom Wedding Cake, Birthday Cake..."
            />
          </div>

          {/* Row 4: Cake Size & Flavor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cakeSize">
                Cake Size <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cakeSize"
                value={formData.cakeSize}
                onChange={(e) => updateField("cakeSize", e.target.value)}
                placeholder="e.g., 6 inch, 8 inch round, 3-tier, Quarter sheet"
              />
              <p className="text-xs text-muted-foreground">
                Enter custom size description for the cake
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="flavor">
                Flavor <span className="text-red-500">*</span>
              </Label>
              <Input
                id="flavor"
                value={formData.flavor}
                onChange={(e) => updateField("flavor", e.target.value)}
                placeholder="e.g., Choc with White Choc Ganache"
              />
              <p className="text-xs text-muted-foreground">
                Can be detailed flavor combinations
              </p>
            </div>
          </div>

          {/* Row 5: Writing on Cake */}
          <div className="space-y-2">
            <Label htmlFor="writingOnCake">Writing on Cake</Label>
            <Input
              id="writingOnCake"
              value={formData.writingOnCake}
              onChange={(e) => updateField("writingOnCake", e.target.value)}
              placeholder="e.g., Happy Birthday John"
            />
          </div>

          {/* Row 6: Image URL */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              value={formData.imageUrl}
              onChange={(e) => updateField("imageUrl", e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            <p className="text-xs text-muted-foreground">
              Optional reference image for the order
            </p>
          </div>

          {/* Row 7: Order Notes */}
          <div className="space-y-2">
            <Label htmlFor="orderNotes">Order Notes</Label>
            <Textarea
              id="orderNotes"
              value={formData.orderNotes}
              onChange={(e) => updateField("orderNotes", e.target.value)}
              placeholder="Special instructions, dietary requirements, etc."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              "Create Order"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
