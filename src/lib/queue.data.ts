import { getSupabase } from './supabase';

type Stage = 'Filling' | 'Covering' | 'Decorating' | 'Packing' | 'Complete';
type Priority = 'High' | 'Medium' | 'Low';
type Store = 'bannos' | 'flourlane';

export type QueueMinimalRow = {
  id: string;
  human_id: string;
  title: string;
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
  human_id: string;
  title: string;
  storage_location: string | null;
  store: Store;
  packing_complete_ts: string | null;
  created_at: string;
};

export async function fetchQueue(store: Store | null, limit = 100, offset = 0): Promise<QueueMinimalRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_queue_minimal', {
    p_store: store, 
    p_limit: limit, 
    p_offset: offset,
  });
  if (error) throw error;
  return (data ?? []) as QueueMinimalRow[];
}

export async function fetchUnassignedCounts(store: Store | null): Promise<UnassignedCountRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_unassigned_counts', { p_store: store });
  if (error) throw error;
  return (data ?? []) as UnassignedCountRow[];
}

export async function fetchComplete(store: Store | null, limit = 50): Promise<CompleteMinimalRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_complete_minimal', { p_store: store, p_limit: limit });
  if (error) throw error;
  return (data ?? []) as CompleteMinimalRow[];
}
