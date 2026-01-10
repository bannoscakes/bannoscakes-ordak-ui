import type { ReactNode } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export interface OrderSearchResultData {
  store: string;
  orderNumber: string;
  storage: string | null;
  stage: string;
  productTitle: string;
  customerName: string;
  assigneeName: string | null;
}

interface OrderSearchResultProps {
  /** Search result data, null if not found, undefined if no search yet */
  result: OrderSearchResultData | null | undefined;
  /** Whether search is in progress */
  loading: boolean;
  /** The search query (used for "not found" message) */
  searchQuery?: string;
  /** Optional action button to show after result */
  actionButton?: ReactNode;
}

/**
 * Shared component for displaying order search results.
 * Used by QuickActions and Header search dialogs.
 */
export function OrderSearchResult({
  result,
  loading,
  searchQuery,
  actionButton,
}: OrderSearchResultProps) {
  const trimmedQuery = (searchQuery ?? "").trim();

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
        <LoadingSpinner size="sm" />
        <span className="text-sm">Looking up order…</span>
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-3">
        {/* Order Found */}
        <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <div className="flex-1">
            <div className="text-sm font-medium">Order {result.orderNumber}</div>
            <div className="text-xs text-muted-foreground">{result.productTitle}</div>
            <div className="text-xs text-muted-foreground">{result.customerName}</div>
          </div>
        </div>

        {/* Current Stage & Status */}
        <div className="bg-muted/50 border border-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted-foreground font-medium">Current Stage</div>
            <Badge variant="outline">{result.stage}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground font-medium">Store</div>
            <span className="text-xs font-medium">{result.store}</span>
          </div>
          {result.assigneeName && (
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-muted-foreground font-medium">Assigned to</div>
              <span className="text-xs font-medium">{result.assigneeName}</span>
            </div>
          )}
        </div>

        {/* Storage Location - PROMINENT (if set or Complete) */}
        {(result.storage || result.stage === 'Complete') && (
          <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-4">
            <div className="text-xs text-primary font-medium mb-1">Storage Location</div>
            <div className="text-lg font-bold text-foreground">
              {result.storage || "Not Set"}
            </div>
            {result.stage === 'Complete' && !result.storage && (
              <div className="text-xs text-warning mt-1">Warning: Complete but storage not set</div>
            )}
          </div>
        )}

        {actionButton}
      </div>
    );
  }

  // Not found state - only show if there was a search query
  if (result === null && !loading && trimmedQuery.length > 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <span className="text-sm">No order found for "{trimmedQuery}". Check the number and try again.</span>
      </div>
    );
  }

  return null;
}
