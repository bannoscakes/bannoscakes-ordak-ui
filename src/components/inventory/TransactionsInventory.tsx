import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Search, Calendar, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { getStockTransactions, getComponents, type StockTransaction } from "../../lib/rpc-client";
import { toast } from "sonner";

export function TransactionsInventory() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("7"); // Days
  const [selectedTransaction, setSelectedTransaction] = useState<StockTransaction | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Fetch transactions from Supabase
  useEffect(() => {
    async function fetchTransactions() {
      try {
        const transactionsData = await getStockTransactions(null, null, null);
        console.log('Fetched transactions:', transactionsData); // Debug log
        
        setTransactions(transactionsData);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        toast.error('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    }
    fetchTransactions();
  }, []);

  // Filtering is now handled by the RPC call, so we can use transactions directly
  const filteredTransactions = transactions;

  const handleViewDetail = (transaction: StockTransaction) => {
    setSelectedTransaction(transaction);
    setIsDetailDialogOpen(true);
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getSourceColor = (source: string) => {
    const colors = {
      "Webhook": "bg-blue-100 text-blue-700 border-blue-200",
      "Restock": "bg-green-100 text-green-700 border-green-200",
      "Manual": "bg-orange-100 text-orange-700 border-orange-200"
    };
    return colors[source as keyof typeof colors] || "bg-gray-100 text-gray-700";
  };

  const getDeltaColor = (delta: number) => {
    return delta > 0 ? "text-green-600" : "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Header Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Order #, SKU, or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              <SelectItem value="Webhook">Deduct (Webhook)</SelectItem>
              <SelectItem value="Restock">Restock</SelectItem>
              <SelectItem value="Manual">Manual Adjust</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Transactions</div>
          <div className="text-2xl font-semibold">{filteredTransactions.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Deductions</div>
          <div className="text-2xl font-semibold text-red-600">
            {filteredTransactions.filter(t => t.delta < 0).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Restocks</div>
          <div className="text-2xl font-semibold text-green-600">
            {filteredTransactions.filter(t => t.delta > 0 && t.source === 'Restock').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Adjustments</div>
          <div className="text-2xl font-semibold text-orange-600">
            {filteredTransactions.filter(t => t.source === 'Manual').length}
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Order #</TableHead>
              <TableHead>Component</TableHead>
              <TableHead>Delta</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-mono text-xs">
                    {formatDateTime(transaction.created_at)}
                  </TableCell>
                  <TableCell>
                    {transaction.order_id ? (
                      <Button 
                        variant="link" 
                        className="h-auto p-0 font-mono text-xs"
                        onClick={() => {/* Would open order details */}}
                      >
                        {transaction.order_id}
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{transaction.component_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{transaction.component_sku}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${getDeltaColor(transaction.delta)}`}>
                      {transaction.delta > 0 ? '+' : ''}{transaction.delta}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${getSourceColor(transaction.reason)}`}>
                      {transaction.reason}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {transaction.performed_by || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetail(transaction)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!loading && transactions.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No transactions found matching your filters
          </div>
        )}
      </Card>

      {/* Transaction Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Transaction ID</Label>
                  <p className="font-mono text-sm">{selectedTransaction.id}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Timestamp</Label>
                  <p className="font-mono text-sm">{formatDateTime(selectedTransaction.timestamp)}</p>
                </div>
              </div>

              {selectedTransaction.orderNumber && (
                <div>
                  <Label className="text-xs text-muted-foreground">Order Number</Label>
                  <p className="font-mono text-sm">{selectedTransaction.orderNumber}</p>
                </div>
              )}

              <Separator />

              <div>
                <Label className="text-xs text-muted-foreground">Component</Label>
                <div className="space-y-1">
                  <p className="font-medium">{selectedTransaction.componentName}</p>
                  <p className="font-mono text-sm text-muted-foreground">{selectedTransaction.componentSku}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Delta</Label>
                  <p className={`text-lg font-semibold ${getDeltaColor(selectedTransaction.delta)}`}>
                    {selectedTransaction.delta > 0 ? '+' : ''}{selectedTransaction.delta}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Source</Label>
                  <Badge className={`text-xs ${getSourceColor(selectedTransaction.source)} mt-1`}>
                    {selectedTransaction.source}
                  </Badge>
                </div>
              </div>

              {selectedTransaction.performedBy && (
                <div>
                  <Label className="text-xs text-muted-foreground">Performed By</Label>
                  <p className="text-sm">{selectedTransaction.performedBy}</p>
                </div>
              )}

              {selectedTransaction.note && (
                <div>
                  <Label className="text-xs text-muted-foreground">Note</Label>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm">{selectedTransaction.note}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDetailDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}