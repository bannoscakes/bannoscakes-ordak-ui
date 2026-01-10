import { useState } from "react";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import {
  Search,
  Scan,
  CheckCircle2,
  AlertCircle,
  Plus,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { AdminMessagingDialog } from "./admin/AdminMessagingDialog";
import { CreateManualOrderModal } from "./CreateManualOrderModal";
import { findOrder } from "../lib/rpc-client";
import { formatOrderNumber, formatDate } from "../lib/format-utils";
import { useUnreadCount } from "../hooks/useUnreadCount";
import { useQueueByStore } from "../hooks/useQueueByStore";
import { UnreadBadge } from "./UnreadBadge";

interface QuickActionsProps {
  store: "bannos" | "flourlane";
}

export function QuickActions({ store }: QuickActionsProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const { unreadCount } = useUnreadCount();
  const [searchResult, setSearchResult] = useState<{
    store: string;
    orderNumber: string;
    storage: string | null;
    stage: string;
    productTitle: string;
    customerName: string;
    assigneeName: string | null;
  } | null>(null);
  const [showMessaging, setShowMessaging] = useState(false);
  const [initialConversationId, setInitialConversationId] = useState<string | null>(null);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [urgentDialogOpen, setUrgentDialogOpen] = useState(false);

  // Fetch orders for current store to get urgent count
  const { data: orders = [] } = useQueueByStore(store);
  const urgentOrders = orders.filter(order => order.priority === 'High');

  const actions = [
    {
      id: "new-order",
      icon: Plus,
      label: "New Manual Order",
      description: "Create manual production order",
      color: store === "bannos" ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "bg-pink-50 text-pink-600 hover:bg-pink-100"
    },
    {
      id: "find-order",
      icon: Search,
      label: "Find Order's Store",
      description: "Locate an order fast by number or scan",
      color: "bg-blue-50 text-blue-600 hover:bg-blue-100"
    },
    {
      id: "messages",
      icon: MessageSquare,
      label: "Messages",
      description: "Team communication",
      color: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
    },
    {
      id: "urgent-orders",
      icon: AlertTriangle,
      label: "Urgent Orders",
      description: "High priority orders",
      color: "bg-orange-50 text-orange-600 hover:bg-orange-100"
    }
  ];

  const handleSearch = async () => {
    if (!searchValue.trim()) return;

    setSearchLoading(true);

    try {
      // Universal search across ALL stages (production + complete)
      const results = await findOrder(searchValue.trim());

      if (results && results.length > 0) {
        const order = results[0];
        setSearchResult({
          store: order.store === 'bannos' ? 'Bannos' : 'Flourlane',
          orderNumber: formatOrderNumber(order.order_number, order.store as 'bannos' | 'flourlane', order.id),
          storage: order.storage,
          stage: order.stage,
          productTitle: order.product_title,
          customerName: order.customer_name,
          assigneeName: order.assignee_name,
        });
      } else {
        setSearchResult(null);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResult(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleNewOrder = () => {
    setShowCreateOrderModal(true);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSearchValue("");
    setSearchResult(null);
  };

  const openMessages = (convId?: string) => {
    setInitialConversationId(convId ?? null);
    setShowMessaging(true);
  };

  const handleCloseMessaging = () => {
    setShowMessaging(false);
    setInitialConversationId(null);
  };

  return (
    <>
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="font-medium text-foreground">Quick Actions</h3>
          <p className="text-sm text-muted-foreground">Common tasks and operations</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="ghost"
              className="h-auto p-4 flex flex-col items-start space-y-2 hover:bg-muted/50 transition-colors"
              onClick={() => {
                if (action.id === "new-order") {
                  handleNewOrder();
                } else if (action.id === "messages") {
                  openMessages();
                } else if (action.id === "urgent-orders") {
                  setUrgentDialogOpen(true);
                } else {
                  setActiveModal(action.id);
                }
              }}
            >
              {/* Icon wrapper - badge is anchored here */}
              <div className="relative w-fit">
                <div className={`p-2 rounded-lg ${action.color} transition-colors`}>
                  <action.icon className="h-5 w-5" />
                </div>
                {action.id === "messages" && <UnreadBadge count={unreadCount} />}
                {action.id === "urgent-orders" && <UnreadBadge count={urgentOrders.length} />}
              </div>
              <div className="text-left">
                <div className="font-medium text-foreground">{action.label}</div>
              </div>
            </Button>
          ))}
        </div>
      </Card>

      {/* Admin Messaging Dialog */}
      <AdminMessagingDialog
        open={showMessaging}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseMessaging();
          } else {
            setShowMessaging(true);
          }
        }}
        initialConversationId={initialConversationId}
      />

      {/* Create Manual Order Modal */}
      <CreateManualOrderModal
        isOpen={showCreateOrderModal}
        onClose={() => setShowCreateOrderModal(false)}
        store={store}
      />

      {/* Find Order Modal */}
      <Dialog open={activeModal === "find-order"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Find Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="order-search">Order number</Label>
              <Input
                id="order-search"
                placeholder="Enter order # or scan barcode"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <p className="text-xs text-muted-foreground">You can paste an order link too.</p>
            </div>

            {searchLoading && (
              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                <LoadingSpinner size="sm" />
                <span className="text-sm">Looking up order…</span>
              </div>
            )}

            {searchResult && (
              <div className="space-y-3">
                {/* Order Found */}
                <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Order {searchResult.orderNumber}</div>
                    <div className="text-xs text-muted-foreground">{searchResult.productTitle}</div>
                    <div className="text-xs text-muted-foreground">{searchResult.customerName}</div>
                  </div>
                </div>

                {/* Current Stage & Status */}
                <div className="bg-muted/30 border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-muted-foreground font-medium">Current Stage</div>
                    <Badge variant="outline">{searchResult.stage}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground font-medium">Store</div>
                    <span className="text-xs font-medium">{searchResult.store}</span>
                  </div>
                  {searchResult.assigneeName && (
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-muted-foreground font-medium">Assigned to</div>
                      <span className="text-xs font-medium">{searchResult.assigneeName}</span>
                    </div>
                  )}
                </div>

                {/* Storage Location - PROMINENT (if set or Complete) */}
                {(searchResult.storage || searchResult.stage === 'Complete') && (
                  <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-4">
                    <div className="text-xs text-primary font-medium mb-1">Storage Location</div>
                    <div className="text-lg font-bold text-foreground">
                      {searchResult.storage || "Not Set"}
                    </div>
                    {searchResult.stage === 'Complete' && !searchResult.storage && (
                      <div className="text-xs text-warning mt-1">⚠️ Complete but storage not set</div>
                    )}
                  </div>
                )}

                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => toast(`Order is in ${searchResult.stage} stage`)}
                >
                  View Order Details
                </Button>
              </div>
            )}

            {searchResult === null && searchValue && !searchLoading && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm">No order found for "{searchValue}". Check the number and try again.</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSearch} disabled={!searchValue.trim() || searchLoading} className="flex-1">
                Search
              </Button>
              <Button variant="outline" className="flex-1">
                <Scan className="h-4 w-4 mr-2" />
                Open Scanner
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Urgent Orders Dialog */}
      <Dialog open={urgentDialogOpen} onOpenChange={setUrgentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Urgent Orders - {store === "bannos" ? "Bannos" : "Flourlane"} ({urgentOrders.length})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {urgentOrders.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No urgent orders at the moment</p>
                <p className="text-sm text-muted-foreground mt-2">
                  High priority orders will appear here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {urgentOrders.map((order) => (
                  <Card key={order.id} className="p-4 border-2 border-destructive/30 shadow-lg hover:shadow-xl hover:bg-destructive/5 transition-all">
                    <div className="space-y-3">
                      {/* Header with Store Badge */}
                      <div className="flex items-center justify-between">
                        <Badge className={`text-xs ${
                          order.store === 'bannos'
                            ? 'bg-blue-100 text-blue-700 border-blue-200'
                            : 'bg-pink-100 text-pink-700 border-pink-200'
                        }`}>
                          {order.store === 'bannos' ? 'Bannos' : 'Flourlane'}
                        </Badge>
                        <Badge className="text-xs font-semibold bg-destructive/15 text-destructive border-destructive/30">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          URGENT
                        </Badge>
                      </div>

                      {/* Order Number */}
                      <div>
                        <p className="font-medium text-foreground">
                          {order.shopify_order_number
                            ? formatOrderNumber(order.shopify_order_number, order.store as 'bannos' | 'flourlane', order.id)
                            : order.human_id || 'N/A'}
                        </p>
                      </div>

                      {/* Product Title */}
                      <div>
                        <p className="text-sm text-foreground">{order.product_title || 'N/A'}</p>
                      </div>

                      {/* Customer Name */}
                      {order.customer_name && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {order.customer_name}
                          </p>
                        </div>
                      )}

                      {/* Stage and Due Date */}
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {order.stage?.replace(/_/g, ' ')}
                        </Badge>
                        <span className={`text-xs font-medium ${order.due_date ? 'text-muted-foreground' : 'text-destructive font-bold'}`}>
                          {order.due_date ? `Due: ${formatDate(order.due_date)}` : 'No due date'}
                        </span>
                      </div>

                      {/* Method and Storage */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{order.delivery_method || 'N/A'}</span>
                        {order.storage && (
                          <Badge className="text-xs bg-accent text-accent-foreground border-border">
                            {order.storage}
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const id = order.shopify_order_number?.toString().trim();
                            if (!id) {
                              toast.error("Shopify order number not available");
                              return;
                            }
                            window.open(`https://admin.shopify.com/orders/${encodeURIComponent(id)}`, '_blank');
                          }}
                          className="w-full"
                        >
                          View in Shopify
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
