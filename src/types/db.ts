// Database types for the application
export type Store = 'bannos' | 'flourlane';
export type Stage = 'Filling' | 'Covering' | 'Decorating' | 'Packing' | 'Complete';
export type Priority = 'High' | 'Medium' | 'Low';

export interface QueueMinimalRow {
  id: number;
  store: Store;
  human_id: string;
  order_number: string;
  customer_name: string;
  delivery_date: string | null;
  delivery_method: string | null;
  product_title: string | null;
  flavour: string | null;
  item_qty: number | null;
  notes: string | null;
  currency: string | null;
  total_amount: number | null;
  stage: string;
  created_at: string;
  updated_at: string;
}

export interface UnassignedCountRow {
  station: string;
  count: number;
}

export interface CompleteMinimalRow {
  id: number;
  store: Store;
  human_id: string;
  order_number: string;
  customer_name: string;
  delivery_date: string | null;
  delivery_method: string | null;
  product_title: string | null;
  flavour: string | null;
  item_qty: number | null;
  notes: string | null;
  currency: string | null;
  total_amount: number | null;
  stage: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
