import { getSupabase } from '../../lib/supabase';
import type {
  QueueMinimalRow,
  UnassignedCountRow,
  CompleteMinimalRow,
  Store,
} from '../../types/db';

/**
 * Read-only RPC wrappers (preferred over selecting views directly).
 * Params map 1:1 to SQL function signatures.
 */

export async function getQueueMinimal(
  store: Store | null = null,
  limit = 100,
  offset = 0
): Promise<QueueMinimalRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_queue_minimal', {
    p_store: store,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return (data ?? []) as QueueMinimalRow[];
}

export async function getUnassignedCounts(
  store: Store | null = null
): Promise<UnassignedCountRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_unassigned_counts', {
    p_store: store,
  });
  if (error) throw error;
  return (data ?? []) as UnassignedCountRow[];
}

export async function getCompleteMinimal(
  limit = 50,
  store: Store | null = null
): Promise<CompleteMinimalRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_complete_minimal', {
    p_store: store,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as CompleteMinimalRow[];
}
