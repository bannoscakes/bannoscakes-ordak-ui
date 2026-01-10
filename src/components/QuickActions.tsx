import { useState } from "react";
import {
  Search,
  Scan,
  Plus,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { OrderSearchResult, OrderSearchResultData } from "./OrderSearchResult";
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
import { formatOrderNumber } from "../lib/format-utils";
import { useUnreadCount } from "../hooks/useUnreadCount";
import { useNewUrgentOrders } from "../hooks/useNewUrgentOrders";
import { useQueueByStore } from "../hooks/useQueueByStore";
import { UnreadBadge } from "./UnreadBadge";

interface QuickActionsProps {
  store: "bannos" | "flourlane";
}

export function QuickActions({ store }: QuickActionsProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { unreadCount } = useUnreadCount();
  const { newUrgentIds, markAsSeen } = useNewUrgentOrders();
  // Only fetch orders when dialog is open
  const { data: orders = [] } = useQueueByStore(store, { enabled: isDialogOpen });
  const [searchResult, setSearchResult] = useState<OrderSearchResultData | null | undefined>(undefined);
  const [showMessaging, setShowMessaging] = useState(false);
  const [initialConversationId, setInitialConversationId] = useState<string | null>(null);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);

  // Filter new urgent orders for this store only
  const newUrgentOrders = orders.filter(order =>
    order.priority === 'High' && newUrgentIds.has(`${store}:${order.id}`)
  );

  // Count new urgent orders for THIS store only (not all stores)
  const newUrgentCount = Array.from(newUrgentIds).filter(id => id.startsWith(`${store}:`)).length;

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
      id: "new-urgent",
      icon: AlertTriangle,
      label: "New Urgent Orders",
      description: "High priority orders this session",
      color: "bg-orange-50 text-orange-600 hover:bg-orange-100"
    },
    {
      id: "messages",
      icon: MessageSquare,
      label: "Messages",
      description: "Team communication",
      color: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
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
    setSearchResult(undefined);
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
                {action.id === "new-urgent" && newUrgentCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-1 text-xs">
                    {newUrgentCount}
                  </Badge>
                )}
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

            <OrderSearchResult
              result={searchResult}
              loading={searchLoading}
              searchQuery={searchValue}
              actionButton={
                searchResult && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => toast(`Order is in ${searchResult.stage} stage`)}
                  >
                    View Order Details
                  </Button>
                )
              }
            />

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

      {/* New Urgent Orders Dialog */}
      <Dialog
        open={activeModal === "new-urgent"}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) closeModal();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Urgent Orders</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {newUrgentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No new urgent orders</p>
                <p className="text-sm text-muted-foreground mt-2">
                  New high-priority orders for {store === 'bannos' ? 'Bannos' : 'Flourlane'} will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {newUrgentOrders.map((order) => (
                  <Card key={order.id} className="p-4 border-2 border-destructive/30">
                    <div className="space-y-3">
                      {/* Order Number */}
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-foreground">
                          {formatOrderNumber(order.shopify_order_number, store, order.id)}
                        </p>
                        <Badge className="text-xs bg-destructive text-destructive-foreground">
                          High Priority
                        </Badge>
                      </div>

                      {/* Product Title */}
                      <div>
                        <p className="text-sm text-foreground">{order.product_title}</p>
                      </div>

                      {/* Customer Name */}
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Customer: {order.customer_name}
                        </p>
                      </div>

                      {/* Stage */}
                      <div>
                        <Badge variant="outline" className="text-xs">
                          {order.stage}
                        </Badge>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            const id = order.shopify_order_number?.toString().trim();
                            if (!id) {
                              toast.error("Shopify order number not available");
                              return;
                            }
                            window.open(`https://admin.shopify.com/orders/${encodeURIComponent(id)}`, '_blank');
                            markAsSeen(`${store}:${order.id}`);
                          }}
                        >
                          View in Shopify
                        </Button>
                        <Button
                          variant="default"
                          onClick={() => {
                            markAsSeen(`${store}:${order.id}`);
                            closeModal();
                          }}
                        >
                          Mark as Seen
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
