import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { getProductRequirementsCached, upsertProductRequirement, getComponentsCached, invalidateInventoryCache, type ProductRequirement, type Component } from "../../lib/rpc-client";

export function ProductRequirements() {
  const [requirements, setRequirements] = useState<ProductRequirement[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState("All");
  const [componentFilter, setComponentFilter] = useState("All");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<ProductRequirement | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Form states
  const [newProductTitle, setNewProductTitle] = useState("");
  const [newVariant, setNewVariant] = useState("");
  const [newStore, setNewStore] = useState<"bannos" | "flourlane">("bannos");
  const [newRequiredComponentId, setNewRequiredComponentId] = useState("");

  // Fetch components from Supabase
  useEffect(() => {
    async function fetchComponents() {
      try {
        const componentsData = await getComponentsCached({});
        setComponents(componentsData);
      } catch (error) {
        console.error('Error fetching components:', error);
        toast.error('Failed to load components');
      }
    }
    fetchComponents();
  }, []);

  // Fetch requirements from Supabase
  useEffect(() => {
    async function fetchRequirements() {
      try {
        const searchValue = searchQuery.trim() || null;
        
        const requirementsData = await getProductRequirementsCached(null, searchValue);
        
        setRequirements(requirementsData);
      } catch (error) {
        console.error('Error fetching requirements:', error);
        toast.error('Failed to load requirements');
      } finally {
        setLoading(false);
      }
    }
    fetchRequirements();
  }, [searchQuery]); // Removed componentFilter from dependencies since it's client-side only

  // Client-side filtering by component
  const filteredRequirements = requirements.filter(requirement => {
    const matchesComponent = componentFilter === "All" || requirement.component_id === componentFilter;
    return matchesComponent;
  });

  const handleAddRequirement = async () => {
    if (!newProductTitle || !newRequiredComponentId) {
      toast.error("Please fill in all required fields");
      return;
    }

    const component = components.find(c => c.id === newRequiredComponentId);
    if (!component) return;

    try {
      const requirementId = await upsertProductRequirement({
        shopify_product_id: `${newStore}-${newProductTitle.toLowerCase().replace(/\s+/g, '-')}`,
        shopify_variant_id: newVariant || "",
        product_title: newProductTitle,
        component_id: newRequiredComponentId,
        quantity_per_unit: 1,
        is_optional: false,
        auto_deduct: true
      });

      // Invalidate cache after mutation
      invalidateInventoryCache();

      const requirement: ProductRequirement = {
        id: requirementId,
        shopify_product_id: `${newStore}-${newProductTitle.toLowerCase().replace(/\s+/g, '-')}`,
        shopify_variant_id: newVariant || "",
        product_title: newProductTitle,
        component_id: newRequiredComponentId,
        component_name: component.name,
        component_sku: component.sku,
        quantity_per_unit: 1,
        is_optional: false,
        auto_deduct: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setRequirements(prev => [...prev, requirement]);
      setIsAddDialogOpen(false);
      resetForm();
      toast.success("Product requirement added successfully");
    } catch (error) {
      console.error('Error adding requirement:', error);
      toast.error('Failed to add requirement');
    }
  };

  const handleEditRequirement = (requirement: ProductRequirement) => {
    setEditingRequirement({ ...requirement });
    setIsEditDialogOpen(true);
  };

  const handleUpdateRequirement = async () => {
    if (!editingRequirement) return;

    try {
      await upsertProductRequirement({
        id: editingRequirement.id,
        shopify_product_id: editingRequirement.shopify_product_id,
        shopify_variant_id: editingRequirement.shopify_variant_id,
        product_title: editingRequirement.product_title,
        component_id: editingRequirement.component_id,
        quantity_per_unit: editingRequirement.quantity_per_unit,
        is_optional: editingRequirement.is_optional,
        auto_deduct: editingRequirement.auto_deduct
      });

      // Invalidate cache after mutation
      invalidateInventoryCache();

      setRequirements(prev => prev.map(r => 
        r.id === editingRequirement.id ? editingRequirement : r
      ));
      
      setIsEditDialogOpen(false);
      setEditingRequirement(null);
      toast.success("Product requirement updated successfully");
    } catch (error) {
      console.error('Error updating requirement:', error);
      toast.error('Failed to update requirement');
    }
  };

  const handleDeleteRequirement = async (id: string) => {
    if (confirm("Are you sure you want to delete this product requirement?")) {
      try {
        // TODO: Implement actual delete RPC when available
        // For now, we'll just remove from local state
        // This should be replaced with a proper delete RPC call
        setRequirements(prev => prev.filter(r => r.id !== id));
        toast.success("Product requirement deleted");
      } catch (error) {
        console.error('Error deleting requirement:', error);
        toast.error('Failed to delete requirement');
      }
    }
  };

  const resetForm = () => {
    setNewProductTitle("");
    setNewVariant("");
    setNewStore("bannos");
    setNewRequiredComponentId("");
  };

  const getStoreColor = (store: string) => {
    return store === 'bannos' 
      ? 'bg-blue-100 text-blue-700 border-blue-200' 
      : 'bg-pink-100 text-pink-700 border-pink-200';
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
          
          <Select value={componentFilter} onValueChange={setComponentFilter}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Components</SelectItem>
              {components.map(component => (
                <SelectItem key={component.id} value={component.id}>
                  {component.name} ({component.sku})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Requirement
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
              <TableHead>Required Component</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeleton rows
              <>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 bg-muted rounded w-48 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-32 animate-pulse" /></TableCell>
                    <TableCell><div className="h-6 bg-muted rounded w-20 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-40 animate-pulse" /></TableCell>
                    <TableCell><div className="h-8 bg-muted rounded w-24 animate-pulse" /></TableCell>
                  </TableRow>
                ))}
              </>
            ) : requirements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No product requirements found matching your filters
                </TableCell>
              </TableRow>
            ) : (
              requirements.map((requirement) => (
                <TableRow key={requirement.id}>
                  <TableCell className="font-medium">{requirement.product_title}</TableCell>
                  <TableCell>{requirement.shopify_variant_id || "—"}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${getStoreColor(requirement.shopify_product_id.includes('bannos') ? 'bannos' : 'flourlane')}`}>
                      {requirement.shopify_product_id.includes('bannos') ? 'Bannos' : 'Flourlane'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{requirement.component_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Qty: {requirement.quantity_per_unit} {requirement.is_optional ? '(Optional)' : ''}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRequirement(requirement)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRequirement(requirement.id)}
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

        {!loading && requirements.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No product requirements found matching your filters
          </div>
        )}
      </Card>

      {/* Add Requirement Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Product Requirement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-title">Product Title</Label>
              <Input
                id="product-title"
                placeholder="e.g., Spiderman Theme Cake"
                value={newProductTitle}
                onChange={(e) => setNewProductTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="variant">Variant (optional)</Label>
              <Input
                id="variant"
                placeholder="e.g., 6-inch Round, 3-Tier"
                value={newVariant}
                onChange={(e) => setNewVariant(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store">Store</Label>
              <Select value={newStore} onValueChange={(value: any) => setNewStore(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bannos">Bannos</SelectItem>
                  <SelectItem value="flourlane">Flourlane</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="required-component">Required Component</Label>
              <Select value={newRequiredComponentId} onValueChange={setNewRequiredComponentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select required component" />
                </SelectTrigger>
                <SelectContent>
                  {components.map(component => (
                    <SelectItem key={component.id} value={component.id}>
                      {component.name} ({component.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleAddRequirement} className="flex-1">
                Add Requirement
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Requirement Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Product Requirement</DialogTitle>
          </DialogHeader>
          {editingRequirement && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-product-title">Product Title</Label>
                <Input
                  id="edit-product-title"
                  value={editingRequirement.product_title}
                  onChange={(e) => setEditingRequirement({
                    ...editingRequirement,
                    product_title: e.target.value
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-variant">Variant (optional)</Label>
                <Input
                  id="edit-variant"
                  value={editingRequirement.shopify_variant_id || ""}
                  onChange={(e) => setEditingRequirement({
                    ...editingRequirement,
                    shopify_variant_id: e.target.value
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-store">Store</Label>
                <Select 
                  value={editingRequirement.shopify_product_id.includes('bannos') ? 'bannos' : 'flourlane'} 
                  onValueChange={(value: any) => setEditingRequirement({
                    ...editingRequirement,
                    shopify_product_id: `${value}-${editingRequirement.product_title.toLowerCase().replace(/\s+/g, '-')}`
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bannos">Bannos</SelectItem>
                    <SelectItem value="flourlane">Flourlane</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-required-component">Required Component</Label>
                <Select 
                  value={editingRequirement.component_id} 
                  onValueChange={(value) => {
                    const component = components.find(c => c.id === value);
                    setEditingRequirement({
                      ...editingRequirement,
                      component_id: value,
                      component_name: component?.name || "",
                      component_sku: component?.sku || ""
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {components.map(component => (
                      <SelectItem key={component.id} value={component.id}>
                        {component.name} ({component.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleUpdateRequirement} className="flex-1">
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
    </div>
  );
}