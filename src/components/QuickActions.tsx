import { useState } from "react";
import { 
  Search, 
  Calendar, 
  AlertTriangle, 
  Camera, 
  Scan, 
  Printer, 
  Download, 
  Users, 
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Plus,
  FileText,
  MessageSquare,
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { toast } from "sonner";
import { AdminMessagingDialog } from "./admin/AdminMessagingDialog";

interface QuickActionsProps {
  store: "bannos" | "flourlane";
}

interface BakeItem {
  id: string;
  product: string;
  flavour: string;
  size: string;
  qty: number;
}

interface UrgentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  product: string;
  dueTime: string;
  priority: 'High' | 'Medium';
  store: 'Bannos' | 'Flourlane';
}

interface PhotoReview {
  id: string;
  orderNumber: string;
  customerName: string;
  product: string;
  photoUrl: string;
  status: 'OK' | 'Needs review';
  issues: string[];
}

// Mock data
const mockBakeList: BakeItem[] = [
  { id: "1", product: "Chocolate Layer Cake", flavour: "Chocolate", size: "L", qty: 8 },
  { id: "2", product: "Vanilla Cupcakes", flavour: "Vanilla", size: "S", qty: 150 },
  { id: "3", product: "Strawberry Cheesecake", flavour: "Strawberry", size: "M", qty: 6 },
  { id: "4", product: "Caramel Tiramisu", flavour: "Caramel", size: "M", qty: 12 },
  { id: "5", product: "Custom Wedding Cake", flavour: "Vanilla", size: "L", qty: 2 },
];

const mockUrgentOrders: UrgentOrder[] = [
  { id: "1", orderNumber: "BAN-001", customerName: "Sweet Delights Co.", product: "Chocolate Cupcakes", dueTime: "10:00 AM", priority: "High", store: "Bannos" },
  { id: "2", orderNumber: "FLR-003", customerName: "Chocolate Dreams", product: "Cocoa Bread", dueTime: "11:15 AM", priority: "High", store: "Flourlane" },
  { id: "3", orderNumber: "BAN-004", customerName: "Birthday Bash", product: "Caramel Cake", dueTime: "10:30 AM", priority: "High", store: "Bannos" },
  { id: "4", orderNumber: "FLR-007", customerName: "Sweet Bakery", product: "Chocolate Rolls", dueTime: "11:45 AM", priority: "Medium", store: "Flourlane" },
];

const mockPhotoReviews: PhotoReview[] = [
  { id: "1", orderNumber: "BAN-012", customerName: "Valentine Event", product: "Heart-Shaped Cake", photoUrl: "", status: "Needs review", issues: ["Blur detected", "Missing decoration"] },
  { id: "2", orderNumber: "FLR-014", customerName: "Wedding Venue", product: "Special Occasion Bread", photoUrl: "", status: "OK", issues: [] },
  { id: "3", orderNumber: "BAN-018", customerName: "Sports Team Event", product: "Team Logo Cake", photoUrl: "", status: "Needs review", issues: ["Poor lighting"] },
];

export function QuickActions({ store }: QuickActionsProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<{ store: string; orderNumber: string } | null>(null);
  const [selectedUrgentOrders, setSelectedUrgentOrders] = useState<Set<string>>(new Set());
  const [selectedPhotoReviews, setSelectedPhotoReviews] = useState<Set<string>>(new Set());
  const [showReworkDialog, setShowReworkDialog] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [initialConversationId, setInitialConversationId] = useState<string | null>(null);
  

  const actions = [
    // Original store-specific actions
    {
      id: "new-order",
      icon: Plus,
      label: "New Manual Order",
      description: "Create manual production order",
      color: store === "bannos" ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "bg-pink-50 text-pink-600 hover:bg-pink-100"
    },
    {
      id: "store-report",
      icon: FileText,
      label: store === "bannos" ? "Bannos Report" : "Flourlane Report",
      description: store === "bannos" ? "Generate store reports" : "Generate bakery reports",
      color: "bg-green-50 text-green-600 hover:bg-green-100"
    },
    // New universal actions
    {
      id: "find-order",
      icon: Search,
      label: "Find Order's Store",
      description: "Locate an order fast by number or scan",
      color: "bg-blue-50 text-blue-600 hover:bg-blue-100"
    },
    {
      id: "bake-list",
      icon: Calendar,
      label: "Bake List — This Week",
      description: "Cakes to prepare for the week",
      color: "bg-green-50 text-green-600 hover:bg-green-100"
    },
    {
      id: "urgent-jobs",
      icon: AlertTriangle,
      label: "Urgent Jobs",
      description: "High-priority orders due soon",
      color: "bg-red-50 text-red-600 hover:bg-red-100"
    },
    {
      id: "qc-photo",
      icon: Camera,
      label: "QC Photo Check",
      description: "Flag photo issues quickly",
      color: "bg-purple-50 text-purple-600 hover:bg-purple-100"
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
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock search logic
    const bannosOrders = ["BAN-001", "BAN-002", "BAN-003", "BAN-004", "BAN-005"];
    const flourlaneOrders = ["FLR-001", "FLR-002", "FLR-003", "FLR-004", "FLR-005"];
    
    if (bannosOrders.some(order => order.toLowerCase().includes(searchValue.toLowerCase()))) {
      setSearchResult({ store: "Bannos", orderNumber: searchValue.toUpperCase() });
    } else if (flourlaneOrders.some(order => order.toLowerCase().includes(searchValue.toLowerCase()))) {
      setSearchResult({ store: "Flourlane", orderNumber: searchValue.toUpperCase() });
    } else {
      setSearchResult(null);
    }
    
    setSearchLoading(false);
  };

  const handlePrint = () => {
    toast("Sent to printer.");
  };

  const handleExportCSV = () => {
    toast("CSV exported.");
  };

  const handleAssignUrgent = () => {
    const count = selectedUrgentOrders.size;
    setSelectedUrgentOrders(new Set());
    toast(`Assigned ${count} orders.`);
  };

  const handleNewOrder = () => {
    toast(`Creating new ${store === "bannos" ? "Bannos" : "Flourlane"} order...`);
  };

  const handleStoreReport = () => {
    toast(`Generating ${store === "bannos" ? "Bannos" : "Flourlane"} report...`);
  };

  const handleMarkRework = () => {
    const count = selectedPhotoReviews.size;
    setSelectedPhotoReviews(new Set());
    setShowReworkDialog(false);
    toast(`Marked ${count} orders as Rework.`);
  };


  const toggleUrgentOrder = (id: string) => {
    const newSelected = new Set(selectedUrgentOrders);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedUrgentOrders(newSelected);
  };

  const togglePhotoReview = (id: string) => {
    const newSelected = new Set(selectedPhotoReviews);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPhotoReviews(newSelected);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSearchValue("");
    setSearchResult(null);
    setSelectedUrgentOrders(new Set());
    setSelectedPhotoReviews(new Set());
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
                } else if (action.id === "store-report") {
                  handleStoreReport();
                } else if (action.id === "messages") {
                  openMessages();
                } else {
                  setActiveModal(action.id);
                }
              }}
            >
              <div className={`p-2 rounded-lg ${action.color} transition-colors`}>
                <action.icon className="h-5 w-5" />
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
        onOpenChange={setShowMessaging}
        initialConversationId={initialConversationId}
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
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                <span className="text-sm">Looking up order…</span>
              </div>
            )}

            {searchResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Found in {searchResult.store}</span>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => toast(`Opening ${searchResult.store} Queue`)}
                >
                  Open in {searchResult.store} Queue
                </Button>
              </div>
            )}

            {searchResult === null && searchValue && !searchLoading && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600" />
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

      {/* Bake List Modal */}
      <Dialog open={activeModal === "bake-list"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bake List (This Week)</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {mockBakeList.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left font-medium text-muted-foreground pb-3">Product</th>
                        <th className="text-left font-medium text-muted-foreground pb-3">Flavour</th>
                        <th className="text-left font-medium text-muted-foreground pb-3">Size</th>
                        <th className="text-left font-medium text-muted-foreground pb-3">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockBakeList.map((item) => (
                        <tr key={item.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="py-3 font-medium text-foreground">{item.product}</td>
                          <td className="py-3 text-foreground">{item.flavour}</td>
                          <td className="py-3 text-foreground">{item.size}</td>
                          <td className="py-3 text-foreground">{item.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <p className="text-xs text-muted-foreground">Based on orders due this week.</p>
                
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button variant="outline" onClick={handleExportCSV}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button className="ml-auto">
                    Open Filling Queue
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nothing to bake this week.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Urgent Jobs Modal */}
      <Dialog open={activeModal === "urgent-jobs"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Urgent Jobs (Today)</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Sorted by priority, then time.</p>
            
            {mockUrgentOrders.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {mockUrgentOrders.map((order) => (
                  <Card 
                    key={order.id} 
                    className={`p-4 cursor-pointer transition-all ${
                      selectedUrgentOrders.has(order.id) ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => toggleUrgentOrder(order.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedUrgentOrders.has(order.id)}
                        onChange={() => toggleUrgentOrder(order.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{order.orderNumber}</span>
                          <div className="flex items-center gap-2">
                            <Badge className={order.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}>
                              {order.priority}
                            </Badge>
                            <Badge variant="secondary">{order.store}</Badge>
                          </div>
                        </div>
                        
                        <div>
                          <p className="font-medium text-sm">{order.product}</p>
                          <p className="text-sm text-muted-foreground">{order.customerName}</p>
                        </div>
                        
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Due: {order.dueTime}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No urgent jobs right now.</p>
              </div>
            )}
          </div>
          
          {/* Sticky Bottom Bar */}
          {mockUrgentOrders.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm font-medium">
                {selectedUrgentOrders.size} selected
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => toast("Opening Queue")}
                >
                  Open Queue
                </Button>
                <Button 
                  onClick={handleAssignUrgent}
                  disabled={selectedUrgentOrders.size === 0}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Assign
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QC Photo Check Modal */}
      <Dialog open={activeModal === "qc-photo"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>QC Photo Check (Today)</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Auto checks for blur and missing elements when available.</p>
            
            {/* Filter Chips */}
            <div className="flex gap-2">
              <Badge variant="secondary">OK</Badge>
              <Badge variant="secondary">Needs review</Badge>
            </div>
            
            {mockPhotoReviews.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {mockPhotoReviews.map((photo) => (
                  <Card 
                    key={photo.id} 
                    className={`p-4 cursor-pointer transition-all ${
                      selectedPhotoReviews.has(photo.id) ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => togglePhotoReview(photo.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedPhotoReviews.has(photo.id)}
                        onChange={() => togglePhotoReview(photo.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{photo.orderNumber}</span>
                          <Badge className={photo.status === 'OK' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                            {photo.status}
                          </Badge>
                        </div>
                        
                        <div>
                          <p className="font-medium text-sm">{photo.product}</p>
                          <p className="text-sm text-muted-foreground">{photo.customerName}</p>
                        </div>
                        
                        {photo.issues.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {photo.issues.map((issue, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {issue}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No photos to review.</p>
              </div>
            )}
            
            {/* Footer Actions */}
            {mockPhotoReviews.length > 0 && (
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => setShowReworkDialog(true)}
                  disabled={selectedPhotoReviews.size === 0}
                >
                  Mark as Rework
                </Button>
                <Button variant="outline">
                  Open Order
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>


      {/* Rework Confirmation Dialog */}
      <AlertDialog open={showReworkDialog} onOpenChange={setShowReworkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark {selectedPhotoReviews.size} orders as Rework?</AlertDialogTitle>
            <AlertDialogDescription>
              This will flag these orders for rework and notify the production team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkRework}>
              Mark as Rework
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}