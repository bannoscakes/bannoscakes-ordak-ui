import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { RotateCcw, Settings, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { toast } from "sonner";
import { restockOrder, updateComponentStock, getComponents, getComponentsCached, invalidateInventoryCache, type Component } from "../../lib/rpc-client";

export function ToolsInventory() {
  // Restock Order states
  const [restockOrderNumber, setRestockOrderNumber] = useState("");
  const [restockLoading, setRestockLoading] = useState(false);

  // Manual Adjust states
  const [adjustComponentId, setAdjustComponentId] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Real components from database
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch components from Supabase
  useEffect(() => {
    async function fetchComponents() {
      try {
        const componentsData = await getComponentsCached({});
        setComponents(componentsData);
      } catch (error) {
        console.error('Error fetching components:', error);
        toast.error('Failed to load components');
      } finally {
        setLoading(false);
      }
    }
    fetchComponents();
  }, []);

  const handleRestockOrder = async () => {
    if (!restockOrderNumber.trim()) {
      toast.error("Please enter an order number");
      return;
    }

    if (!confirm(`Are you sure you want to reverse inventory for order ${restockOrderNumber}?`)) {
      return;
    }

    setRestockLoading(true);
    
    try {
      await restockOrder(restockOrderNumber);
      
      // Invalidate cache after mutation
      invalidateInventoryCache();
      
      setRestockOrderNumber("");
      toast.success("Order restocked successfully");
    } catch (error) {
      console.error('Error restocking order:', error);
      toast.error('Failed to restock order');
    } finally {
      setRestockLoading(false);
    }
  };

  const handleManualAdjust = async () => {
    if (!adjustComponentId || !adjustDelta || !adjustReason.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const delta = parseInt(adjustDelta);
    if (isNaN(delta) || delta === 0) {
      toast.error("Please enter a valid delta value");
      return;
    }

    const component = components.find(c => c.id === adjustComponentId);
    if (!component) return;

    const newStock = component.current_stock + delta;
    if (newStock < 0) {
      toast.error("Adjustment would result in negative stock");
      return;
    }

    setAdjustLoading(true);
    
    try {
      await updateComponentStock({
        component_id: adjustComponentId,
        delta: delta,
        reason: adjustReason,
      });
      
      // Invalidate cache after mutation
      invalidateInventoryCache();
      
      setAdjustComponentId("");
      setAdjustDelta("");
      setAdjustReason("");
      toast.success("Stock updated successfully");
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Failed to adjust stock');
    } finally {
      setAdjustLoading(false);
    }
  };

  const getSelectedComponent = () => {
    return components.find(c => c.id === adjustComponentId);
  };

  const calculateNewStock = () => {
    const component = getSelectedComponent();
    if (!component || !adjustDelta) return null;
    
    const delta = parseInt(adjustDelta);
    if (isNaN(delta)) return null;
    
    return component.current_stock + delta;
  };

  return (
    <div className="space-y-8">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          These tools perform direct inventory operations. Use with caution in production environments.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Restock Order Tool */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <RotateCcw className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Restock Order</h3>
                <p className="text-sm text-muted-foreground">
                  Reverse inventory deductions for a completed order
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="restock-order">Order Number</Label>
                <Input
                  id="restock-order"
                  placeholder="e.g., BAN-001, FLR-007"
                  value={restockOrderNumber}
                  onChange={(e) => setRestockOrderNumber(e.target.value)}
                  disabled={restockLoading}
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Warning</p>
                    <p>This will add back all components that were deducted when the order was completed. Only use this for cancelled or returned orders.</p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleRestockOrder} 
                disabled={!restockOrderNumber.trim() || restockLoading}
                className="w-full"
              >
                {restockLoading ? "Processing..." : "Restock Order"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Manual Adjust Tool */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Settings className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Manual Adjust</h3>
                <p className="text-sm text-muted-foreground">
                  Manually adjust stock levels for any component
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adjust-component">Component</Label>
                <Select 
                  value={adjustComponentId} 
                  onValueChange={setAdjustComponentId}
                  disabled={adjustLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select component to adjust" />
                  </SelectTrigger>
                  <SelectContent>
                    {loading ? (
                      <SelectItem value="loading" disabled>Loading components...</SelectItem>
                    ) : components.length === 0 ? (
                      <SelectItem value="no-components" disabled>No components found</SelectItem>
                    ) : (
                      components.map(component => (
                        <SelectItem key={component.id} value={component.id}>
                          <div className="flex flex-col items-start">
                            <span>{component.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {component.sku} • Current: {component.current_stock}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adjust-delta">Delta (+/-)</Label>
                <Input
                  id="adjust-delta"
                  type="number"
                  placeholder="e.g., +10, -5"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  disabled={adjustLoading}
                />
                {getSelectedComponent() && adjustDelta && (
                  <div className="text-xs text-muted-foreground">
                    New stock will be: <span className="font-medium">
                      {calculateNewStock()}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adjust-reason">Reason</Label>
                <Textarea
                  id="adjust-reason"
                  placeholder="Explain why this adjustment is needed..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  disabled={adjustLoading}
                  className="min-h-20"
                />
              </div>

              {calculateNewStock() !== null && calculateNewStock()! < 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-800 font-medium">
                      Warning: This would result in negative stock
                    </span>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleManualAdjust} 
                disabled={!adjustComponentId || !adjustDelta || !adjustReason.trim() || adjustLoading || (calculateNewStock() !== null && calculateNewStock()! < 0)}
                className="w-full"
              >
                {adjustLoading ? "Applying..." : "Apply Adjustment"}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Usage Guidelines */}
      <Card className="p-6 bg-muted/20">
        <h4 className="font-medium mb-3">Usage Guidelines</h4>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Restock Order:</strong> Use only when an order has been cancelled or returned after inventory was already deducted. This will reverse all component deductions made during order completion.
          </p>
          <p>
            <strong>Manual Adjust:</strong> Use for physical inventory corrections, damaged goods, or other adjustments not covered by normal order processing. All manual adjustments are logged in the Transactions tab.
          </p>
          <p>
            <strong>Audit Trail:</strong> All operations performed using these tools are recorded with timestamps, user information, and reasons for audit purposes.
          </p>
        </div>
      </Card>
    </div>
  );
}