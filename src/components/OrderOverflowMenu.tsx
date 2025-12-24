import { MoreHorizontal } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface QueueItem {
  id: string;
  orderNumber: string;
  customerName: string;
  product: string;
  size: string;
  quantity: number;
  deliveryTime: string | null;
  priority: 'High' | 'Medium' | 'Low' | null;
  status: 'In Production' | 'Pending' | 'Quality Check' | 'Completed' | 'Scheduled';
  flavor: string;
  dueTime: string | null;
  method?: 'Delivery' | 'Pickup';
  storage?: string;
}

interface OrderOverflowMenuProps {
  item: QueueItem | any;
  variant: 'queue' | 'complete' | 'dashboard';
  onAssignToStaff?: (item: QueueItem | any) => void;
  onEditOrder?: (item: QueueItem | any) => void;
  onOpenOrder: (item: QueueItem | any) => void;
  onViewDetails: (item: QueueItem | any) => void;
}

export function OrderOverflowMenu({ 
  item, 
  variant, 
  onAssignToStaff, 
  onEditOrder, 
  onOpenOrder, 
  onViewDetails 
}: OrderOverflowMenuProps) {
  const isReadOnly = variant === 'complete' || variant === 'dashboard';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-11 w-11 p-0">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!isReadOnly && (
          <>
            <DropdownMenuItem onClick={() => onAssignToStaff?.(item)}>
              Assign to Staff
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditOrder?.(item)}>
              Edit Order
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onClick={() => onOpenOrder(item)}>
          Open Order
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onViewDetails(item)}>
          View Details
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}