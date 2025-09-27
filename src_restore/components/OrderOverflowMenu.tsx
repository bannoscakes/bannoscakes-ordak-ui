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
  size: 'S' | 'M' | 'L';
  quantity: number;
  deliveryTime: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'In Production' | 'Pending' | 'Quality Check' | 'Completed' | 'Scheduled';
  flavor: string;
  dueTime: string;
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
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
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