import { useState } from "react";
import { Search, User, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { findOrder } from "../lib/rpc-client";
import { useInvalidateDashboard } from "../hooks/useDashboardQueries";
import { formatOrderNumber } from "../lib/format-utils";

interface HeaderProps {
  onSignOut?: () => void;
}

export function Header({ onSignOut }: HeaderProps) {
  const invalidateDashboard = useInvalidateDashboard();
  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    store: string;
    orderNumber: string;
    storage: string | null;
    stage: string;
    productTitle: string;
    customerName: string;
    assigneeName: string | null;
  } | null>(null);

  const handleSearch = async () => {
    if (!searchValue.trim()) return;
    
    setSearchLoading(true);
    
    try {
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

  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      // Refetch all dashboard queries - waits for completion
      await invalidateDashboard();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
    <header className="bg-background border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-2xl font-medium text-foreground">Multi-Store Production Dashboard</h2>
            <p className="text-sm text-muted-foreground">Monday, September 1, 2025 • Bannos & Flourlane Operations</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Orders"
                className="pl-10 w-64 bg-input-background border-border focus:bg-background"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchValue.trim()) {
                    setSearchOpen(true);
                    handleSearch();
                  }
                }}
              />
            </div>
            <Button
              onClick={() => {
                if (searchValue.trim()) {
                  setSearchOpen(true);
                  handleSearch();
                }
              }}
              disabled={!searchValue.trim()}
            >
              Search
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
              aria-label={refreshing ? "Refreshing dashboard" : "Refresh dashboard"}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {!refreshing && <span className="hidden sm:inline">Refresh</span>}
            </Button>
            <Button variant="ghost" size="sm">
              <User className="h-5 w-5" />
            </Button>
            {onSignOut && (
              <Button variant="outline" size="sm" onClick={onSignOut}>
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>

    {/* Search Result Dialog */}
    <Dialog open={searchOpen} onOpenChange={(open) => {
      setSearchOpen(open);
      if (!open) {
        setSearchValue("");
        setSearchResult(null);
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Find Order</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {searchLoading && (
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <LoadingSpinner size="sm" />
              <span className="text-sm">Looking up order…</span>
            </div>
          )}

          {searchResult && (
            <div className="space-y-3">
              {/* Order Found */}
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Order {searchResult.orderNumber}</div>
                  <div className="text-xs text-gray-600">{searchResult.productTitle}</div>
                  <div className="text-xs text-gray-600">{searchResult.customerName}</div>
                </div>
              </div>

              {/* Current Stage & Status */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-slate-600 font-medium">Current Stage</div>
                  <Badge variant="outline">{searchResult.stage}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-600 font-medium">Store</div>
                  <span className="text-xs font-medium">{searchResult.store}</span>
                </div>
                {searchResult.assigneeName && (
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-slate-600 font-medium">Assigned to</div>
                    <span className="text-xs font-medium">{searchResult.assigneeName}</span>
                  </div>
                )}
              </div>

              {/* Storage Location - PROMINENT (if set or Complete) */}
              {(searchResult.storage || searchResult.stage === 'Complete') && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                  <div className="text-xs text-blue-700 font-medium mb-1">Storage Location</div>
                  <div className="text-lg font-bold text-blue-900">
                    {searchResult.storage || "Not Set"}
                  </div>
                  {searchResult.stage === 'Complete' && !searchResult.storage && (
                    <div className="text-xs text-orange-600 mt-1">⚠️ Complete but storage not set</div>
                  )}
                </div>
              )}
            </div>
          )}

          {searchResult === null && searchValue && !searchLoading && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm">No order found for "{searchValue}". Check the number and try again.</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}