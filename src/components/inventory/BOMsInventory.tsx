import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Search, Plus, Edit, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { Separator } from "../ui/separator";
import { toast } from "sonner";
import { getBoms, upsertBom, getComponents, type BOM, type BOMItem } from "../../lib/rpc-client";

// =============================================================================
// MOCK DATA - TODO: Replace with real data from database when features are implemented
// - BOM Items management (add/remove items from BOMs)
// - Component selection for BOM items
// =============================================================================

const mockComponents = [
  { id: "C001", name: "6-inch Round Cake Base" },
  { id: "C002", name: "6-inch White Cake Box" },
  { id: "C003", name: "Spiderman Cake Topper" },
  { id: "C004", name: "8-inch Round Cake Board" },
  { id: "C005", name: "Number Candles Set" },
  { id: "C006", name: "Chocolate Filling" },
  { id: "C007", name: "Vanilla Buttercream" },
  { id: "C008", name: "Food Coloring - Blue" }
];

export function BOMsInventory() {
  const [boms, setBOMs] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState("All");
  const [editingBOM, setEditingBOM] = useState<BOM | null>(null);
  const [isBOMEditorOpen, setIsBOMEditorOpen] = useState(false);

  // Fetch BOMs from Supabase
  useEffect(() => {
    async function fetchBOMs() {
      try {
        const storeFilterValue = storeFilter === "All" ? null : (storeFilter.toLowerCase() as "bannos" | "flourlane");
        const searchValue = searchQuery.trim() || null;
        
        const bomsData = await getBoms(storeFilterValue, true, searchValue);
        console.log('Fetched BOMs:', bomsData); // Debug log
        
        setBOMs(bomsData);
      } catch (error) {
        console.error('Error fetching BOMs:', error);
        toast.error('Failed to load BOMs');
      } finally {
        setLoading(false);
      }
    }
    fetchBOMs();
  }, [storeFilter, searchQuery]);

  // Filtering is now handled by the RPC call, so we can use boms directly
  const filteredBOMs = boms;

  const handleOpenBOM = (bom: BOM) => {
    setEditingBOM({ ...bom });
    setIsBOMEditorOpen(true);
  };

  const handleSaveBOM = () => {
    if (!editingBOM) return;
    
    setBOMs(prev => prev.map(b => 
      b.id === editingBOM.id ? editingBOM : b
    ));
    
    setIsBOMEditorOpen(false);
    setEditingBOM(null);
    toast.success("BOM saved successfully");
  };

  const handleAddBOMItem = () => {
    if (!editingBOM) return;
    
    const newItem: BOMItem = {
      id: `BI${Date.now()}`,
      bom_id: editingBOM.id,
      component_id: "",
      component_name: "",
      component_sku: "",
      quantity_per_unit: 1,
      is_optional: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setEditingBOM({
      ...editingBOM,
      items: [...(editingBOM.items || []), newItem]
    });
  };

  const handleUpdateBOMItem = (itemId: string, updates: Partial<BOMItem>) => {
    if (!editingBOM) return;
    
    setEditingBOM({
      ...editingBOM,
      items: (editingBOM.items || []).map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    });
  };

  const handleRemoveBOMItem = (itemId: string) => {
    if (!editingBOM) return;
    
    setEditingBOM({
      ...editingBOM,
      items: (editingBOM.items || []).filter(item => item.id !== itemId)
    });
  };

  const getStoreColor = (store: string) => {
    return store === 'bannos' 
      ? 'bg-blue-100 text-blue-700 border-blue-200' 
      : 'bg-pink-100 text-pink-700 border-pink-200';
  };

  const getStageColor = (stage?: string) => {
    const colors = {
      "Filling": "bg-yellow-100 text-yellow-700 border-yellow-200",
      "Decorating": "bg-green-100 text-green-700 border-green-200",
      "Packing": "bg-purple-100 text-purple-700 border-purple-200"
    };
    return stage ? colors[stage as keyof typeof colors] : "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      {/* Header Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Stores</SelectItem>
              <SelectItem value="Bannos">Bannos</SelectItem>
              <SelectItem value="Flourlane">Flourlane</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search product title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button>
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
              <TableHead>Variant</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Components</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading BOMs...
                </TableCell>
              </TableRow>
            ) : filteredBOMs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No BOMs found matching your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredBOMs.map((bom) => (
                <TableRow key={bom.id}>
                  <TableCell className="font-medium">{bom.product_title}</TableCell>
                  <TableCell>{bom.description || "—"}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${getStoreColor(bom.store)}`}>
                      {bom.store === 'bannos' ? 'Bannos' : 'Flourlane'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={bom.is_active ? "default" : "secondary"}>
                      {bom.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {bom.items?.length || 0} components
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenBOM(bom)}
                    >
                      Open BOM
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {filteredBOMs.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No BOMs found matching your filters
          </div>
        )}
      </Card>

      {/* BOM Editor Sheet */}
      <Sheet open={isBOMEditorOpen} onOpenChange={setIsBOMEditorOpen}>
        <SheetContent className="w-[600px] sm:w-[800px]">
          <SheetHeader>
            <SheetTitle>BOM Editor</SheetTitle>
          </SheetHeader>

          {editingBOM && (
            <div className="space-y-6 mt-6">
              {/* Product Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product-title">Product Title</Label>
                  <Input
                    id="product-title"
                    value={editingBOM.product_title}
                    onChange={(e) => setEditingBOM({
                      ...editingBOM,
                      product_title: e.target.value
                    })}
                    readOnly
                    className="bg-muted/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    placeholder="e.g., 6-inch Round, Large Loaf"
                    value={editingBOM.description || ""}
                    onChange={(e) => setEditingBOM({
                      ...editingBOM,
                      description: e.target.value || undefined
                    })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch 
                  id="active"
                  checked={editingBOM.is_active}
                  onCheckedChange={(checked) => setEditingBOM({
                    ...editingBOM,
                    is_active: checked
                  })}
                />
                <Label htmlFor="active">Active BOM</Label>
              </div>

              <Separator />

              {/* BOM Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">BOM Items</h3>
                  <Button onClick={handleAddBOMItem} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Component
                  </Button>
                </div>

                <div className="space-y-3">
                  {editingBOM.items?.map((item) => (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Component</Label>
                          <Select
                            value={item.component_id}
                            onValueChange={(value) => {
                              const component = mockComponents.find(c => c.id === value);
                              handleUpdateBOMItem(item.id, {
                                component_id: value,
                                component_name: component?.name || ""
                              });
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select component" />
                            </SelectTrigger>
                            <SelectContent>
                              {mockComponents.map(component => (
                                <SelectItem key={component.id} value={component.id}>
                                  {component.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-24">
                          <Label className="text-xs text-muted-foreground">Qty per</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            value={item.quantity_per_unit}
                            onChange={(e) => handleUpdateBOMItem(item.id, {
                              quantity_per_unit: parseFloat(e.target.value) || 0
                            })}
                            className="mt-1"
                          />
                        </div>

                        <div className="w-32">
                          <Label className="text-xs text-muted-foreground">Stage (optional)</Label>
                          <Select
                            value={item.stage || ""}
                            onValueChange={(value) => handleUpdateBOMItem(item.id, {
                              stage: value as any || undefined
                            })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="Filling">Filling</SelectItem>
                              <SelectItem value="Decorating">Decorating</SelectItem>
                              <SelectItem value="Packing">Packing</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveBOMItem(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {item.stage && (
                        <div className="mt-2">
                          <Badge className={`text-xs ${getStageColor(item.stage)}`}>
                            {item.stage}
                          </Badge>
                        </div>
                      )}
                    </Card>
                  ))}

                  {(editingBOM.items?.length || 0) === 0 && (
                    <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                      No components added yet. Click "Add Component" to get started.
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Save/Cancel */}
              <div className="flex gap-2">
                <Button onClick={handleSaveBOM} className="flex-1">
                  Save BOM
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsBOMEditorOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}