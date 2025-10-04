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
import { getProductRequirements, upsertProductRequirement, getComponents, type ProductRequirement, type Component } from "../../lib/rpc-client";

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
        const componentsData = await getComponents();
        console.log('Fetched Components:', componentsData); // Debug log
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
        
        const requirementsData = await getProductRequirements(null, searchValue);
        console.log('Fetched requirements:', requirementsData); // Debug log
        
        setRequirements(requirementsData);
      } catch (error) {
        console.error('Error fetching requirements:', error);
        toast.error('Failed to load requirements');
      } finally {
        setLoading(false);
      }
    }
    fetchRequirements();
  }, [componentFilter, searchQuery]);

  // Filtering is now handled by the RPC call, so we can use requirements directly
  const filteredRequirements = requirements;

  const handleAddRequirement = () => {
    if (!newProductTitle || !newRequiredComponentId) {
      toast.error("Please fill in all required fields");
      return;
    }

    const component = components.find(c => c.id === newRequiredComponentId);
    if (!component) return;

    const requirement: ProductRequirement = {
      id: `PR${Date.now()}`,
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
  };

  const handleEditRequirement = (requirement: ProductRequirement) => {
    setEditingRequirement({ ...requirement });
    setIsEditDialogOpen(true);
  };

  const handleUpdateRequirement = () => {
    if (!editingRequirement) return;

    setRequirements(prev => prev.map(r => 
      r.id === editingRequirement.id ? editingRequirement : r
    ));
    
    setIsEditDialogOpen(false);
    setEditingRequirement(null);
    toast.success("Product requirement updated successfully");
  };

  const handleDeleteRequirement = (id: string) => {
    if (confirm("Are you sure you want to delete this product requirement?")) {
      setRequirements(prev => prev.filter(r => r.id !== id));
      toast.success("Product requirement deleted");
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
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading requirements...
                </TableCell>
              </TableRow>
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