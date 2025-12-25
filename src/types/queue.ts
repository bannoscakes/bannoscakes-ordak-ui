/**
 * Shared queue types for staff and supervisor queue hooks
 */

export type QueueItemSize = string;
export type QueueItemPriority = 'High' | 'Medium' | 'Low';
export type QueueItemStatus = 'In Production' | 'Pending' | 'Quality Check' | 'Completed' | 'Scheduled';
export type QueueItemMethod = 'Delivery' | 'Pickup';
export type QueueItemStore = 'bannos' | 'flourlane';

/**
 * Queue item interface matching the UI format
 * Used by both useStaffQueue and useSupervisorQueue
 */
export interface QueueItem {
  id: string;
  orderNumber: string;
  shopifyOrderNumber: string;
  customerName: string;
  product: string;
  size: QueueItemSize;
  quantity: number;
  dueDate: string | null;
  priority: QueueItemPriority | null;
  status: QueueItemStatus;
  flavor: string;
  method?: QueueItemMethod;
  storage?: string;
  store: QueueItemStore;
  stage: string;
  covering_start_ts?: string | null;
  decorating_start_ts?: string | null;
}
