import { useState } from "react";
import { Search, User, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { OrderSearchResult, OrderSearchResultData } from "./OrderSearchResult";
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
  const [searchResult, setSearchResult] = useState<OrderSearchResultData | null>(null);

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
          <OrderSearchResult
            result={searchResult}
            loading={searchLoading}
            searchQuery={searchValue}
          />
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}