// Database types for the application
export type Store = 'bannos' | 'flourlane';
export type Stage = 'Filling' | 'Covering' | 'Decorating' | 'Packing' | 'Complete';
// Priority type matches database enum (PascalCase)
export type Priority = 'High' | 'Medium' | 'Low';

// Core Order interface matching backend schema
export interface Order {
  id: number;
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
  stage?: Stage;
  created_at?: string;
  updated_at?: string;
  // New fields from Task 1
  priority?: Priority;
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
  stage: Stage;
  created_at: string;
  updated_at: string;
  // New fields from Task 1
  priority?: Priority;
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
  stage: Stage;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // New fields from Task 1
  priority?: Priority;
  assignee_id?: string | null;
  storage?: string | null;
  status?: 'pending' | 'in_progress' | 'complete';
}
