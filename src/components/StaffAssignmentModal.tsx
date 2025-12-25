import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Loader2, User, UserX } from "lucide-react";
import { toast } from "sonner";
import { getStaffList, type StaffMember } from "../lib/rpc-client";
import { useAssignStaff, useUnassignStaff } from "../hooks/useQueueMutations";
import { formatOrderNumber, formatDate } from "../lib/format-utils";

interface QueueItem {
  id: string;
  orderNumber: string;
  shopifyOrderNumber?: string;
  customerName: string;
  product: string;
  size: string;
  quantity: number;
  dueDate: string | null;
  priority: 'High' | 'Medium' | 'Low' | null;
  status: 'In Production' | 'Pending' | 'Quality Check' | 'Completed' | 'Scheduled';
  flavour: string;
  method?: 'Delivery' | 'Pickup';
  storage?: string;
  store?: 'bannos' | 'flourlane';
  assigneeId?: string;
  assigneeName?: string;
}

interface StaffAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: QueueItem | null;
  store: "bannos" | "flourlane";
  onAssigned: (order: QueueItem) => void;
}

export function StaffAssignmentModal({
  isOpen,
  onClose,
  order,
  store,
  onAssigned
}: StaffAssignmentModalProps) {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [staffLoading, setStaffLoading] = useState(false);

  // Use centralized mutation hooks for cache invalidation
  const assignMutation = useAssignStaff();
  const unassignMutation = useUnassignStaff();
  const loading = assignMutation.isPending || unassignMutation.isPending;

  // Load staff list when modal opens
  useEffect(() => {
    if (isOpen && order) {
      loadStaffList();
      // Set current assignee if any
      setSelectedStaffId(order.assigneeId || "");
    }
  }, [isOpen, order]);

  const loadStaffList = async () => {
    try {
      setStaffLoading(true);
      const staff = await getStaffList(null, true); // Get all active staff
      setStaffList(staff);
    } catch (error) {
      console.error('Error loading staff list:', error);
      toast.error('Failed to load staff list');
    } finally {
      setStaffLoading(false);
    }
  };

  const handleAssign = () => {
    if (!order || !selectedStaffId) return;

    if (selectedStaffId === "unassign") {
      // Unassign staff
      unassignMutation.mutate(
        { orderId: order.id, store },
        {
          onSuccess: () => {
            toast.success('Order unassigned successfully');

            const updatedOrder = {
              ...order,
              assigneeId: undefined,
              assigneeName: undefined
            };
            onAssigned(updatedOrder);
            onClose();
          },
          onError: (error) => {
            console.error('Error unassigning staff:', error);
            toast.error('Failed to unassign order');
          }
        }
      );
    } else {
      // Assign to staff
      assignMutation.mutate(
        { orderId: order.id, store, staffId: selectedStaffId },
        {
          onSuccess: () => {
            const assignedStaff = staffList.find(s => s.user_id === selectedStaffId);
            toast.success(`Order assigned to ${assignedStaff?.full_name || 'staff member'}`);

            const updatedOrder = {
              ...order,
              assigneeId: selectedStaffId,
              assigneeName: assignedStaff?.full_name
            };
            onAssigned(updatedOrder);
            onClose();
          },
          onError: (error) => {
            console.error('Error assigning staff:', error);
            toast.error('Failed to assign staff');
          }
        }
      );
    }
  };

  const handleClose = () => {
    setSelectedStaffId("");
    onClose();
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Order to Staff</DialogTitle>
          <DialogDescription>
            Assign order {formatOrderNumber(order.shopifyOrderNumber || order.orderNumber, store)} for {order.customerName} to a staff member.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Assignment */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Current Assignment</span>
            </div>
            {order.assigneeName ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {order.assigneeName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{order.assigneeName}</span>
                <Badge variant="secondary" className="text-xs">Assigned</Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserX className="h-4 w-4" />
                <span className="text-sm">Unassigned</span>
              </div>
            )}
          </div>

          {/* Staff Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Staff Member</label>
            {staffLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading staff...</span>
              </div>
            ) : (
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose staff member or unassign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassign">
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4" />
                      <span>Unassign</span>
                    </div>
                  </SelectItem>
                  {staffList.map((staff) => (
                    <SelectItem key={staff.user_id} value={staff.user_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-xs">
                            {staff.full_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm">{staff.full_name}</span>
                          <span className="text-xs text-muted-foreground">{staff.role}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Order Info */}
          <div className="p-3 bg-muted/30 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Product:</span>
              <span>{order.product}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Priority:</span>
              <Badge
                variant="secondary"
                className={`text-xs ${
                  order.priority === 'High' ? 'bg-red-100 text-red-700' :
                  order.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                  order.priority === 'Low' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}
              >
                {order.priority || '-'}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Due:</span>
              <span className={order.dueDate ? '' : 'text-red-600 font-bold'}>{order.dueDate ? formatDate(order.dueDate) : 'No due date'}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={loading || staffLoading || selectedStaffId === order.assigneeId}
          >
            {loading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                {selectedStaffId === "unassign" ? "Unassigning..." : "Assigning..."}
              </>
            ) : (
              selectedStaffId === "unassign" ? "Unassign" : "Assign"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
