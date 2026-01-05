import { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Label } from "../ui/label";
import { Search, Plus, Minus, AlertTriangle, Package, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  upsertComponent,
  adjustComponentStock,
  deleteComponent,
  type Component
} from "../../lib/rpc-client";
import {
  useComponents,
  useLowStockComponents,
  useInvalidateInventory
} from "../../hooks/useInventoryQueries";

const CATEGORIES = [
  { value: 'base', label: 'Cake Base' },
  { value: 'board', label: 'Board' },
  { value: 'box', label: 'Box' },
  { value: 'filling', label: 'Filling' },
  { value: 'topping', label: 'Topping' },
  { value: 'other', label: 'Other' },
];

const UNITS = [
  { value: 'each', label: 'Each' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'litre', label: 'Litre' },
  { value: 'pack', label: 'Pack' },
];

interface StockAdjustState {
  componentId: string;
  componentName: string;
  currentStock: number;
  amount: number;
  reason: string;
  isOpen: boolean;
  direction: 'add' | 'subtract';
}

export function ComponentsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Dialog states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<Partial<Component> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Stock adjust popover state
  const [stockAdjust, setStockAdjust] = useState<StockAdjustState>({
    componentId: '',
    componentName: '',
    currentStock: 0,
    amount: 1,
    reason: 'restock',
    isOpen: false,
    direction: 'add'
  });

  // React Query for data fetching (server-side filtering)
  const category = categoryFilter === 'all' ? undefined : categoryFilter;
  const search = searchQuery || undefined;
  const { data: components = [], isLoading: loading, isError, error } = useComponents({ category, search });
  const { data: lowStockData = [] } = useLowStockComponents();
  const invalidate = useInvalidateInventory();

  // Track whether error has been shown to prevent duplicate toasts
  const errorShownRef = useRef(false);

  // Log and toast fetch errors (only once per error occurrence)
  useEffect(() => {
    if (isError && error && !errorShownRef.current) {
      console.error('Error fetching components:', error);
      toast.error('Failed to load components');
      errorShownRef.current = true;
    } else if (!isError) {
      errorShownRef.current = false;
    }
  }, [isError, error]);

  const lowStockCount = lowStockData.length;

  const handleAddNew = () => {
    setEditingComponent({
      sku: '',
      name: '',
      category: 'other',
      unit: 'each',
      min_stock: 0,
      description: '',
    });
    setIsAddEditOpen(true);
  };

  const handleEdit = (component: Component) => {
    setEditingComponent({ ...component });
    setIsAddEditOpen(true);
  };

  const handleSave = async () => {
    if (!editingComponent) return;

    if (!editingComponent.sku?.trim() || !editingComponent.name?.trim()) {
      toast.error("SKU and Name are required");
      return;
    }

    setIsSaving(true);
    try {
      await upsertComponent({
        id: editingComponent.id,
        sku: editingComponent.sku!,
        name: editingComponent.name!,
        description: editingComponent.description ?? undefined,
        category: editingComponent.category ?? undefined,
        min_stock: editingComponent.min_stock || 0,
        unit: editingComponent.unit || 'each',
        is_active: editingComponent.is_active !== false,
      });

      await invalidate.componentsAll();

      setIsAddEditOpen(false);
      setEditingComponent(null);
      toast.success(editingComponent.id ? "Component updated" : "Component added");
    } catch (error) {
      console.error('Error saving component:', error);
      toast.error("Failed to save component");
    } finally {
      setIsSaving(false);
    }
  };

  const openStockAdjust = (component: Component, direction: 'add' | 'subtract') => {
    setStockAdjust({
      componentId: component.id,
      componentName: component.name,
      currentStock: component.current_stock,
      amount: 1,
      reason: direction === 'add' ? 'restock' : 'adjustment',
      isOpen: true,
      direction
    });
  };

  const handleStockAdjust = async () => {
    const change = stockAdjust.direction === 'add'
      ? stockAdjust.amount
      : -stockAdjust.amount;

    try {
      const result = await adjustComponentStock({
        component_id: stockAdjust.componentId,
        change,
        reason: stockAdjust.reason,
      });

      if (result.success) {
        await invalidate.componentsAll();
        toast.success(`Stock ${stockAdjust.direction === 'add' ? 'added' : 'removed'}: ${result.before} → ${result.after}`);
      } else {
        toast.error(result.error || 'Failed to adjust stock');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error("Failed to adjust stock");
    } finally {
      setStockAdjust(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleDelete = async (component: Component) => {
    if (!confirm(`Delete "${component.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteComponent(component.id);
      await invalidate.componentsAll();
      toast.success(`Deleted "${component.name}"`);
    } catch (error) {
      console.error('Error deleting component:', error);
      toast.error("Failed to delete component");
    }
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value;
  };

  return (
    <div className="space-y-4">
      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <Card className="p-4 border-warning/30 bg-warning/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <span className="text-warning font-medium">
              {lowStockCount} component{lowStockCount > 1 ? 's are' : ' is'} low on stock
            </span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto border-warning/30 text-warning hover:bg-warning/10"
              onClick={() => setCategoryFilter('all')}
            >
              View All
            </Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleAddNew}>
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
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Min</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-center">Adjust</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 bg-muted rounded w-20 animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-32 animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-20 animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-12 animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-12 animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-16 animate-pulse" /></TableCell>
                  <TableCell><div className="h-8 bg-muted rounded w-20 animate-pulse" /></TableCell>
                  <TableCell><div className="h-8 bg-muted rounded w-16 animate-pulse" /></TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-destructive">
                  Failed to load components. Please refresh.
                </TableCell>
              </TableRow>
            ) : components.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No components found</p>
                </TableCell>
              </TableRow>
            ) : (
              components.map((component) => (
                <TableRow key={component.id}>
                  <TableCell className="font-mono text-sm">{component.sku}</TableCell>
                  <TableCell className="font-medium">{component.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getCategoryLabel(component.category)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {component.is_low_stock ? (
                      <span className="text-warning font-medium flex items-center justify-end gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        {component.current_stock}
                      </span>
                    ) : (
                      <span>{component.current_stock}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {component.min_stock}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{component.unit}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Popover
                        open={stockAdjust.isOpen && stockAdjust.componentId === component.id && stockAdjust.direction === 'subtract'}
                        onOpenChange={(open) => {
                          if (open) openStockAdjust(component, 'subtract');
                          else setStockAdjust(prev => ({ ...prev, isOpen: false }));
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon" className="h-10 w-10">
                            <Minus className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64">
                          <div className="space-y-3">
                            <h4 className="font-medium">Remove Stock</h4>
                            <p className="text-sm text-muted-foreground">{stockAdjust.componentName}</p>
                            <div className="space-y-2">
                              <Label>Amount</Label>
                              <Input
                                type="number"
                                min="1"
                                value={stockAdjust.amount}
                                onChange={(e) => setStockAdjust(prev => ({ ...prev, amount: parseInt(e.target.value) || 1 }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Reason</Label>
                              <Select
                                value={stockAdjust.reason}
                                onValueChange={(v) => setStockAdjust(prev => ({ ...prev, reason: v }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="adjustment">Adjustment</SelectItem>
                                  <SelectItem value="damaged">Damaged</SelectItem>
                                  <SelectItem value="expired">Expired</SelectItem>
                                  <SelectItem value="used">Used</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button onClick={handleStockAdjust} className="w-full">
                              Remove {stockAdjust.amount}
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Popover
                        open={stockAdjust.isOpen && stockAdjust.componentId === component.id && stockAdjust.direction === 'add'}
                        onOpenChange={(open) => {
                          if (open) openStockAdjust(component, 'add');
                          else setStockAdjust(prev => ({ ...prev, isOpen: false }));
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon" className="h-10 w-10">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64">
                          <div className="space-y-3">
                            <h4 className="font-medium">Add Stock</h4>
                            <p className="text-sm text-muted-foreground">{stockAdjust.componentName}</p>
                            <div className="space-y-2">
                              <Label>Amount</Label>
                              <Input
                                type="number"
                                min="1"
                                value={stockAdjust.amount}
                                onChange={(e) => setStockAdjust(prev => ({ ...prev, amount: parseInt(e.target.value) || 1 }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Reason</Label>
                              <Select
                                value={stockAdjust.reason}
                                onValueChange={(v) => setStockAdjust(prev => ({ ...prev, reason: v }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="restock">Restock</SelectItem>
                                  <SelectItem value="return">Return</SelectItem>
                                  <SelectItem value="correction">Correction</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button onClick={handleStockAdjust} className="w-full">
                              Add {stockAdjust.amount}
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(component)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        onClick={() => handleDelete(component)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingComponent?.id ? 'Edit Component' : 'Add Component'}
            </DialogTitle>
          </DialogHeader>

          {editingComponent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    placeholder="CB-6RND"
                    value={editingComponent.sku || ''}
                    onChange={(e) => setEditingComponent({ ...editingComponent, sku: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={editingComponent.category || 'other'}
                    onValueChange={(v) => setEditingComponent({ ...editingComponent, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="6-inch Round Cake Base"
                  value={editingComponent.name || ''}
                  onChange={(e) => setEditingComponent({ ...editingComponent, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Optional description..."
                  value={editingComponent.description || ''}
                  onChange={(e) => setEditingComponent({ ...editingComponent, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select
                    value={editingComponent.unit || 'each'}
                    onValueChange={(v) => setEditingComponent({ ...editingComponent, unit: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map(u => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_stock">Min Stock (Alert)</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    min="0"
                    value={editingComponent.min_stock ?? ''}
                    onChange={(e) => setEditingComponent({ ...editingComponent, min_stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEditOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Component'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
