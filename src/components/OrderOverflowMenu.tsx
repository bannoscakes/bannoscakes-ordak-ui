import { MoreHorizontal } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import type { QueueItem } from "../types/queue";

interface OrderOverflowMenuProps {
  item: QueueItem;
  variant: 'queue' | 'complete' | 'dashboard';
  onAssignToStaff?: (item: QueueItem) => void;
  onEditOrder?: (item: QueueItem) => void;
  onOpenOrder: (item: QueueItem) => void;
  onViewDetails: (item: QueueItem) => void;
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