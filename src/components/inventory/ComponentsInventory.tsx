import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Search, Plus, Edit, TrendingDown, ExternalLink, Minus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
import { getComponentsCached, updateComponentStock, upsertComponent, invalidateInventoryCache } from "../../lib/rpc-client";

interface Component {
  id: string;
  sku: string;
  name: string;
  type: "Board" | "Base" | "Box" | "Topper" | "Accessory";
  onHand: number;
  reorderPoint: number;
  shopifyVariant?: string;
  oosAction: "Component only" | "Also block cakes";
  isLowStock: boolean;
}

export function ComponentsInventory() {
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [editingComponent, setEditingComponent] = useState<Component | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [adjustingComponent, setAdjustingComponent] = useState<Component | null>(null);
  const [adjustmentDelta, setAdjustmentDelta] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [newComponent, setNewComponent] = useState<Partial<Component>>({
    sku: "",
    name: "",
    type: "Accessory",
    onHand: 0,
    reorderPoint: 0,
    oosAction: "Component only"
  });

  // Fetch components from Supabase
  useEffect(() => {
    async function fetchComponents() {
      try {
        const dbComponents = await getComponentsCached({});
        
        // Map database components to UI format
        const mappedComponents: Component[] = dbComponents.map((c: any) => ({
          id: c.id,
          sku: c.sku,
          name: c.name,
          type: (c.category || "Accessory") as Component["type"], // Map category to type
          onHand: Number(c.current_stock || 0),
          reorderPoint: Number(c.min_stock || 0),
          shopifyVariant: undefined, // TODO: Add when Shopify integration is ready
          oosAction: "Component only", // TODO: Add to database schema if needed
          isLowStock: Number(c.current_stock || 0) <= Number(c.min_stock || 0),
        }));
        
        setComponents(mappedComponents);
      } catch (error) {
        console.error('Error fetching components:', error);
        toast.error('Failed to load components');
      } finally {
        setLoading(false);
      }
    }
    fetchComponents();
  }, []);

  const filteredComponents = components.filter(component => {
    const matchesSearch = searchQuery === "" || 
      component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "All" || component.type === typeFilter;
    const matchesLowStock = !lowStockOnly || component.isLowStock;
    
    return matchesSearch && matchesType && matchesLowStock;
  });

  const handleAddComponent = () => {
    setNewComponent({
      sku: "",
      name: "",
      type: "Accessory",
      onHand: 0,
      reorderPoint: 0,
      oosAction: "Component only"
    });
    setIsSaving(false); // Reset saving state when opening dialog
    setIsAddDialogOpen(true);
  };

  const handleEditComponent = (component: Component) => {
    setEditingComponent({ ...component });
    setIsSaving(false); // Reset saving state when opening dialog
    setIsEditDialogOpen(true);
  };

  const handleSaveNewComponent = async () => {
    if (!newComponent.sku || !newComponent.name) {
      toast.error("Please fill in SKU and Name");
      return;
    }

    if (isSaving) {
      return;
    }
    
    setIsSaving(true);

    try {
      const componentId = await upsertComponent({
        sku: newComponent.sku,
        name: newComponent.name,
        category: newComponent.type,
        current_stock: newComponent.onHand || 0,
        min_stock: newComponent.reorderPoint || 0,
        is_active: true
      });

      // Invalidate cache after mutation
      invalidateInventoryCache();

      // Add to local state
      const newComponentData: Component = {
        id: componentId,
        sku: newComponent.sku,
        name: newComponent.name,
        type: newComponent.type as Component["type"],
        onHand: newComponent.onHand || 0,
        reorderPoint: newComponent.reorderPoint || 0,
        shopifyVariant: undefined,
        oosAction: newComponent.oosAction as Component["oosAction"],
        isLowStock: (newComponent.onHand || 0) <= (newComponent.reorderPoint || 0)
      };

      setComponents(prev => [...prev, newComponentData]);
      setIsAddDialogOpen(false);
      setNewComponent({
        sku: "",
        name: "",
        type: "Accessory",
        onHand: 0,
        reorderPoint: 0,
        oosAction: "Component only"
      });
      toast.success("Component added successfully");
    } catch (error: any) {
      console.error('Error adding component:', error);
      // Check for duplicate SKU error (INV005 from withErrorHandling wrapper)
      if (error?.code === 'INV005') {
        toast.error(`SKU "${newComponent.sku}" already exists`);
      } else {
        toast.error(error?.message || 'Failed to add component');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveComponent = async () => {
    if (!editingComponent) return;
    
    if (isSaving) {
      return;
    }
    
    setIsSaving(true);

    try {
      // Update component in database
      await upsertComponent({
        id: editingComponent.id,
        sku: editingComponent.sku,
        name: editingComponent.name,
        category: editingComponent.type,
        current_stock: editingComponent.onHand,
        min_stock: editingComponent.reorderPoint,
        is_active: true
      });

      // Invalidate cache after mutation
      invalidateInventoryCache();

      // Update local state
      setComponents(prev => prev.map(c => 
        c.id === editingComponent.id ? {
          ...editingComponent,
          isLowStock: editingComponent.onHand <= editingComponent.reorderPoint
        } : c
      ));
      
      setIsEditDialogOpen(false);
      setEditingComponent(null);
      toast.success("Component updated successfully");
    } catch (error: any) {
      console.error('Error updating component:', error);
      // Check for duplicate SKU error (INV005 from withErrorHandling wrapper)
      if (error?.code === 'INV005') {
        toast.error(`SKU "${editingComponent.sku}" already exists`);
      } else {
        toast.error(error?.message || 'Failed to update component');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdjustStock = (component: Component) => {
    setAdjustingComponent(component);
    setAdjustmentDelta("");
    setAdjustmentReason("");
    setIsAdjustDialogOpen(true);
  };

  const handleSaveAdjustment = async () => {
    if (!adjustingComponent || !adjustmentDelta || !adjustmentReason) return;
    
    const delta = parseInt(adjustmentDelta);
    const newStock = adjustingComponent.onHand + delta;
    
    if (newStock < 0) {
      toast.error("Stock cannot go below zero");
      return;
    }

    try {
      // Update stock in database
      await updateComponentStock({
        component_id: adjustingComponent.id,
        delta: delta,
        reason: adjustmentReason,
      });

      // Invalidate cache after mutation
      invalidateInventoryCache();

      // Update local state
      setComponents(prev => prev.map(c => 
        c.id === adjustingComponent.id ? {
          ...c,
          onHand: newStock,
          isLowStock: newStock <= c.reorderPoint
        } : c
      ));
      
      setIsAdjustDialogOpen(false);
      setAdjustingComponent(null);
      toast.success("Stock updated successfully");
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };

  const getTypeColor = (type: string) => {
    const colors = {
      "Board": "bg-blue-100 text-blue-700 border-blue-200",
      "Base": "bg-green-100 text-green-700 border-green-200", 
      "Box": "bg-purple-100 text-purple-700 border-purple-200",
      "Topper": "bg-red-100 text-red-700 border-red-200",
      "Accessory": "bg-orange-100 text-orange-700 border-orange-200"
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      {/* Header Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search components..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              <SelectItem value="Board">Board</SelectItem>
              <SelectItem value="Base">Base</SelectItem>
              <SelectItem value="Box">Box</SelectItem>
              <SelectItem value="Topper">Topper</SelectItem>
              <SelectItem value="Accessory">Accessory</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2">
            <Switch 
              id="low-stock"
              checked={lowStockOnly}
              onCheckedChange={setLowStockOnly}
            />
            <Label htmlFor="low-stock" className="text-sm">Low stock only</Label>
          </div>

          <Button onClick={handleAddComponent}>
            <Plus className="mr-2 h-4 w-4" />
            Add Component
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>On Hand</TableHead>
              <TableHead>Reorder Point</TableHead>
              <TableHead>Shopify Variant</TableHead>
              <TableHead>OOS Action</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeleton rows
              <>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 bg-muted rounded w-20 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-32 animate-pulse" /></TableCell>
                    <TableCell><div className="h-6 bg-muted rounded w-24 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-12 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-12 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-32 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-24 animate-pulse" /></TableCell>
                    <TableCell><div className="h-8 bg-muted rounded w-20 animate-pulse" /></TableCell>
                  </TableRow>
                ))}
              </>
            ) : filteredComponents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No components found matching your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredComponents.map((component) => (
              <TableRow key={component.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {component.isLowStock && (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    {component.sku}
                  </div>
                </TableCell>
                <TableCell>{component.name}</TableCell>
                <TableCell>
                  <Badge className={`text-xs ${getTypeColor(component.type)}`}>
                    {component.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className={component.isLowStock ? "text-red-600 font-medium" : ""}>
                    {component.onHand}
                  </span>
                </TableCell>
                <TableCell>{component.reorderPoint}</TableCell>
                <TableCell>
                  {component.shopifyVariant ? (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-blue-500" />
                      <span className="text-xs text-muted-foreground">Connected</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-xs">{component.oosAction}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditComponent(component)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAdjustStock(component)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )))}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Component Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Component</DialogTitle>
          </DialogHeader>
          {editingComponent && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editingComponent.name}
                  onChange={(e) => setEditingComponent({
                    ...editingComponent,
                    name: e.target.value
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={editingComponent.sku}
                  onChange={(e) => setEditingComponent({
                    ...editingComponent,
                    sku: e.target.value
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select 
                  value={editingComponent.type} 
                  onValueChange={(value: any) => setEditingComponent({
                    ...editingComponent,
                    type: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Board">Board</SelectItem>
                    <SelectItem value="Base">Base</SelectItem>
                    <SelectItem value="Box">Box</SelectItem>
                    <SelectItem value="Topper">Topper</SelectItem>
                    <SelectItem value="Accessory">Accessory</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="onHand">On Hand</Label>
                  <Input
                    id="onHand"
                    type="number"
                    value={editingComponent.onHand}
                    onChange={(e) => setEditingComponent({
                      ...editingComponent,
                      onHand: parseInt(e.target.value) || 0
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorderPoint">Reorder Point</Label>
                  <Input
                    id="reorderPoint"
                    type="number"
                    value={editingComponent.reorderPoint}
                    onChange={(e) => setEditingComponent({
                      ...editingComponent,
                      reorderPoint: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shopifyVariant">Shopify Variant</Label>
                <Input
                  id="shopifyVariant"
                  placeholder="gid://shopify/ProductVariant/..."
                  value={editingComponent.shopifyVariant || ""}
                  onChange={(e) => setEditingComponent({
                    ...editingComponent,
                    shopifyVariant: e.target.value || undefined
                  })}
                />
              </div>

              <div className="space-y-3">
                <Label>OOS Action</Label>
                <RadioGroup
                  value={editingComponent.oosAction}
                  onValueChange={(value: any) => setEditingComponent({
                    ...editingComponent,
                    oosAction: value
                  })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Component only" id="component-only" />
                    <Label htmlFor="component-only">Component only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Also block cakes" id="block-cakes" />
                    <Label htmlFor="block-cakes">Also block cakes</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="button"
                  onClick={handleSaveComponent} 
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isSaving}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
          </DialogHeader>
          {adjustingComponent && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium">{adjustingComponent.name}</p>
                <p className="text-xs text-muted-foreground">
                  Current stock: {adjustingComponent.onHand}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delta">Delta (+/-)</Label>
                <Input
                  id="delta"
                  type="number"
                  placeholder="e.g., +10 or -5"
                  value={adjustmentDelta}
                  onChange={(e) => setAdjustmentDelta(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Reason for adjustment..."
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="min-h-20"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleSaveAdjustment} 
                  className="flex-1"
                  disabled={!adjustmentDelta || !adjustmentReason}
                >
                  Save
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAdjustDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Component Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Component</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-sku">SKU *</Label>
              <Input
                id="add-sku"
                value={newComponent.sku || ""}
                onChange={(e) => setNewComponent(prev => ({ ...prev, sku: e.target.value }))}
                placeholder="e.g., FLOUR-001"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="add-name">Name *</Label>
              <Input
                id="add-name"
                value={newComponent.name || ""}
                onChange={(e) => setNewComponent(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., All Purpose Flour"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-type">Type</Label>
              <Select
                value={newComponent.type || "Accessory"}
                onValueChange={(value) => setNewComponent(prev => ({ ...prev, type: value as Component["type"] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Board">Board</SelectItem>
                  <SelectItem value="Base">Base</SelectItem>
                  <SelectItem value="Box">Box</SelectItem>
                  <SelectItem value="Topper">Topper</SelectItem>
                  <SelectItem value="Accessory">Accessory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-onhand">On Hand</Label>
                <Input
                  id="add-onhand"
                  type="number"
                  value={newComponent.onHand || 0}
                  onChange={(e) => setNewComponent(prev => ({ ...prev, onHand: parseInt(e.target.value) || 0 }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add-reorder">Reorder Point</Label>
                <Input
                  id="add-reorder"
                  type="number"
                  value={newComponent.reorderPoint || 0}
                  onChange={(e) => setNewComponent(prev => ({ ...prev, reorderPoint: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-oos">Out of Stock Action</Label>
              <RadioGroup
                value={newComponent.oosAction || "Component only"}
                onValueChange={(value) => setNewComponent(prev => ({ ...prev, oosAction: value as Component["oosAction"] }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Component only" id="oos-component" />
                  <Label htmlFor="oos-component">Component only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Also block cakes" id="oos-block" />
                  <Label htmlFor="oos-block">Also block cakes</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                onClick={handleSaveNewComponent}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? "Adding..." : "Add Component"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}