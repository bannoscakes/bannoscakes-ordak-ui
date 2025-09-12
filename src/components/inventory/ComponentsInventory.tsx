import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Search, Plus, Edit, TrendingDown, ExternalLink, Minus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner@2.0.3";

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

const mockComponents: Component[] = [
  {
    id: "C001",
    sku: "CAKE-BASE-6IN",
    name: "6-inch Round Cake Base",
    type: "Base",
    onHand: 45,
    reorderPoint: 20,
    shopifyVariant: "gid://shopify/ProductVariant/123456789",
    oosAction: "Also block cakes",
    isLowStock: false
  },
  {
    id: "C002", 
    sku: "CAKE-BOX-6IN",
    name: "6-inch White Cake Box",
    type: "Box",
    onHand: 8,
    reorderPoint: 15,
    oosAction: "Component only",
    isLowStock: true
  },
  {
    id: "C003",
    sku: "TOPPER-SPIDER",
    name: "Spiderman Cake Topper",
    type: "Topper",
    onHand: 2,
    reorderPoint: 5,
    shopifyVariant: "gid://shopify/ProductVariant/987654321",
    oosAction: "Also block cakes",
    isLowStock: true
  },
  {
    id: "C004",
    sku: "BOARD-ROUND-8IN",
    name: "8-inch Round Cake Board",
    type: "Board",
    onHand: 67,
    reorderPoint: 25,
    oosAction: "Component only",
    isLowStock: false
  },
  {
    id: "C005",
    sku: "ACC-CANDLE-NUM",
    name: "Number Candles Set",
    type: "Accessory",
    onHand: 24,
    reorderPoint: 10,
    shopifyVariant: "gid://shopify/ProductVariant/456789123",
    oosAction: "Component only",
    isLowStock: false
  }
];

export function ComponentsInventory() {
  const [components, setComponents] = useState<Component[]>(mockComponents);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [editingComponent, setEditingComponent] = useState<Component | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [adjustingComponent, setAdjustingComponent] = useState<Component | null>(null);
  const [adjustmentDelta, setAdjustmentDelta] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  const filteredComponents = components.filter(component => {
    const matchesSearch = searchQuery === "" || 
      component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "All" || component.type === typeFilter;
    const matchesLowStock = !lowStockOnly || component.isLowStock;
    
    return matchesSearch && matchesType && matchesLowStock;
  });

  const handleEditComponent = (component: Component) => {
    setEditingComponent({ ...component });
    setIsEditDialogOpen(true);
  };

  const handleSaveComponent = () => {
    if (!editingComponent) return;
    
    setComponents(prev => prev.map(c => 
      c.id === editingComponent.id ? {
        ...editingComponent,
        isLowStock: editingComponent.onHand <= editingComponent.reorderPoint
      } : c
    ));
    
    setIsEditDialogOpen(false);
    setEditingComponent(null);
    toast.success("Component updated successfully");
  };

  const handleAdjustStock = (component: Component) => {
    setAdjustingComponent(component);
    setAdjustmentDelta("");
    setAdjustmentReason("");
    setIsAdjustDialogOpen(true);
  };

  const handleSaveAdjustment = () => {
    if (!adjustingComponent || !adjustmentDelta || !adjustmentReason) return;
    
    const delta = parseInt(adjustmentDelta);
    const newStock = adjustingComponent.onHand + delta;
    
    if (newStock < 0) {
      toast.error("Stock cannot go below zero");
      return;
    }

    setComponents(prev => prev.map(c => 
      c.id === adjustingComponent.id ? {
        ...c,
        onHand: newStock,
        isLowStock: newStock <= c.reorderPoint
      } : c
    ));
    
    setIsAdjustDialogOpen(false);
    setAdjustingComponent(null);
    toast.success("Stock updated");
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

          <Button>
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
            {filteredComponents.map((component) => (
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
            ))}
          </TableBody>
        </Table>

        {filteredComponents.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No components found matching your filters
          </div>
        )}
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
                <Button onClick={handleSaveComponent} className="flex-1">
                  Save Changes
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
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
    </div>
  );
}