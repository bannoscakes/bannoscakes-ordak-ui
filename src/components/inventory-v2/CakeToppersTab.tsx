import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Label } from "../ui/label";
import { Search, Plus, Minus, AlertTriangle, Package, Cake, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getCakeToppersCached,
  upsertCakeTopper,
  adjustCakeTopperStock,
  deleteCakeTopper,
  invalidateInventoryCache,
  type CakeTopper
} from "../../lib/rpc-client";

interface StockAdjustState {
  topperId: string;
  topperName: string;
  currentStock: number;
  amount: number;
  reason: string;
  isOpen: boolean;
  direction: 'add' | 'subtract';
}

export function CakeToppersTab() {
  const [toppers, setToppers] = useState<CakeTopper[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingTopper, setEditingTopper] = useState<Partial<CakeTopper> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Stock adjust popover state
  const [stockAdjust, setStockAdjust] = useState<StockAdjustState>({
    topperId: '',
    topperName: '',
    currentStock: 0,
    amount: 1,
    reason: 'restock',
    isOpen: false,
    direction: 'add'
  });

  // Filter helper function
  const applySearchFilter = (data: CakeTopper[], query: string): CakeTopper[] => {
    if (!query) return data;
    return data.filter(t =>
      t.name_1.toLowerCase().includes(query.toLowerCase()) ||
      (t.name_2 && t.name_2.toLowerCase().includes(query.toLowerCase())) ||
      (t.shopify_product_id_1 && t.shopify_product_id_1.includes(query)) ||
      (t.shopify_product_id_2 && t.shopify_product_id_2.includes(query))
    );
  };

  // Fetch cake toppers
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await getCakeToppersCached({});

        // Filter by search locally
        const filtered = applySearchFilter(data, searchQuery);

        setToppers(filtered);
      } catch (error) {
        console.error('Error fetching cake toppers:', error);
        toast.error('Failed to load cake toppers');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [searchQuery]);

  const handleAddNew = () => {
    setEditingTopper({
      name_1: '',
      name_2: null,
      min_stock: 5,
      shopify_product_id_1: null,
      shopify_product_id_2: null,
      is_active: true,
    });
    setIsAddEditOpen(true);
  };

  const handleEdit = (topper: CakeTopper) => {
    setEditingTopper({ ...topper });
    setIsAddEditOpen(true);
  };

  const handleDelete = async (topper: CakeTopper) => {
    const displayName = topper.name_2
      ? `"${topper.name_1}" / "${topper.name_2}"`
      : `"${topper.name_1}"`;

    if (!confirm(`Delete ${displayName}? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteCakeTopper(topper.id);
      invalidateInventoryCache();

      // Update local state
      setToppers(prev => prev.filter(t => t.id !== topper.id));

      toast.success("Cake topper deleted");
    } catch (error) {
      console.error('Error deleting cake topper:', error);
      toast.error(`Failed to delete cake topper: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleSave = async () => {
    if (!editingTopper) return;

    if (!editingTopper.name_1?.trim()) {
      toast.error("Product Name 1 is required");
      return;
    }

    setIsSaving(true);
    try {
      const params = {
        id: editingTopper.id,
        name_1: editingTopper.name_1!.trim(),
        name_2: editingTopper.name_2?.trim() || null,
        min_stock: editingTopper.min_stock || 5,
        shopify_product_id_1: editingTopper.shopify_product_id_1?.trim() || null,
        shopify_product_id_2: editingTopper.shopify_product_id_2?.trim() || null,
        is_active: editingTopper.is_active !== false,
      };

      const result = await upsertCakeTopper(params);

      invalidateInventoryCache();

      // Refresh data and reapply search filter
      const data = await getCakeToppersCached({});
      const filtered = applySearchFilter(data, searchQuery);
      setToppers(filtered);

      setIsAddEditOpen(false);
      setEditingTopper(null);
      toast.success(editingTopper.id ? "Cake topper updated" : "Cake topper added");
    } catch (error) {
      console.error('Error saving cake topper:', error);
      toast.error(`Failed to save cake topper: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const openStockAdjust = (topper: CakeTopper, direction: 'add' | 'subtract') => {
    const displayName = topper.name_2
      ? `${topper.name_1} / ${topper.name_2}`
      : topper.name_1;

    setStockAdjust({
      topperId: topper.id,
      topperName: displayName,
      currentStock: topper.current_stock,
      amount: 1,
      reason: direction === 'add' ? 'restock' : 'damage',
      isOpen: true,
      direction
    });
  };

  const handleStockAdjust = async () => {
    const change = stockAdjust.direction === 'add'
      ? stockAdjust.amount
      : -stockAdjust.amount;

    // Find current topper to validate
    const currentTopper = toppers.find(t => t.id === stockAdjust.topperId);
    if (!currentTopper) {
      toast.error('Cake topper not found');
      return;
    }

    // Validate that stock won't go negative
    const resultingStock = currentTopper.current_stock + change;
    if (resultingStock < 0) {
      toast.error(`Cannot remove ${Math.abs(change)} units. Only ${currentTopper.current_stock} available.`);
      return;
    }

    try {
      const result = await adjustCakeTopperStock({
        topper_id: stockAdjust.topperId,
        change,
        reason: stockAdjust.reason,
      });

      if (result.success) {
        invalidateInventoryCache();

        // Update local state
        setToppers(prev => prev.map(t =>
          t.id === stockAdjust.topperId
            ? {
                ...t,
                current_stock: result.new_stock,
                is_low_stock: result.new_stock < t.min_stock && result.new_stock > 0,
                is_out_of_stock: result.new_stock === 0
              }
            : t
        ));

        const displayName = result.name_2
          ? `${result.name_1} / ${result.name_2}`
          : result.name_1;

        toast.success(`Stock ${stockAdjust.direction === 'add' ? 'added' : 'removed'}: ${displayName} ${result.old_stock} → ${result.new_stock}`);
      } else {
        toast.error('Failed to adjust stock');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error("Failed to adjust stock");
    } finally {
      setStockAdjust(prev => ({ ...prev, isOpen: false }));
    }
  };

  const getStockStatus = (topper: CakeTopper) => {
    if (topper.is_out_of_stock) {
      return { label: 'Out of Stock', className: 'bg-red-100 text-red-700 border-red-200' };
    }
    if (topper.is_low_stock) {
      return { label: 'Low Stock', className: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { label: 'In Stock', className: 'bg-green-100 text-green-700 border-green-200' };
  };

  const lowStockCount = toppers.filter(t => t.is_low_stock && t.is_active).length;
  const outOfStockCount = toppers.filter(t => t.is_out_of_stock && t.is_active).length;

  return (
    <div className="space-y-4">
      {/* Alert Banner */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="text-amber-800 font-medium">
              {outOfStockCount > 0 && `${outOfStockCount} topper${outOfStockCount > 1 ? 's' : ''} out of stock`}
              {outOfStockCount > 0 && lowStockCount > 0 && ', '}
              {lowStockCount > 0 && `${lowStockCount} topper${lowStockCount > 1 ? 's' : ''} low on stock`}
            </span>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by product name or Shopify ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Cake Topper
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name 1</TableHead>
              <TableHead>Product Name 2</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Min Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Shopify ID 1</TableHead>
              <TableHead>Shopify ID 2</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : toppers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-12 w-12 text-muted-foreground/30" />
                    <p>No cake toppers found</p>
                    <Button onClick={handleAddNew} variant="outline" size="sm">
                      Add your first cake topper
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              toppers.map((topper) => {
                const status = getStockStatus(topper);
                return (
                  <TableRow key={topper.id} className={!topper.is_active ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Cake className="h-4 w-4 text-muted-foreground" />
                        {topper.name_1}
                      </div>
                    </TableCell>
                    <TableCell>
                      {topper.name_2 || <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-semibold">{topper.current_stock}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-muted-foreground">{topper.min_stock}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {topper.shopify_product_id_1 || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {topper.shopify_product_id_2 || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* Remove Stock Popover */}
                        <Popover
                          open={stockAdjust.isOpen && stockAdjust.topperId === topper.id && stockAdjust.direction === 'subtract'}
                          onOpenChange={(open) => {
                            if (open) openStockAdjust(topper, 'subtract');
                            else setStockAdjust(prev => ({ ...prev, isOpen: false }));
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              disabled={topper.current_stock === 0}
                            >
                              <Minus className="h-3 w-3" />
                              Remove
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-medium">Remove Stock</h4>
                                <p className="text-sm text-muted-foreground">{stockAdjust.topperName}</p>
                                <p className="text-xs text-muted-foreground">Current: {stockAdjust.currentStock}</p>
                              </div>
                              <div className="space-y-2">
                                <Label>Amount</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={stockAdjust.amount}
                                  onChange={(e) => setStockAdjust(prev => ({ ...prev, amount: Math.max(1, Math.abs(parseInt(e.target.value) || 1)) }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Reason</Label>
                                <Input
                                  value={stockAdjust.reason}
                                  onChange={(e) => setStockAdjust(prev => ({ ...prev, reason: e.target.value }))}
                                  placeholder="e.g., sold, damage, theft"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleStockAdjust}
                                  size="sm"
                                  className="flex-1"
                                >
                                  Remove {stockAdjust.amount}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setStockAdjust(prev => ({ ...prev, isOpen: false }))}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>

                        {/* Add Stock Popover */}
                        <Popover
                          open={stockAdjust.isOpen && stockAdjust.topperId === topper.id && stockAdjust.direction === 'add'}
                          onOpenChange={(open) => {
                            if (open) openStockAdjust(topper, 'add');
                            else setStockAdjust(prev => ({ ...prev, isOpen: false }));
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              Add
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-medium">Add Stock</h4>
                                <p className="text-sm text-muted-foreground">{stockAdjust.topperName}</p>
                                <p className="text-xs text-muted-foreground">Current: {stockAdjust.currentStock}</p>
                              </div>
                              <div className="space-y-2">
                                <Label>Amount</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={stockAdjust.amount}
                                  onChange={(e) => setStockAdjust(prev => ({ ...prev, amount: Math.max(1, Math.abs(parseInt(e.target.value) || 1)) }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Reason</Label>
                                <Input
                                  value={stockAdjust.reason}
                                  onChange={(e) => setStockAdjust(prev => ({ ...prev, reason: e.target.value }))}
                                  placeholder="e.g., restock, return, correction"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleStockAdjust}
                                  size="sm"
                                  className="flex-1"
                                >
                                  Add {stockAdjust.amount}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setStockAdjust(prev => ({ ...prev, isOpen: false }))}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(topper)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(topper)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTopper?.id ? 'Edit Cake Topper' : 'Add Cake Topper'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name_1">
                Product Name 1 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name_1"
                value={editingTopper?.name_1 || ''}
                onChange={(e) => setEditingTopper(prev => ({ ...prev, name_1: e.target.value }))}
                placeholder="e.g., Spiderman Gelato Cake"
              />
              <p className="text-xs text-muted-foreground">
                Exact product title as it appears in orders (case-sensitive)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name_2">Product Name 2 (Optional)</Label>
              <Input
                id="name_2"
                value={editingTopper?.name_2 || ''}
                onChange={(e) => setEditingTopper(prev => ({ ...prev, name_2: e.target.value || null }))}
                placeholder="e.g., Spiderman Sponge Cake"
              />
              <p className="text-xs text-muted-foreground">
                Second product that uses the same topper (leave empty if only one product uses this topper)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_stock">Minimum Stock</Label>
                <Input
                  id="min_stock"
                  type="number"
                  min={0}
                  value={editingTopper?.min_stock || 5}
                  onChange={(e) => setEditingTopper(prev => ({ ...prev, min_stock: parseInt(e.target.value) || 5 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_active">Status</Label>
                <select
                  id="is_active"
                  value={editingTopper?.is_active !== false ? 'active' : 'inactive'}
                  onChange={(e) => setEditingTopper(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopify_product_id_1">Shopify Product ID 1 (Optional)</Label>
              <Input
                id="shopify_product_id_1"
                value={editingTopper?.shopify_product_id_1 || ''}
                onChange={(e) => setEditingTopper(prev => ({ ...prev, shopify_product_id_1: e.target.value || null }))}
                placeholder="e.g., 12345678901234"
              />
              <p className="text-xs text-muted-foreground">
                Used to mark the associated product out of stock when this topper's stock is zero.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopify_product_id_2">Shopify Product ID 2 (Optional)</Label>
              <Input
                id="shopify_product_id_2"
                value={editingTopper?.shopify_product_id_2 || ''}
                onChange={(e) => setEditingTopper(prev => ({ ...prev, shopify_product_id_2: e.target.value || null }))}
                placeholder="e.g., 12345678901234"
              />
              <p className="text-xs text-muted-foreground">
                Used to mark the associated product out of stock when this topper's stock is zero.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddEditOpen(false);
                setEditingTopper(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
