import { useState, useEffect, useMemo } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Search, Plus, X, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getBomsCached,
  getComponentsCached,
  upsertBom,
  saveBomItems,
  deleteBom,
  invalidateInventoryCache,
  type BOM,
  type BOMItem,
  type Component
} from "../../lib/rpc-client";

const STAGES = [
  { value: 'none', label: 'No Stage' },
  { value: 'Filling', label: 'Filling' },
  { value: 'Decorating', label: 'Decorating' },
  { value: 'Packing', label: 'Packing' },
];

const STORES = [
  { value: 'both', label: 'Both Stores' },
  { value: 'bannos', label: 'Bannos' },
  { value: 'flourlane', label: 'Flourlane' },
];

interface EditableBOMItem {
  id: string;
  component_id: string;
  quantity_required: number;
  stage: string;
}

export function BOMsTab() {
  const [boms, setBOMs] = useState<BOM[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");

  // Dialog states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingBOM, setEditingBOM] = useState<{
    id?: string;
    product_title: string;
    store: 'bannos' | 'flourlane' | 'both';
    description: string;
    is_active: boolean;
    items: EditableBOMItem[];
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [componentSearch, setComponentSearch] = useState("");

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [bomsData, componentsData] = await Promise.all([
          getBomsCached(storeFilter === 'all' ? null : storeFilter, true, searchQuery || null),
          getComponentsCached({})
        ]);
        setBOMs(bomsData);
        setComponents(componentsData);
      } catch (error) {
        console.error('Error fetching BOMs:', error);
        toast.error('Failed to load BOMs');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [storeFilter, searchQuery]);

  // Filtered components for dropdown
  const filteredComponents = useMemo(() => {
    if (!componentSearch) return components;
    const search = componentSearch.toLowerCase();
    return components.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.sku.toLowerCase().includes(search)
    );
  }, [components, componentSearch]);

  const handleAddNew = () => {
    setEditingBOM({
      product_title: '',
      store: 'both',
      description: '',
      is_active: true,
      items: []
    });
    setComponentSearch("");
    setIsEditorOpen(true);
  };

  const handleEdit = (bom: BOM) => {
    setEditingBOM({
      id: bom.id,
      product_title: bom.product_title,
      store: bom.store || 'both',
      description: bom.description || '',
      is_active: bom.is_active,
      items: bom.items.map(item => ({
        id: item.id,
        component_id: item.component_id || 'unselected',
        quantity_required: item.quantity_required,
        stage: item.stage || 'none'
      }))
    });
    setComponentSearch("");
    setIsEditorOpen(true);
  };

  const handleDelete = async (bom: BOM) => {
    if (!confirm(`Delete BOM for "${bom.product_title}"? This will also delete all associated BOM items. This cannot be undone.`)) {
      return;
    }

    try {
      await deleteBom(bom.id);
      invalidateInventoryCache();

      // Update local state
      setBOMs(prev => prev.filter(b => b.id !== bom.id));

      toast.success("BOM deleted");
    } catch (error) {
      console.error('Error deleting BOM:', error);
      toast.error(`Failed to delete BOM: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleAddItem = () => {
    if (!editingBOM) return;
    setEditingBOM({
      ...editingBOM,
      items: [
        ...editingBOM.items,
        {
          id: `new-${Date.now()}`,
          component_id: 'unselected',
          quantity_required: 1,
          stage: 'none'
        }
      ]
    });
  };

  const handleUpdateItem = (itemId: string, updates: Partial<EditableBOMItem>) => {
    if (!editingBOM) return;
    setEditingBOM({
      ...editingBOM,
      items: editingBOM.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    });
  };

  const handleRemoveItem = (itemId: string) => {
    if (!editingBOM) return;
    setEditingBOM({
      ...editingBOM,
      items: editingBOM.items.filter(item => item.id !== itemId)
    });
  };

  const handleSave = async () => {
    if (!editingBOM) return;

    if (!editingBOM.product_title.trim()) {
      toast.error("Product title is required");
      return;
    }

    // Validate items have components selected (not 'unselected' placeholder)
    const invalidItems = editingBOM.items.filter(item => !item.component_id || item.component_id === 'unselected');
    if (invalidItems.length > 0) {
      toast.error("Please select a component for all items");
      return;
    }

    setIsSaving(true);
    try {
      // Save BOM header
      const bomId = await upsertBom({
        id: editingBOM.id,
        product_title: editingBOM.product_title,
        store: editingBOM.store,
        description: editingBOM.description || undefined,
        is_active: editingBOM.is_active,
      });

      // Save BOM items (convert 'none' to null for database)
      await saveBomItems(bomId, editingBOM.items.map(item => ({
        component_id: item.component_id,
        quantity_required: item.quantity_required,
        stage: item.stage === 'none' ? null : item.stage,
      })));

      invalidateInventoryCache();

      // Refresh data
      const data = await getBomsCached(storeFilter === 'all' ? null : storeFilter, true, searchQuery || null);
      setBOMs(data);

      setIsEditorOpen(false);
      setEditingBOM(null);
      toast.success(editingBOM.id ? "BOM updated" : "BOM created");
    } catch (error) {
      console.error('Error saving BOM:', error);
      toast.error("Failed to save BOM");
    } finally {
      setIsSaving(false);
    }
  };

  const getComponentName = (componentId: string) => {
    const component = components.find(c => c.id === componentId);
    return component ? `${component.name} (${component.sku})` : 'Select component...';
  };

  const getStoreLabel = (store: string) => {
    return STORES.find(s => s.value === store)?.label || store;
  };

  const getStoreBadgeClass = (store: string) => {
    switch (store) {
      case 'bannos': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'flourlane': return 'bg-pink-100 text-pink-700 border-pink-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search product title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              <SelectItem value="bannos">Bannos</SelectItem>
              <SelectItem value="flourlane">Flourlane</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add BOM
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Store</TableHead>
              <TableHead className="text-center">Components</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 bg-muted rounded w-48 animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-32 animate-pulse" /></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded w-20 animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-16 animate-pulse mx-auto" /></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded w-16 animate-pulse" /></TableCell>
                  <TableCell><div className="h-8 bg-muted rounded w-16 animate-pulse" /></TableCell>
                </TableRow>
              ))
            ) : boms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No BOMs found</p>
                </TableCell>
              </TableRow>
            ) : (
              boms.map((bom) => (
                <TableRow key={bom.id}>
                  <TableCell className="font-medium">{bom.product_title}</TableCell>
                  <TableCell className="text-muted-foreground">{bom.description || '—'}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${getStoreBadgeClass(bom.store)}`}>
                      {getStoreLabel(bom.store)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{bom.items.length}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={bom.is_active ? "default" : "secondary"}>
                      {bom.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(bom)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(bom)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
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

      {/* BOM Editor Dialog - WIDE with SCROLLABLE items and FIXED footer */}
      <Dialog open={isEditorOpen} onOpenChange={(open) => {
        if (!open && !isSaving) {
          setIsEditorOpen(false);
          setEditingBOM(null);
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {editingBOM?.id ? 'Edit BOM' : 'Create BOM'}
            </DialogTitle>
          </DialogHeader>

          {editingBOM && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* BOM Header - Fixed */}
              <div className="flex-shrink-0 space-y-4 pb-4 border-b">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="product_title">Product Title *</Label>
                    <Input
                      id="product_title"
                      placeholder="e.g., Spiderman Theme Cake"
                      value={editingBOM.product_title}
                      onChange={(e) => setEditingBOM({ ...editingBOM, product_title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="store">Store</Label>
                    <Select
                      value={editingBOM.store || 'both'}
                      onValueChange={(v: 'bannos' | 'flourlane' | 'both') => setEditingBOM({ ...editingBOM, store: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STORES.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="e.g., 6-inch Round, Large size"
                    value={editingBOM.description}
                    onChange={(e) => setEditingBOM({ ...editingBOM, description: e.target.value })}
                  />
                </div>
              </div>

              {/* Components Header */}
              <div className="flex-shrink-0 flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Components</h3>
                  <Badge variant="outline">{editingBOM.items.length}</Badge>
                </div>
                <Button size="sm" onClick={handleAddItem}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </div>

              {/* SCROLLABLE Items Area - This is the key UX fix */}
              <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-2">
                {editingBOM.items.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                    No components added. Click "Add" to get started.
                  </div>
                ) : (
                  editingBOM.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
                    >
                      <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>

                      {/* Component Select */}
                      <div className="flex-1 min-w-0">
                        <Select
                          value={item.component_id || 'unselected'}
                          onValueChange={(v) => handleUpdateItem(item.id, { component_id: v })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select component..." />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="p-2">
                              <Input
                                placeholder="Search components..."
                                value={componentSearch}
                                onChange={(e) => setComponentSearch(e.target.value)}
                                className="mb-2"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <SelectItem value="unselected" className="text-muted-foreground">
                              Select a component...
                            </SelectItem>
                            {filteredComponents.length === 0 ? (
                              <div className="p-2 text-center text-muted-foreground">
                                No components found
                              </div>
                            ) : (
                              filteredComponents.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name} ({c.sku})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quantity */}
                      <div className="w-20">
                        <Input
                          type="number"
                          min="0.001"
                          step="0.1"
                          placeholder="Qty"
                          value={item.quantity_required}
                          onChange={(e) => handleUpdateItem(item.id, { quantity_required: parseFloat(e.target.value) || 1 })}
                        />
                      </div>

                      {/* Stage */}
                      <div className="w-28">
                        <Select
                          value={item.stage || 'none'}
                          onValueChange={(v) => handleUpdateItem(item.id, { stage: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Stage" />
                          </SelectTrigger>
                          <SelectContent>
                            {STAGES.map(s => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* FIXED Footer - Always visible */}
              <div className="flex-shrink-0 flex gap-2 pt-4 border-t mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditorOpen(false);
                    setEditingBOM(null);
                  }}
                  disabled={isSaving}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? 'Saving...' : 'Save BOM'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
