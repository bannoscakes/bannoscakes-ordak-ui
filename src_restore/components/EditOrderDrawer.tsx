// @ts-nocheck
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
import { ProductCombobox } from "./ProductCombobox";
import { Product, findProductByTitle, convertLegacySizeToVariant } from "./ProductData";
import { toast } from "sonner";

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
}

interface EditOrderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedOrder: QueueItem) => void;
  order: QueueItem | null;
  store: "bannos" | "flourlane";
}

interface FormData {
  product: string;
  dueDate: string;
  method: 'Delivery' | 'Pickup';
  size: string;
  flavor: string;
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

// Sample extended order data
const getExtendedOrderData = (order: QueueItem | null) => {
  if (!order) return null;
  
  return {
    ...order,
    writingOnCake: order.id.includes("003") || order.id.includes("C03") 
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
  };
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
};

const parseDate = (dateStr: string) => {
  return new Date(dateStr + 'T00:00:00');
};

export function EditOrderDrawer({ isOpen, onClose, onSaved, order, store }: EditOrderDrawerProps) {
  // Memoize extendedOrder to prevent infinite re-renders
  const extendedOrder = useMemo(() => getExtendedOrderData(order), [order]);
  const storeName = store === "bannos" ? "Bannos" : "Flourlane";
  
  const [formData, setFormData] = useState<FormData>({
    product: "",
    dueDate: "",
    method: "Pickup",
    size: "",
    flavor: "",
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
    flavor: "",
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
  const [sizeRequiresConfirmation, setSizeRequiresConfirmation] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

  // Calculate hasChanges from dirtyFields
  const hasChanges = Object.values(dirtyFields).some(Boolean);

  // Initialize form data when order changes
  useEffect(() => {
    if (extendedOrder) {
      // Find the current product
      const product = findProductByTitle(extendedOrder.product, store);
      setCurrentProduct(product);
      
      // Convert legacy size to variant if possible
      const initialSize = product && product.variants 
        ? convertLegacySizeToVariant(extendedOrder.size, product)
        : extendedOrder.size;
      
      const initialData: FormData = {
        product: extendedOrder.product,
        dueDate: formatDate(extendedOrder.deliveryDate),
        method: extendedOrder.method || "Pickup",
        size: initialSize,
        flavor: extendedOrder.flavor === "Other" ? "" : extendedOrder.flavor,
        priority: extendedOrder.priority,
        storage: extendedOrder.storage || "",
        writingOnCake: extendedOrder.writingOnCake || "",
        accessories: [...extendedOrder.accessories],
        notes: extendedOrder.notes || "",
        photos: []
      };
      setFormData(initialData);
      setOriginalData({ ...initialData });
      setDirtyFields({});
      setSizeRequiresConfirmation(false);
    }
  }, [extendedOrder, store]);

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

  const updateField = useCallback((field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Check if field is dirty
    const isDirty = JSON.stringify(originalData[field]) !== JSON.stringify(value);
    setDirtyFields(prev => ({ ...prev, [field]: isDirty }));
    
    // Handle size confirmation when changing non-size fields
    if (field !== 'size' && sizeRequiresConfirmation) {
      setSizeRequiresConfirmation(false);
    }
  }, [originalData, sizeRequiresConfirmation]);

  const resetField = useCallback((field: keyof FormData) => {
    const originalValue = originalData[field];
    setFormData(prev => ({ ...prev, [field]: originalValue }));
    setDirtyFields(prev => ({ ...prev, [field]: false }));
  }, [originalData]);

  const handleSave = useCallback(() => {
    if (!formData.dueDate) {
      toast.error("Due Date is required");
      return;
    }

    if (!extendedOrder) return;

    // Simulate saving changes
    const updatedOrder = {
      ...extendedOrder,
      product: formData.product,
      size: formData.size,
      priority: formData.priority,
      method: formData.method,
      flavor: formData.flavor || "Other",
      storage: formData.storage,
      deliveryDate: formData.dueDate,
    };

    toast.success("Changes saved");
    onSaved(updatedOrder);
  }, [formData, extendedOrder, onSaved]);

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

  // Handle product change
  const handleProductChange = useCallback((product: Product) => {
    const previousProduct = currentProduct;
    setCurrentProduct(product);
    updateField('product', product.title);
    
    // Check if current size is valid for new product
    if (previousProduct && previousProduct.id !== product.id) {
      const currentSize = formData.size;
      let sizeIsValid = false;
      
      if (product.variants) {
        // Check if current size matches any variant
        sizeIsValid = product.variants.some(variant => 
          variant.title === currentSize || variant.id === currentSize
        );
      } else {
        // For custom size products, any size is valid
        sizeIsValid = true;
      }
      
      if (!sizeIsValid && currentSize) {
        setSizeRequiresConfirmation(true);
      }
    }
  }, [currentProduct, formData.size, updateField]);

  // Handle size change (also clears confirmation state)
  const handleSizeChange = useCallback((size: string) => {
    updateField('size', size);
    setSizeRequiresConfirmation(false);
  }, [updateField]);

  // Early return after all hooks are called
  if (!extendedOrder) return null;

  return (
    <Sheet open={isOpen} onOpenChange={handleCancel}>
      <SheetContent className="w-[480px] p-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-medium text-foreground">
                Edit Order
              </SheetTitle>
            </div>
            <SheetDescription className="sr-only">
              Edit order {extendedOrder.orderNumber} for {extendedOrder.customerName}
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
                    className="h-5 w-5 p-0"
                    onClick={() => resetField('product')}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <ProductCombobox
                store={store}
                value={formData.product}
                onValueChange={handleProductChange}
                isDirty={dirtyFields.product}
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
                    className="h-5 w-5 p-0"
                    onClick={() => resetField('size')}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              {currentProduct?.variants ? (
                // Show dropdown for products with variants
                <Select value={formData.size} onValueChange={handleSizeChange}>
                  <SelectTrigger className={`${
                    dirtyFields.size ? 'border-orange-300 bg-orange-50' : ''
                  } ${
                    sizeRequiresConfirmation ? 'border-red-300 bg-red-50' : ''
                  }`}>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentProduct.variants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.title} disabled={!variant.available}>
                        {variant.title}
                        {!variant.available && " (Unavailable)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                // Show input for custom size products or when no variants
                <div className="space-y-2">
                  <Input
                    value={formData.size}
                    onChange={(e) => handleSizeChange(e.target.value)}
                    placeholder="Enter custom size..."
                    className={`${
                      dirtyFields.size ? 'border-orange-300 bg-orange-50' : ''
                    } ${
                      sizeRequiresConfirmation ? 'border-red-300 bg-red-50' : ''
                    }`}
                  />
                  {currentProduct?.allowCustomSize && (
                    <p className="text-xs text-muted-foreground">
                      This product allows custom sizing
                    </p>
                  )}
                </div>
              )}
              
              {sizeRequiresConfirmation && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  Size "{formData.size}" is not available for this product. Please select a new size.
                </div>
              )}
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
                    className="h-5 w-5 p-0"
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
                    {formData.dueDate ? formData.dueDate : "Select date"}
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
                    className="h-5 w-5 p-0"
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
            {store === "bannos" && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium text-foreground">
                    Flavour
                  </label>
                  {dirtyFields.flavor && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => resetField('flavor')}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Select value={formData.flavor || "none"} onValueChange={(value) => updateField('flavor', value === "none" ? "" : value)}>
                  <SelectTrigger className={dirtyFields.flavor ? 'border-orange-300 bg-orange-50' : ''}>
                    <SelectValue placeholder="Select flavour" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific flavour</SelectItem>
                    <SelectItem value="Vanilla">Vanilla</SelectItem>
                    <SelectItem value="Chocolate">Chocolate</SelectItem>
                    <SelectItem value="Strawberry">Strawberry</SelectItem>
                    <SelectItem value="Caramel">Caramel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Priority */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-foreground">
                  Priority
                </label>
                {dirtyFields.priority && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => resetField('priority')}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Select value={formData.priority} onValueChange={(value: 'High' | 'Medium' | 'Low') => updateField('priority', value)}>
                <SelectTrigger className={dirtyFields.priority ? 'border-orange-300 bg-orange-50' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
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
                    className="h-5 w-5 p-0"
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
                    className="h-5 w-5 p-0"
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
                    className="h-5 w-5 p-0"
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
                  <div className={`flex flex-wrap gap-2 p-3 rounded-lg border ${
                    dirtyFields.accessories ? 'border-orange-300 bg-orange-50' : 'bg-muted/30'
                  }`}>
                    {formData.accessories.map((accessory, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {accessory}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1"
                          onClick={() => removeAccessory(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
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
                    className="h-5 w-5 p-0"
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
                    className="h-5 w-5 p-0"
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
                          className="absolute -top-1 -right-1 h-5 w-5 p-0"
                          onClick={() => removePhoto(index)}
                        >
                          <Trash2 className="h-3 w-3" />
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
                disabled={!hasChanges || !formData.dueDate || !formData.product || !formData.size || sizeRequiresConfirmation}
                className="flex-1"
              >
                Save Changes
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
              onClick={() => window.open(`https://admin.shopify.com/orders/${extendedOrder.orderNumber}`, '_blank')}
            >
              View Details in Shopify
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}