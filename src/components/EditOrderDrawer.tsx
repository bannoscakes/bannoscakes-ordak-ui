import { useState, useEffect, useMemo, useCallback } from "react";
import { X, RotateCcw, Upload, Trash2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { toast } from "sonner";
import { updateOrderCore } from "../lib/rpc-client";
import { formatOrderNumber, formatDate as formatDateDisplay } from "../lib/format-utils";
import type { QueueItem } from "../types/queue";

// Map internal store name to Shopify store slug
const SHOPIFY_STORE_SLUGS: Record<string, string> = {
  bannos: 'bannos',
  flourlane: 'flour-lane',
};

interface EditOrderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedOrder: QueueItem) => void;
  order: QueueItem | null;
  store: "bannos" | "flourlane";
}

interface FormData {
  product: string;
  dueDate: string | null;
  method: 'Delivery' | 'Pickup';
  size: string;
  flavour: string;
  priority: 'High' | 'Medium' | 'Low';
  storage: string;
  writingOnCake: string;
  accessories: string[];
  notes: string;
  photos: File[];
}

interface DirtyFields {
  [key: string]: boolean;
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
};

const parseDate = (dateStr: string) => {
  return new Date(dateStr + 'T00:00:00');
};

// Calculate priority based on due date (same logic as database)
const calculatePriority = (dueDate: string): 'High' | 'Medium' | 'Low' => {
  const today = new Date();
  const due = new Date(dueDate);
  const deltaDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (deltaDays <= 1) return 'High';     // today/overdue/tomorrow
  if (deltaDays <= 3) return 'Medium';   // within 3 days
  return 'Low';                          // more than 3 days
};

const getPriorityColor = (priority: string) => {
  const colors = {
    "High": "bg-red-100 text-red-700 border-red-200",
    "Medium": "bg-yellow-100 text-yellow-700 border-yellow-200",
    "Low": "bg-green-100 text-green-700 border-green-200"
  };
  return colors[priority as keyof typeof colors] || "bg-gray-100 text-gray-700";
};

export function EditOrderDrawer({ isOpen, onClose, onSaved, order, store }: EditOrderDrawerProps) {
  const normalizedOrder = useMemo(() => {
    if (!order) return null;
    // Map AccessoryItem[] to string[] for form display (extract titles)
    const accessoryStrings = (order.accessories || []).map(acc =>
      typeof acc === 'string' ? acc : acc.title
    );
    return {
      ...order,
      deliveryDate: order.dueDate || "",
      writingOnCake: order.writingOnCake || "",
      accessories: accessoryStrings,
      notes: order.notes || "",
    };
  }, [order]);
  const storeName = store === "bannos" ? "Bannos" : "Flourlane";
  
  const [formData, setFormData] = useState<FormData>({
    product: "",
    dueDate: "",
    method: "Pickup",
    size: "",
    flavour: "",
    priority: "Medium",
    storage: "",
    writingOnCake: "",
    accessories: [],
    notes: "",
    photos: []
  });

  const [originalData, setOriginalData] = useState<FormData>({
    product: "",
    dueDate: "",
    method: "Pickup",
    size: "",
    flavour: "",
    priority: "Medium",
    storage: "",
    writingOnCake: "",
    accessories: [],
    notes: "",
    photos: []
  });

  const [dirtyFields, setDirtyFields] = useState<DirtyFields>({});
  const [newAccessory, setNewAccessory] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Calculate hasChanges from dirtyFields
  const hasChanges = Object.values(dirtyFields).some(Boolean);

  // Initialize form data when order changes
  useEffect(() => {
    if (normalizedOrder) {
      const initialData: FormData = {
        product: normalizedOrder.product,
        dueDate: normalizedOrder.deliveryDate ? formatDate(normalizedOrder.deliveryDate) : null,
        method: normalizedOrder.method || "Pickup",
        size: normalizedOrder.size,
        flavour: normalizedOrder.flavour === "Other" ? "" : normalizedOrder.flavour,
        // Form needs a priority value - calculate from date or default to 'Low' when missing
        priority: normalizedOrder.priority ?? (normalizedOrder.deliveryDate ? calculatePriority(normalizedOrder.deliveryDate) : 'Low'),
        storage: normalizedOrder.storage || "",
        writingOnCake: normalizedOrder.writingOnCake || "",
        accessories: [...normalizedOrder.accessories],
        notes: normalizedOrder.notes || "",
        photos: []
      };
      setFormData(initialData);
      setOriginalData({ ...initialData });
      setDirtyFields({});
    }
  }, [normalizedOrder]);

  // Memoize the onClose callback to prevent dependency changes
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !hasChanges) {
      onClose();
    }
  }, [hasChanges, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const updateField = useCallback((field: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Check if field is dirty
    const isDirty = JSON.stringify(originalData[field]) !== JSON.stringify(value);
    setDirtyFields(prev => ({ ...prev, [field]: isDirty }));
  }, [originalData]);

  const resetField = useCallback((field: keyof FormData) => {
    const originalValue = originalData[field];
    setFormData(prev => ({ ...prev, [field]: originalValue }));
    setDirtyFields(prev => ({ ...prev, [field]: false }));
  }, [originalData]);

  const handleSave = useCallback(async () => {
    if (!formData.dueDate) {
      toast.error("Due Date is required");
      return;
    }

    if (!normalizedOrder) return;

    try {
      setSaving(true);
      
      // Update order in database
      await updateOrderCore(normalizedOrder.id, store, {
        product_title: formData.product,
        size: formData.size,
        delivery_method: formData.method.toLowerCase(),
        flavour: formData.flavour || "Other",
        storage: formData.storage,
        due_date: formData.dueDate,
        notes: formData.writingOnCake || undefined,
      });

      // Create updated order for UI (restore original accessories format)
      // order is guaranteed to be non-null here since normalizedOrder check passed
      const updatedOrder: QueueItem = {
        ...order!,
        product: formData.product,
        size: formData.size,
        priority: calculatePriority(formData.dueDate),
        method: formData.method,
        flavour: formData.flavour || "Other",
        storage: formData.storage,
        dueDate: formData.dueDate,
      };

      toast.success("Changes saved successfully");
      onSaved(updatedOrder);
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }, [formData, normalizedOrder, onSaved, store]);

  const handleCancel = useCallback(() => {
    if (hasChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to cancel?")) {
        setFormData({ ...originalData });
        setDirtyFields({});
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasChanges, originalData, onClose]);

  const addAccessory = useCallback(() => {
    if (newAccessory.trim()) {
      const newAccessories = [...formData.accessories, newAccessory.trim()];
      updateField('accessories', newAccessories);
      setNewAccessory("");
    }
  }, [newAccessory, formData.accessories, updateField]);

  const removeAccessory = useCallback((index: number) => {
    const newAccessories = formData.accessories.filter((_, i) => i !== index);
    updateField('accessories', newAccessories);
  }, [formData.accessories, updateField]);

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => 
      ['image/jpeg', 'image/png', 'image/heic'].includes(file.type)
    ).slice(0, 3 - formData.photos.length);
    
    if (validFiles.length > 0) {
      updateField('photos', [...formData.photos, ...validFiles]);
    }
  }, [formData.photos, updateField]);

  const removePhoto = useCallback((index: number) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    updateField('photos', newPhotos);
  }, [formData.photos, updateField]);

  // Early return after all hooks are called
  if (!normalizedOrder) return null;

  return (
    <Sheet open={isOpen} onOpenChange={handleCancel}>
      <SheetContent className="!w-[540px] max-w-full sm:!max-w-[540px] p-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-medium text-foreground">
                Edit Order
              </SheetTitle>
            </div>
            <SheetDescription className="sr-only">
              Edit order {normalizedOrder.shopifyOrderNumber
                ? formatOrderNumber(normalizedOrder.shopifyOrderNumber, store, normalizedOrder.id)
                : normalizedOrder.orderNumber} for {normalizedOrder.customerName}
            </SheetDescription>
          </SheetHeader>

          {/* Subheader */}
          <div className="px-6 pt-4 pb-6 space-y-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Customer:</span> {normalizedOrder.customerName}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Store:</span> {storeName}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Order:</span> {normalizedOrder.shopifyOrderNumber
                ? formatOrderNumber(normalizedOrder.shopifyOrderNumber, store, normalizedOrder.id)
                : normalizedOrder.orderNumber}
            </p>
          </div>

          <Separator />

          {/* Body - Scrollable Form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Product */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-foreground">
                  Product *
                </label>
                {dirtyFields.product && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0"
                    onClick={() => resetField('product')}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Input
                value={formData.product}
                onChange={(e) => updateField('product', e.target.value)}
                placeholder="Enter product name..."
                className={dirtyFields.product ? 'border-orange-300 bg-orange-50' : ''}
              />
            </div>

            {/* Size */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-foreground">
                  Size *
                </label>
                {dirtyFields.size && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0"
                    onClick={() => resetField('size')}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Input
                value={formData.size}
                onChange={(e) => updateField('size', e.target.value)}
                placeholder="Enter size..."
                className={dirtyFields.size ? 'border-orange-300 bg-orange-50' : ''}
              />
            </div>

            {/* Due Date */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-foreground">
                  Due Date *
                </label>
                {dirtyFields.dueDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0"
                    onClick={() => resetField('dueDate')}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      dirtyFields.dueDate ? 'border-orange-300 bg-orange-50' : ''
                    }`}
                  >
                    {formData.dueDate ? formatDateDisplay(formData.dueDate) : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate ? parseDate(formData.dueDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        updateField('dueDate', formatDate(date.toISOString()));
                        setIsCalendarOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Method */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-foreground">
                  Method
                </label>
                {dirtyFields.method && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0"
                    onClick={() => resetField('method')}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Select value={formData.method} onValueChange={(value: 'Delivery' | 'Pickup') => updateField('method', value)}>
                <SelectTrigger className={dirtyFields.method ? 'border-orange-300 bg-orange-50' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Delivery">Delivery</SelectItem>
                  <SelectItem value="Pickup">Pickup</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Flavour */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-foreground">
                  Flavour
                </label>
                {dirtyFields.flavour && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0"
                    onClick={() => resetField('flavour')}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Input
                value={formData.flavour}
                onChange={(e) => updateField('flavour', e.target.value)}
                placeholder="Enter flavour..."
                className={dirtyFields.flavour ? 'border-orange-300 bg-orange-50' : ''}
              />
            </div>

            {/* Priority - Auto-calculated from due date */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Priority (Auto-calculated from due date)
              </label>
              <div className="p-3 bg-muted/30 rounded-lg border">
                <Badge className={`text-xs ${formData.dueDate ? getPriorityColor(calculatePriority(formData.dueDate)) : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                  {formData.dueDate ? calculatePriority(formData.dueDate) : '-'}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  Priority is automatically calculated based on due date:
                  <br />• High: Today, overdue, or tomorrow
                  <br />• Medium: Within 3 days
                  <br />• Low: More than 3 days
                </p>
              </div>
            </div>

            {/* Storage */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-foreground">
                  Storage
                </label>
                {dirtyFields.storage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0"
                    onClick={() => resetField('storage')}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Select value={formData.storage || "none"} onValueChange={(value) => updateField('storage', value === "none" ? "" : value)}>
                <SelectTrigger className={dirtyFields.storage ? 'border-orange-300 bg-orange-50' : ''}>
                  <SelectValue placeholder="Select storage location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No storage assigned</SelectItem>
                  <SelectItem value="Store Fridge">Store Fridge</SelectItem>
                  <SelectItem value="Store Freezer">Store Freezer</SelectItem>
                  <SelectItem value="Kitchen Coolroom">Kitchen Coolroom</SelectItem>
                  <SelectItem value="Kitchen Freezer">Kitchen Freezer</SelectItem>
                  <SelectItem value="Basement Coolroom">Basement Coolroom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Writing on Cake */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-foreground">
                  Writing on Cake
                </label>
                {dirtyFields.writingOnCake && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0"
                    onClick={() => resetField('writingOnCake')}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Textarea
                value={formData.writingOnCake}
                onChange={(e) => updateField('writingOnCake', e.target.value)}
                placeholder="Enter text for cake decoration..."
                className={`min-h-[80px] ${dirtyFields.writingOnCake ? 'border-orange-300 bg-orange-50' : ''}`}
              />
            </div>

            {/* Accessories */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-foreground">
                  Accessories
                </label>
                {dirtyFields.accessories && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0"
                    onClick={() => resetField('accessories')}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newAccessory}
                    onChange={(e) => setNewAccessory(e.target.value)}
                    placeholder="Add accessory..."
                    onKeyDown={(e) => e.key === 'Enter' && addAccessory()}
                    className="flex-1"
                  />
                  <Button onClick={addAccessory} size="sm" variant="outline">
                    Add
                  </Button>
                </div>
                {formData.accessories.length > 0 && (
                  <div className={`flex flex-wrap gap-3 p-3 rounded-lg border ${
                    dirtyFields.accessories ? 'border-orange-300 bg-orange-50' : 'bg-muted/30'
                  }`}>
                    {formData.accessories.map((accessory, index) => (
                      <div key={index} className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {accessory}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-10 w-10 p-0"
                          onClick={() => removeAccessory(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-foreground">
                  Notes
                </label>
                {dirtyFields.notes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0"
                    onClick={() => resetField('notes')}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Textarea
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Additional notes or special instructions..."
                className={`min-h-[80px] ${dirtyFields.notes ? 'border-orange-300 bg-orange-50' : ''}`}
              />
            </div>

            {/* Upload Photos */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-foreground">
                  Upload Photos
                </label>
                <span className="text-xs text-muted-foreground">(1-3 photos, JPG/PNG/HEIC)</span>
                {dirtyFields.photos && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0"
                    onClick={() => resetField('photos')}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {formData.photos.length < 3 && (
                  <div>
                    <input
                      type="file"
                      id="photo-upload"
                      multiple
                      accept=".jpg,.jpeg,.png,.heic"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Photos
                    </Button>
                  </div>
                )}
                {formData.photos.length > 0 && (
                  <div className={`flex flex-wrap gap-2 p-3 rounded-lg border ${
                    dirtyFields.photos ? 'border-orange-300 bg-orange-50' : 'bg-muted/30'
                  }`}>
                    {formData.photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted border">
                          <ImageWithFallback
                            src={URL.createObjectURL(photo)}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute -top-4 -right-4 h-10 w-10 p-0"
                          onClick={() => removePhoto(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Footer */}
          <div className="p-6 space-y-3">
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || !formData.dueDate || !formData.product || !formData.size || saving}
                className="flex-1"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const storeSlug = SHOPIFY_STORE_SLUGS[store];
                if (!storeSlug) {
                  toast.error("Unknown store");
                  return;
                }
                
                // Prefer shopifyOrderId (direct link), fall back to shopifyOrderNumber (search)
                const shopifyId = normalizedOrder.shopifyOrderId;
                if (shopifyId) {
                  window.open(`https://admin.shopify.com/store/${storeSlug}/orders/${shopifyId}`, '_blank');
                  return;
                }
                
                // Fallback: use order number with search query
                const orderNumber = normalizedOrder.shopifyOrderNumber?.trim();
                if (orderNumber) {
                  window.open(`https://admin.shopify.com/store/${storeSlug}/orders?query=${encodeURIComponent(orderNumber)}`, '_blank');
                  return;
                }
                
                toast.error("No Shopify order information available");
              }}
            >
              View Details in Shopify
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}