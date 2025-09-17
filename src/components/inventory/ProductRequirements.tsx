import { useState } from "react";
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

interface ProductRequirement {
  id: string;
  productTitle: string;
  variant?: string;
  store: "bannos" | "flourlane";
  requiredComponentId: string;
  requiredComponentName: string;
}

const mockComponents = [
  { id: "C003", name: "Spiderman Cake Topper" },
  { id: "C009", name: "Batman Cake Topper" },
  { id: "C010", name: "Princess Crown Topper" },
  { id: "C011", name: "Wedding Cake Flowers" },
  { id: "C012", name: "Birthday Banner" },
  { id: "C013", name: "Chocolate Drip" },
  { id: "C014", name: "Gold Leaf Decoration" }
];

const mockRequirements: ProductRequirement[] = [
  {
    id: "PR001",
    productTitle: "Spiderman Theme Cake",
    store: "bannos",
    requiredComponentId: "C003",
    requiredComponentName: "Spiderman Cake Topper"
  },
  {
    id: "PR002",
    productTitle: "Batman Birthday Cake",
    variant: "6-inch Round",
    store: "bannos",
    requiredComponentId: "C009",
    requiredComponentName: "Batman Cake Topper"
  },
  {
    id: "PR003",
    productTitle: "Princess Castle Cake",
    store: "bannos",
    requiredComponentId: "C010",
    requiredComponentName: "Princess Crown Topper"
  },
  {
    id: "PR004",
    productTitle: "Elegant Wedding Cake",
    variant: "3-Tier",
    store: "bannos",
    requiredComponentId: "C011",
    requiredComponentName: "Wedding Cake Flowers"
  },
  {
    id: "PR005",
    productTitle: "Premium Birthday Celebration",
    store: "flourlane",
    requiredComponentId: "C014",
    requiredComponentName: "Gold Leaf Decoration"
  }
];

export function ProductRequirements() {
  const [requirements, setRequirements] = useState<ProductRequirement[]>(mockRequirements);
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

  const filteredRequirements = requirements.filter(requirement => {
    const matchesSearch = searchQuery === "" || 
      requirement.productTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (requirement.variant && requirement.variant.toLowerCase().includes(searchQuery.toLowerCase())) ||
      requirement.requiredComponentName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStore = storeFilter === "All" || requirement.store === storeFilter.toLowerCase();
    const matchesComponent = componentFilter === "All" || requirement.requiredComponentId === componentFilter;
    
    return matchesSearch && matchesStore && matchesComponent;
  });

  const handleAddRequirement = () => {
    if (!newProductTitle || !newRequiredComponentId) {
      toast.error("Please fill in all required fields");
      return;
    }

    const component = mockComponents.find(c => c.id === newRequiredComponentId);
    if (!component) return;

    const requirement: ProductRequirement = {
      id: `PR${Date.now()}`,
      productTitle: newProductTitle,
      variant: newVariant || undefined,
      store: newStore,
      requiredComponentId: newRequiredComponentId,
      requiredComponentName: component.name
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
              {mockComponents.map(component => (
                <SelectItem key={component.id} value={component.id}>
                  {component.name}
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
            {filteredRequirements.map((requirement) => (
              <TableRow key={requirement.id}>
                <TableCell className="font-medium">{requirement.productTitle}</TableCell>
                <TableCell>{requirement.variant || "—"}</TableCell>
                <TableCell>
                  <Badge className={`text-xs ${getStoreColor(requirement.store)}`}>
                    {requirement.store === 'bannos' ? 'Bannos' : 'Flourlane'}
                  </Badge>
                </TableCell>
                <TableCell>{requirement.requiredComponentName}</TableCell>
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
            ))}
          </TableBody>
        </Table>

        {filteredRequirements.length === 0 && (
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
                  {mockComponents.map(component => (
                    <SelectItem key={component.id} value={component.id}>
                      {component.name}
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
                  value={editingRequirement.productTitle}
                  onChange={(e) => setEditingRequirement({
                    ...editingRequirement,
                    productTitle: e.target.value
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-variant">Variant (optional)</Label>
                <Input
                  id="edit-variant"
                  value={editingRequirement.variant || ""}
                  onChange={(e) => setEditingRequirement({
                    ...editingRequirement,
                    variant: e.target.value || undefined
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-store">Store</Label>
                <Select 
                  value={editingRequirement.store} 
                  onValueChange={(value: any) => setEditingRequirement({
                    ...editingRequirement,
                    store: value
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
                  value={editingRequirement.requiredComponentId} 
                  onValueChange={(value) => {
                    const component = mockComponents.find(c => c.id === value);
                    setEditingRequirement({
                      ...editingRequirement,
                      requiredComponentId: value,
                      requiredComponentName: component?.name || ""
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
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