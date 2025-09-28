import { useEffect, useState, useCallback } from 'react';
import { getQueueMinimal, getUnassignedCounts, getCompleteMinimal } from './api';
import type { QueueMinimalRow, UnassignedCountRow, CompleteMinimalRow } from '../../types/db';

type LoadState<T> = { data: T; loading: boolean; error: string | null; refresh: () => void };

export function useQueueMinimal(): LoadState<QueueMinimalRow[]> {
  const [data, setData] = useState<QueueMinimalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const rows = await getQueueMinimal();
      setData(rows);
    } catch (e: any) {
      setError(e?.message ?? 'Error loading queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { data, loading, error, refresh: load };
}

export function useUnassignedCounts(): LoadState<UnassignedCountRow[]> {
  const [data, setData] = useState<UnassignedCountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const rows = await getUnassignedCounts();
      setData(rows);
    } catch (e: any) {
      setError(e?.message ?? 'Error loading counts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { data, loading, error, refresh: load };
}

export function useCompleteMinimal(limit = 50): LoadState<CompleteMinimalRow[]> {
  const [data, setData] = useState<CompleteMinimalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const rows = await getCompleteMinimal(limit);
      setData(rows);
    } catch (e: any) {
      setError(e?.message ?? 'Error loading complete list');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { void load(); }, [load]);

  return { data, loading, error, refresh: load };
}
