// Database types for the application
export type Store = 'bannos' | 'flourlane';
export type Stage = 'Filling' | 'Covering' | 'Decorating' | 'Packing' | 'Complete';
export type Priority = 'High' | 'Medium' | 'Low';

// Core Order interface matching backend schema
export interface Order {
  id: string;
  store: Store;
  human_id?: string;
  order_number?: string;
  customer_name?: string;
  delivery_date?: string | null;
  delivery_method?: string | null;
  product_title?: string | null;
  flavour?: string | null;
  item_qty?: number | null;
  notes?: string | null;
  currency?: string | null;
  total_amount?: number | null;
  stage?: string;
  created_at?: string;
  updated_at?: string;
  // New fields from Task 1
  priority?: 'high' | 'medium' | 'low';
  assignee_id?: string | null;
  storage?: string | null;
  status?: 'pending' | 'in_progress' | 'complete';
}

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
  // New fields from Task 1
  priority?: 'high' | 'medium' | 'low';
  assignee_id?: string | null;
  storage?: string | null;
  status?: 'pending' | 'in_progress' | 'complete';
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
  // New fields from Task 1
  priority?: 'high' | 'medium' | 'low';
  assignee_id?: string | null;
  storage?: string | null;
  status?: 'pending' | 'in_progress' | 'complete';
}
