import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Clock, Search, X } from "lucide-react";
import { toast } from "sonner";
import { OrderDetailDrawer } from "./OrderDetailDrawer";
import { EditOrderDrawer } from "./EditOrderDrawer";
import { OrderOverflowMenu } from "./OrderOverflowMenu";
import { StaffAssignmentModal } from "./StaffAssignmentModal";
import { ErrorDisplay } from "./ErrorDisplay";
// import { NetworkErrorRecovery } from "./NetworkErrorRecovery"; // Component doesn't exist
import { getQueue, getStorageLocations } from "../lib/rpc-client";
import { useErrorNotifications } from "../lib/error-notifications";

interface QueueItem {
  id: string;
  orderNumber: string;
  shopifyOrderNumber: string;
  shopifyOrderId?: number;
  customerName: string;
  product: string;
  size: 'S' | 'M' | 'L';
  quantity: number;
  deliveryTime: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'In Production' | 'Pending' | 'Quality Check' | 'Completed' | 'Scheduled';
  flavor: string;
  dueTime: string;
  method?: 'Delivery' | 'Pickup';
  storage?: string;
  assigneeId?: string;
  assigneeName?: string;
}

interface QueueTableProps {
  store: "bannos" | "flourlane";
  initialFilter?: string | null;
}

export function QueueTable({ store, initialFilter }: QueueTableProps) {
  const [queueData, setQueueData] = useState<{ [key: string]: QueueItem[] }>({});
  const [loading, setLoading] = useState(true);
  const hasInitiallyLoadedRef = useRef(false); // Use ref to avoid stale closure
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState("unassigned");
  const [selectedOrder, setSelectedOrder] = useState<QueueItem | null>(null);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [isAssigningStaff, setIsAssigningStaff] = useState(false);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [storageFilter, setStorageFilter] = useState<string | null>(null);
  const [storageLocations, setStorageLocations] = useState<string[]>([]);
  const [error, setError] = useState<unknown>(null);

  const { showErrorWithRetry } = useErrorNotifications();

  // Fetch storage locations for the current store
  useEffect(() => {
    async function fetchStorageLocations() {
      try {
        const locations = await getStorageLocations(store);
        setStorageLocations(locations);
      } catch (error) {
        console.error('Failed to fetch storage locations:', error);
        // Fallback to default locations if fetch fails
        setStorageLocations([
          "Store Fridge",
          "Store Freezer", 
          "Kitchen Coolroom",
          "Kitchen Freezer",
          "Basement Coolroom"
        ]);
      }
    }
    fetchStorageLocations();
  }, [store]);

  // Fetch queue data - wrapped in useCallback to prevent stale closures
  const fetchQueueData = useCallback(async () => {
    try {
      // Only show full loading skeleton on initial load
      if (!hasInitiallyLoadedRef.current) {
        setLoading(true);
      } else {
        // Show subtle refresh indicator for subsequent loads
        setIsRefreshing(true);
      }
      setError(null);

      // Fetch queue data using the new RPC
      const orders = await getQueue({
        store,
        storage: storageFilter,
        limit: 200,
      });

      // Group orders by stage
      const grouped: { [key: string]: QueueItem[] } = {
        unassigned: [],
        filling: [],
        covering: [],
        decorating: [],
        packing: [],
        complete: [],
      };

      orders.forEach((order: any) => {
        const item: QueueItem = {
          id: order.id,
          orderNumber: String(order.human_id || order.shopify_order_number || order.id),
          shopifyOrderNumber: String(order.shopify_order_number || ''),
          shopifyOrderId: order.shopify_order_id || undefined,
          customerName: order.customer_name || 'Unknown',
          product: order.product_title || 'Unknown',
          size: order.size || 'M',
          quantity: order.item_qty || 1,
          deliveryTime: order.due_date || '',
          priority: order.priority || 'Medium',
          status: order.assignee_id ? 'In Production' : 'Pending',
          flavor: order.flavour || '',
          dueTime: order.due_date || '',
          method: order.delivery_method === 'delivery' ? 'Delivery' : 'Pickup',
          storage: order.storage || '',
        };

        // Group by stage
        const stageKey = order.stage?.toLowerCase() || 'unassigned';
        if (!order.assignee_id && stageKey === 'filling') {
          grouped.unassigned.push(item);
        } else if (stageKey === 'packing') {
          grouped.packing.push(item);
        } else if (stageKey === 'complete') {
          grouped.complete.push(item);
        } else if (grouped[stageKey]) {
          grouped[stageKey].push(item);
        }
      });

      setQueueData(grouped);
      hasInitiallyLoadedRef.current = true; // Mark as loaded using ref (no re-render needed)
    } catch (error) {
      console.error('Failed to fetch queue:', error);
      setError(error);
      showErrorWithRetry(error, fetchQueueData, {
        title: 'Failed to Load Queue',
        showRecoveryActions: true,
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [store, storageFilter, showErrorWithRetry]); // No stale closure - ref always has current value

  // Fetch real queue data from Supabase
  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  // Reset loading state when store changes (different data source = full loading skeleton)
  useEffect(() => {
    hasInitiallyLoadedRef.current = false;
  }, [store]);

  // Set initial filter if provided
  useEffect(() => {
    if (initialFilter) {
      setSelectedStage(initialFilter);
    }
  }, [initialFilter]);

  const productionStages = [
    { value: "unassigned", label: "Unassigned", count: 0 },
    { value: "filling", label: "Filling", count: 0 },
    { value: "covering", label: "Covering", count: 0 },
    { value: "decorating", label: "Decorating", count: 0 },
    { value: "packing", label: "Packing", count: 0 },
    { value: "complete", label: "Complete", count: 0 }
  ];

  const currentItems = queueData[selectedStage] || [];

  const filteredItems = useMemo(() => {
    return currentItems.filter(item => {
      const matchesSearch = !searchQuery || 
        item.orderNumber?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
        item.customerName?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
        item.product?.toLowerCase()?.includes(searchQuery.toLowerCase());
      
      const matchesPriority = !priorityFilter || item.priority === priorityFilter;
      const matchesStatus = !statusFilter || item.status === statusFilter;
      const matchesStorage = !storageFilter || item.storage === storageFilter;
      
      return matchesSearch && matchesPriority && matchesStatus && matchesStorage;
    });
  }, [currentItems, searchQuery, priorityFilter, statusFilter, storageFilter]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Production': return 'bg-blue-100 text-blue-800';
      case 'Pending': return 'bg-gray-100 text-gray-800';
      case 'Quality Check': return 'bg-purple-100 text-purple-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Scheduled': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  const handleAssignToStaff = () => {
    if (selectedItems.length > 0 && selectedStaff) {
      // TODO: Implement staff assignment API call
      // assignOrdersToStaff(selectedItems, selectedStaff);
      setSelectedItems([]);
      setSelectedStaff(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-10 bg-muted rounded w-full"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorDisplay error={error} onRetry={fetchQueueData} />
        <ErrorDisplay
          error={error}
          title="Failed to Load Queue"
          onRetry={fetchQueueData}
          variant="card"
          showDetails={process.env.NODE_ENV === 'development'}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-x-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2>Production Queue - {store.charAt(0).toUpperCase() + store.slice(1)}</h2>
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm text-muted-foreground">
                {isRefreshing ? 'Refreshing...' : `Last updated: ${new Date().toLocaleTimeString()}`}
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={priorityFilter || "all"} onValueChange={(value) => setPriorityFilter(value === "all" ? null : value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Production">In Production</SelectItem>
                <SelectItem value="Quality Check">Quality Check</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={storageFilter || "all"} onValueChange={(value) => setStorageFilter(value === "all" ? null : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Storage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {storageLocations.map(location => (
                  <SelectItem key={location} value={location}>{location}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(priorityFilter || statusFilter || storageFilter || searchQuery) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPriorityFilter(null);
                  setStatusFilter(null);
                  setStorageFilter(null);
                  setSearchQuery("");
                }}
                className="h-10"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm">
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              </span>
              <Select value={selectedStaff || "none"} onValueChange={(value) => setSelectedStaff(value === "none" ? null : value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Assign to staff..." />
                </SelectTrigger>
                <SelectContent>
                  {/* TODO: Replace with real staff data */}
                  <SelectItem value="none">Select staff member</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAssignToStaff} disabled={!selectedStaff}>
                Assign
              </Button>
            </div>
          )}
        </div>

        {/* Production Stages */}
        <Tabs value={selectedStage} onValueChange={setSelectedStage} className="w-full">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-6">
              {productionStages.map((stage) => (
                <TabsTrigger key={stage.value} value={stage.value} className="relative">
                  {stage.label}
                  {stage.count > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] text-xs">
                      {stage.count}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {productionStages.map((stage) => (
            <TabsContent key={stage.value} value={stage.value} className="px-6 pb-6">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3>No orders in {stage.label.toLowerCase()}</h3>
                  <p>Orders will appear here when they reach this production stage</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Select All */}
                  <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
                    <Checkbox
                      checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm">
                      Select all ({filteredItems.length} items)
                    </span>
                  </div>

                  {/* Queue Items */}
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer ${
                        selectedItems.includes(item.id) ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedOrder(item)}
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => handleSelectItem(item.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Order</p>
                            <p>{item.orderNumber}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Customer</p>
                            <p className="truncate">{item.customerName}</p>
                          </div>
                          
                          <div className="hidden md:block">
                            <p className="text-sm text-muted-foreground">Product</p>
                            <p className="truncate">{item.product}</p>
                          </div>
                          
                          <div className="hidden lg:block">
                            <p className="text-sm text-muted-foreground">Due Time</p>
                            <p>{item.dueTime}</p>
                          </div>
                          
                          <div className="hidden md:block">
                            <p className="text-sm text-muted-foreground">Priority</p>
                            <Badge className={getPriorityColor(item.priority)} variant="secondary">
                              {item.priority}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Status</p>
                              <Badge className={getStatusColor(item.status)} variant="secondary">
                                {item.status}
                              </Badge>
                            </div>
                            <OrderOverflowMenu
                              item={item}
                              variant="queue"
                              onAssignToStaff={(item) => {
                                setSelectedOrder(item);
                                setIsAssigningStaff(true);
                              }}
                              onEditOrder={(item) => {
                                setSelectedOrder(item);
                                setIsEditingOrder(true);
                              }}
                              onOpenOrder={(item) => {
                                setSelectedOrder(item);
                                setIsOrderDetailOpen(true);
                              }}
                              onViewDetails={(item) => {
                                const id = item.shopifyOrderNumber?.trim();
                                if (!id) {
                                  toast.error("Shopify order number not available");
                                  return;
                                }
                                window.open(`https://admin.shopify.com/orders/${encodeURIComponent(id)}`, '_blank');
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        isOpen={isOrderDetailOpen && !isEditingOrder}
        onClose={() => {
          setIsOrderDetailOpen(false);
          setSelectedOrder(null);
        }}
        store={store}
      />

      {/* Edit Order Drawer */}
      <EditOrderDrawer
        order={selectedOrder}
        isOpen={isEditingOrder}
        onClose={() => {
          setIsEditingOrder(false);
          setSelectedOrder(null);
        }}
        onSaved={(_updatedOrder) => {
          // TODO: Implement order update functionality
          setIsEditingOrder(false);
          setSelectedOrder(null);
        }}
        store={store}
      />

      {/* Staff Assignment Modal */}
      <StaffAssignmentModal
        isOpen={isAssigningStaff}
        onClose={() => {
          setIsAssigningStaff(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        store={store}
        onAssigned={(updatedOrder) => {
          // Update the order in the queue data
          setQueueData(prev => {
            const newData = { ...prev };
            Object.keys(newData).forEach(stage => {
              newData[stage] = newData[stage].map(item => 
                item.id === updatedOrder.id ? { ...updatedOrder, shopifyOrderNumber: item.shopifyOrderNumber } : item
              );
            });
            return newData;
          });
          setIsAssigningStaff(false);
          setSelectedOrder(null);
        }}
      />
    </div>
  );
}