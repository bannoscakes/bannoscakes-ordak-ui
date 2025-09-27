import { getSupabase } from '../../lib/supabase';
import type {
  QueueMinimalRow,
  UnassignedCountRow,
  CompleteMinimalRow,
} from '../../types/db';

export async function getQueueMinimal(): Promise<QueueMinimalRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('vw_queue_minimal')
    .select('*')
    .order('due_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as QueueMinimalRow[];
}

export async function getUnassignedCounts(): Promise<UnassignedCountRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('vw_unassigned_counts')
    .select('*');
  if (error) throw error;
  return (data ?? []) as UnassignedCountRow[];
}

export async function getCompleteMinimal(limit = 50): Promise<CompleteMinimalRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('vw_complete_minimal')
    .select('*')
    .order('packing_complete_ts', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CompleteMinimalRow[];
}
