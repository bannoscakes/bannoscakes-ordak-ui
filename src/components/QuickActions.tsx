import { useState } from "react";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import {
  Search,
  Scan,
  CheckCircle2,
  AlertCircle,
  Plus,
  MessageSquare,
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
import { formatOrderNumber } from "../lib/format-utils";
import { useUnreadCount } from "../hooks/useUnreadCount";
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

  const actions = [
    {
      id: "new-order",
      icon: Plus,
      label: "New Manual Order",
      description: "Create manual production order",
      color: store === "bannos" ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900" : "bg-pink-50 dark:bg-pink-950 text-pink-600 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900"
    },
    {
      id: "find-order",
      icon: Search,
      label: "Find Order's Store",
      description: "Locate an order fast by number or scan",
      color: "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900"
    },
    {
      id: "messages",
      icon: MessageSquare,
      label: "Messages",
      description: "Team communication",
      color: "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900"
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
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">Order {searchResult.orderNumber}</div>
                    <div className="text-xs text-muted-foreground">{searchResult.productTitle}</div>
                    <div className="text-xs text-muted-foreground">{searchResult.customerName}</div>
                  </div>
                </div>

                {/* Current Stage & Status */}
                <div className="bg-muted/50 border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-muted-foreground font-medium">Current Stage</div>
                    <Badge variant="outline">{searchResult.stage}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground font-medium">Store</div>
                    <span className="text-xs font-medium text-foreground">{searchResult.store}</span>
                  </div>
                  {searchResult.assigneeName && (
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-muted-foreground font-medium">Assigned to</div>
                      <span className="text-xs font-medium text-foreground">{searchResult.assigneeName}</span>
                    </div>
                  )}
                </div>

                {/* Storage Location - PROMINENT (if set or Complete) */}
                {(searchResult.storage || searchResult.stage === 'Complete') && (
                  <div className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4">
                    <div className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Storage Location</div>
                    <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      {searchResult.storage || "Not Set"}
                    </div>
                    {searchResult.stage === 'Complete' && !searchResult.storage && (
                      <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">⚠️ Complete but storage not set</div>
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
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm text-foreground">No order found for "{searchValue}". Check the number and try again.</span>
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
    </>
  );
}
