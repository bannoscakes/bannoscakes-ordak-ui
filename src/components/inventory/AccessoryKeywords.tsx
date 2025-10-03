import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
import { getAccessoryKeywords, upsertAccessoryKeyword, getComponents, type AccessoryKeyword, type Component } from "../../lib/rpc-client";

// =============================================================================
// MOCK DATA - TODO: Replace with real data from database when features are implemented
// - Accessory Keywords management (add/remove keywords)
// =============================================================================

const mockKeywords: AccessoryKeyword[] = []; // Using real data from database

export function AccessoryKeywords() {
  const [keywords, setKeywords] = useState<AccessoryKeyword[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [componentFilter, setComponentFilter] = useState("All");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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

  // Fetch keywords from Supabase
  useEffect(() => {
    async function fetchKeywords() {
      try {
        const searchValue = searchQuery.trim() || null;
        
        const keywordsData = await getAccessoryKeywords(searchValue, true);
        console.log('Fetched keywords:', keywordsData); // Debug log
        
        setKeywords(keywordsData);
      } catch (error) {
        console.error('Error fetching keywords:', error);
        toast.error('Failed to load keywords');
      } finally {
        setLoading(false);
      }
    }
    fetchKeywords();
  }, [componentFilter, searchQuery]);
  const [editingKeyword, setEditingKeyword] = useState<AccessoryKeyword | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Form states
  const [newKeyword, setNewKeyword] = useState("");
  const [newComponentId, setNewComponentId] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const filteredKeywords = keywords.filter(keyword => {
    const matchesSearch = searchQuery === "" || 
      keyword.keyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
      keyword.component_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesComponent = componentFilter === "All" || keyword.component_id === componentFilter;
    
    return matchesSearch && matchesComponent;
  });

  const handleAddKeyword = () => {
    if (!newKeyword || !newComponentId) {
      toast.error("Please fill in all required fields");
      return;
    }

    const component = components.find(c => c.id === newComponentId);
    if (!component) return;

    const keyword: AccessoryKeyword = {
      id: `AK${Date.now()}`,
      keyword: newKeyword,
      component_id: newComponentId,
      component_name: component.name,
      notes: newNotes || undefined
    };

    setKeywords(prev => [...prev, keyword]);
    setIsAddDialogOpen(false);
    resetForm();
    toast.success("Keyword added successfully");
  };

  const handleEditKeyword = (keyword: AccessoryKeyword) => {
    setEditingKeyword({ ...keyword });
    setIsEditDialogOpen(true);
  };

  const handleUpdateKeyword = () => {
    if (!editingKeyword) return;

    setKeywords(prev => prev.map(k => 
      k.id === editingKeyword.id ? editingKeyword : k
    ));
    
    setIsEditDialogOpen(false);
    setEditingKeyword(null);
    toast.success("Keyword updated successfully");
  };

  const handleDeleteKeyword = (id: string) => {
    if (confirm("Are you sure you want to delete this keyword?")) {
      setKeywords(prev => prev.filter(k => k.id !== id));
      toast.success("Keyword deleted");
    }
  };

  const resetForm = () => {
    setNewKeyword("");
    setNewComponentId("");
    setNewNotes("");
  };

  return (
    <div className="space-y-6">
      {/* Header Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search keywords..."
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
            Add Keyword
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keyword / Phrase</TableHead>
              <TableHead>Component</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Loading keywords...
                </TableCell>
              </TableRow>
            ) : keywords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No keywords found matching your filters
                </TableCell>
              </TableRow>
            ) : (
              keywords.map((keyword) => (
                <TableRow key={keyword.id}>
                  <TableCell className="font-medium">{keyword.keyword}</TableCell>
                  <TableCell>{keyword.component_name}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {keyword.match_type} (Priority: {keyword.priority})
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditKeyword(keyword)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteKeyword(keyword.id)}
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

        {!loading && keywords.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No keywords found matching your filters
          </div>
        )}
      </Card>

      {/* Add Keyword Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Keyword</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyword">Keyword / Phrase</Label>
              <Input
                id="keyword"
                placeholder="e.g., Spiderman, Marvel Spidey"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="component">Component</Label>
              <Select value={newComponentId} onValueChange={setNewComponentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select component" />
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

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional context or notes..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="min-h-20"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleAddKeyword} className="flex-1">
                Add Keyword
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

      {/* Edit Keyword Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Keyword</DialogTitle>
          </DialogHeader>
          {editingKeyword && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-keyword">Keyword / Phrase</Label>
                <Input
                  id="edit-keyword"
                  value={editingKeyword.keyword}
                  onChange={(e) => setEditingKeyword({
                    ...editingKeyword,
                    keyword: e.target.value
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-component">Component</Label>
                <Select 
                  value={editingKeyword.component_id} 
                  onValueChange={(value) => {
                    const component = components.find(c => c.id === value);
                    setEditingKeyword({
                      ...editingKeyword,
                      component_id: value,
                      component_name: component?.name || ""
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

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes (optional)</Label>
                <Textarea
                  id="edit-notes"
                  value={editingKeyword.notes || ""}
                  onChange={(e) => setEditingKeyword({
                    ...editingKeyword,
                    notes: e.target.value || undefined
                  })}
                  className="min-h-20"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleUpdateKeyword} className="flex-1">
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