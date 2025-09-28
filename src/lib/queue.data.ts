import { getSupabase } from './supabase';

type Stage =
  | 'Filling_pending' | 'Filling_in_progress'
  | 'Covering_pending'| 'Covering_in_progress'
  | 'Decorating_pending'| 'Decorating_in_progress'
  | 'Packing_in_progress' | 'Complete';
type Priority = 'High' | 'Medium' | 'Low';
type Store = 'bannos' | 'flourlane';

export type QueueMinimalRow = {
  id: string;
  human_id: string | null;
  title: string | null;
  stage: Stage;
  priority: Priority;
  due_date: string | null;
  assignee_id: string | null;
  storage_location: string | null;
  store: Store;
  created_at: string;
};

export type UnassignedCountRow = {
  store: Store;
  stage: Stage;
  count: number;
};

export type CompleteMinimalRow = {
  id: string;
  human_id: string | null;
  title: string | null;
  storage_location: string | null;
  store: Store;
  packing_complete_ts: string | null;
  created_at: string;
};

/**
 * Mode:
 * - 'rpc' (preferred) uses our read-only RPCs
 * - 'view' uses a view name (defaults to 'queue_view' for legacy screens)
 */
const MODE = (import.meta.env.VITE_QUEUE_MODE ?? 'view').trim();      // 'rpc' | 'view'
const VIEW = (import.meta.env.VITE_QUEUE_SOURCE ?? 'queue_view').trim();

export async function fetchQueue(store: Store | null, limit = 100, offset = 0): Promise<QueueMinimalRow[]> {
  const supabase = getSupabase();
  if (MODE === 'rpc') {
    const { data, error } = await supabase.rpc('get_queue_minimal', {
      p_store: store, p_limit: limit, p_offset: offset,
    });
    if (error) throw error;
    return (data ?? []) as QueueMinimalRow[];
  }
  // view fallback
  let q = supabase.from(VIEW).select('*').order('due_date', { ascending: true });
  if (store) q = q.eq('store', store);
  if (offset || limit) q = q.range(offset, Math.max(offset, 0) + Math.max(limit, 1) - 1);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as QueueMinimalRow[];
}

export async function fetchUnassignedCounts(store: Store | null): Promise<UnassignedCountRow[]> {
  const supabase = getSupabase();
  if (MODE === 'rpc') {
    const { data, error } = await supabase.rpc('get_unassigned_counts', { p_store: store });
    if (error) throw error;
    return (data ?? []) as UnassignedCountRow[];
  }
  // If you later add a compat view for unassigned, you can switch here; for now keep RPC default
  const { data, error } = await supabase.rpc('get_unassigned_counts', { p_store: store });
  if (error) throw error;
  return (data ?? []) as UnassignedCountRow[];
}

export async function fetchComplete(store: Store | null, limit = 50): Promise<CompleteMinimalRow[]> {
  const supabase = getSupabase();
  if (MODE === 'rpc') {
    const { data, error } = await supabase.rpc('get_complete_minimal', { p_store: store, p_limit: limit });
    if (error) throw error;
    return (data ?? []) as CompleteMinimalRow[];
  }
  // If you later add a compat view for complete, you can switch here; for now keep RPC default
  const { data, error } = await supabase.rpc('get_complete_minimal', { p_store: store, p_limit: limit });
  if (error) throw error;
  return (data ?? []) as CompleteMinimalRow[];
}
