import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Label } from "../ui/label";
import { Search, Plus, Minus, AlertTriangle, RefreshCw, Package, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getAccessoriesCached,
  getAccessoriesNeedingSync,
  upsertAccessory,
  adjustAccessoryStock,
  deleteAccessory,
  invalidateInventoryCache,
  type Accessory
} from "../../lib/rpc-client";

const CATEGORIES = [
  { value: 'topper', label: 'Cake Topper' },
  { value: 'balloon', label: 'Balloon' },
  { value: 'candle', label: 'Candle' },
  { value: 'other', label: 'Other' },
];

interface StockAdjustState {
  accessoryId: string;
  accessoryName: string;
  currentStock: number;
  amount: number;
  reason: string;
  isOpen: boolean;
  direction: 'add' | 'subtract';
}

export function AccessoriesTab() {
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [needsSyncCount, setNeedsSyncCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Dialog states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingAccessory, setEditingAccessory] = useState<Partial<Accessory> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Stock adjust popover state
  const [stockAdjust, setStockAdjust] = useState<StockAdjustState>({
    accessoryId: '',
    accessoryName: '',
    currentStock: 0,
    amount: 1,
    reason: 'restock',
    isOpen: false,
    direction: 'add'
  });

  // Fetch accessories
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [accessoriesData, needsSync] = await Promise.all([
          getAccessoriesCached({
            category: categoryFilter === 'all' ? undefined : categoryFilter,
          }),
          getAccessoriesNeedingSync()
        ]);

        // Filter by search locally
        const filtered = searchQuery
          ? accessoriesData.filter(a =>
              a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.product_match.toLowerCase().includes(searchQuery.toLowerCase())
            )
          : accessoriesData;

        setAccessories(filtered);
        setNeedsSyncCount(needsSync.length);
      } catch (error) {
        console.error('Error fetching accessories:', error);
        toast.error('Failed to load accessories');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [categoryFilter, searchQuery]);

  const handleAddNew = () => {
    setEditingAccessory({
      sku: '',
      name: '',
      category: 'topper',
      product_match: '',
      min_stock: 5,
    });
    setIsAddEditOpen(true);
  };

  const handleEdit = (accessory: Accessory) => {
    setEditingAccessory({ ...accessory });
    setIsAddEditOpen(true);
  };

  const handleDelete = async (accessory: Accessory) => {
    if (!confirm(`Delete "${accessory.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteAccessory(accessory.id);
      invalidateInventoryCache();

      // Update local state
      setAccessories(prev => prev.filter(a => a.id !== accessory.id));

      toast.success("Accessory deleted");
    } catch (error) {
      console.error('Error deleting accessory:', error);
      toast.error(`Failed to delete accessory: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleSave = async () => {
    if (!editingAccessory) return;

    if (!editingAccessory.sku?.trim() || !editingAccessory.name?.trim() || !editingAccessory.product_match?.trim()) {
      toast.error("SKU, Name, and Product Match are required");
      return;
    }

    setIsSaving(true);
    try {
      await upsertAccessory({
        id: editingAccessory.id,
        sku: editingAccessory.sku!,
        name: editingAccessory.name!,
        category: editingAccessory.category as 'topper' | 'balloon' | 'candle' | 'other',
        product_match: editingAccessory.product_match!,
        min_stock: editingAccessory.min_stock || 5,
        is_active: editingAccessory.is_active !== false,
      });

      invalidateInventoryCache();

      // Refresh data
      const data = await getAccessoriesCached({
        category: categoryFilter === 'all' ? undefined : categoryFilter,
      });
      setAccessories(data);

      setIsAddEditOpen(false);
      setEditingAccessory(null);
      toast.success(editingAccessory.id ? "Accessory updated" : "Accessory added");
    } catch (error) {
      console.error('Error saving accessory:', error);
      toast.error("Failed to save accessory");
    } finally {
      setIsSaving(false);
    }
  };

  const openStockAdjust = (accessory: Accessory, direction: 'add' | 'subtract') => {
    setStockAdjust({
      accessoryId: accessory.id,
      accessoryName: accessory.name,
      currentStock: accessory.current_stock,
      amount: 1,
      reason: direction === 'add' ? 'restock' : 'sold',
      isOpen: true,
      direction
    });
  };

  const handleStockAdjust = async () => {
    const change = stockAdjust.direction === 'add'
      ? stockAdjust.amount
      : -stockAdjust.amount;

    try {
      const result = await adjustAccessoryStock({
        accessory_id: stockAdjust.accessoryId,
        change,
        reason: stockAdjust.reason,
      });

      if (result.success) {
        invalidateInventoryCache();

        // Update local state
        setAccessories(prev => prev.map(a =>
          a.id === stockAdjust.accessoryId
            ? {
                ...a,
                current_stock: result.after!,
                is_low_stock: result.after! < a.min_stock && result.after! > 0,
                is_out_of_stock: result.after! === 0
              }
            : a
        ));

        // Check if needs sync
        if (result.needs_sync) {
          setNeedsSyncCount(prev => prev + 1);
          toast.warning(`${result.accessory} is now out of stock - Shopify sync needed`);
        } else {
          toast.success(`Stock ${stockAdjust.direction === 'add' ? 'added' : 'removed'}: ${result.before} → ${result.after}`);
        }
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

  const handleSyncToShopify = async () => {
    setSyncing(true);
    try {
      const needsSync = await getAccessoriesNeedingSync();

      if (needsSync.length === 0) {
        toast.info("No accessories need syncing");
        setSyncing(false);
        return;
      }

      // TODO: Implement actual Shopify API calls here
      // For now, just show what would be synced
      toast.warning(
        `Shopify sync not yet implemented.\n\nWould sync ${needsSync.length} out-of-stock accessories:\n${needsSync.map((a: any) => `- ${a.name} (match: "${a.product_match}")`).join('\n')}`,
        { duration: 7000 }
      );

      // In a real implementation, you would:
      // 1. For each accessory with product_match
      // 2. Call Shopify API to find products containing that keyword
      // 3. Set those products to out of stock
      // 4. Log the sync action
      // 5. ONLY THEN: setNeedsSyncCount(0);

      // DO NOT clear the count until actual sync is implemented
      // setNeedsSyncCount(0); // REMOVED - causes misleading UX
    } catch (error) {
      console.error('Error syncing to Shopify:', error);
      toast.error("Failed to sync to Shopify");
    } finally {
      setSyncing(false);
    }
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const getStockStatus = (accessory: Accessory) => {
    if (accessory.is_out_of_stock) {
      return { label: 'Out of Stock', className: 'bg-red-100 text-red-700 border-red-200' };
    }
    if (accessory.is_low_stock) {
      return { label: 'Low Stock', className: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { label: 'In Stock', className: 'bg-green-100 text-green-700 border-green-200' };
  };

  return (
    <div className="space-y-4">
      {/* Sync Alert */}
      {needsSyncCount > 0 && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-800 font-medium">
              {needsSyncCount} accessor{needsSyncCount > 1 ? 'ies are' : 'y is'} out of stock - Shopify sync needed
            </span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto border-red-300 text-red-700 hover:bg-red-100"
              onClick={handleSyncToShopify}
              disabled={syncing}
            >
              {syncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync to Shopify
                </>
              )}
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
              placeholder="Search by name, SKU, or product match..."
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
            Add Accessory
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
              <TableHead>Product Match</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Adjust</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 bg-muted rounded w-16 animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-32 animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-20 animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-24 animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-12 animate-pulse" /></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded w-20 animate-pulse" /></TableCell>
                  <TableCell><div className="h-8 bg-muted rounded w-20 animate-pulse" /></TableCell>
                  <TableCell><div className="h-8 bg-muted rounded w-16 animate-pulse" /></TableCell>
                </TableRow>
              ))
            ) : accessories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No accessories found</p>
                </TableCell>
              </TableRow>
            ) : (
              accessories.map((accessory) => {
                const status = getStockStatus(accessory);
                return (
                  <TableRow key={accessory.id}>
                    <TableCell className="font-mono text-sm">{accessory.sku}</TableCell>
                    <TableCell className="font-medium">{accessory.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryLabel(accessory.category)}</Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {accessory.product_match}
                      </code>
                    </TableCell>
                    <TableCell className="text-right">
                      {accessory.is_out_of_stock ? (
                        <span className="text-red-600 font-medium">0</span>
                      ) : accessory.is_low_stock ? (
                        <span className="text-amber-600 font-medium flex items-center justify-end gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          {accessory.current_stock}
                        </span>
                      ) : (
                        <span>{accessory.current_stock}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${status.className}`}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Popover
                          open={stockAdjust.isOpen && stockAdjust.accessoryId === accessory.id && stockAdjust.direction === 'subtract'}
                          onOpenChange={(open) => {
                            if (open) openStockAdjust(accessory, 'subtract');
                            else setStockAdjust(prev => ({ ...prev, isOpen: false }));
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <Minus className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64">
                            <div className="space-y-3">
                              <h4 className="font-medium">Remove Stock</h4>
                              <p className="text-sm text-muted-foreground">{stockAdjust.accessoryName}</p>
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
                                    <SelectItem value="sold">Sold</SelectItem>
                                    <SelectItem value="damaged">Damaged</SelectItem>
                                    <SelectItem value="adjustment">Adjustment</SelectItem>
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
                          open={stockAdjust.isOpen && stockAdjust.accessoryId === accessory.id && stockAdjust.direction === 'add'}
                          onOpenChange={(open) => {
                            if (open) openStockAdjust(accessory, 'add');
                            else setStockAdjust(prev => ({ ...prev, isOpen: false }));
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64">
                            <div className="space-y-3">
                              <h4 className="font-medium">Add Stock</h4>
                              <p className="text-sm text-muted-foreground">{stockAdjust.accessoryName}</p>
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
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(accessory)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(accessory)}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAccessory?.id ? 'Edit Accessory' : 'Add Accessory'}
            </DialogTitle>
          </DialogHeader>

          {editingAccessory && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    placeholder="ACC-001"
                    value={editingAccessory.sku || ''}
                    onChange={(e) => setEditingAccessory({ ...editingAccessory, sku: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={editingAccessory.category || 'topper'}
                    onValueChange={(v) => setEditingAccessory({ ...editingAccessory, category: v as any })}
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
                  placeholder="Spiderman Cake Topper"
                  value={editingAccessory.name || ''}
                  onChange={(e) => setEditingAccessory({ ...editingAccessory, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product_match">
                  Product Match Keyword *
                  <span className="text-muted-foreground font-normal ml-2">
                    (matches Shopify product titles)
                  </span>
                </Label>
                <Input
                  id="product_match"
                  placeholder="Spiderman"
                  value={editingAccessory.product_match || ''}
                  onChange={(e) => setEditingAccessory({ ...editingAccessory, product_match: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  When this accessory is out of stock, all Shopify products containing this keyword will be set to out of stock.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_stock">Min Stock (Alert threshold)</Label>
                <Input
                  id="min_stock"
                  type="number"
                  min="0"
                  value={editingAccessory.min_stock ?? 5}
                  onChange={(e) => setEditingAccessory({ ...editingAccessory, min_stock: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEditOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Accessory'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
