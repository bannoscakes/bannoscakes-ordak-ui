import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchQueue,
  fetchUnassignedCounts,
  fetchComplete,
  type QueueMinimalRow,
  type UnassignedCountRow,
  type CompleteMinimalRow,
} from '../../lib/queue.data';

type LoadState<T> = { data: T; loading: boolean; error: string | null; refresh: () => void };

function useLoader<T>(fn: () => Promise<T>, deps: React.DependencyList = []): LoadState<T> {
  const [data, setData] = useState<T>([] as unknown as T);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fn();
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load(); }, [load]);

  return { data, loading, error, refresh: load };
}

export default function QueueDebug() {
  // store=null => both; you can pass 'bannos' or 'flourlane' to filter
  const counts = useLoader<UnassignedCountRow[]>(() => fetchUnassignedCounts(null), []);
  const queue  = useLoader<QueueMinimalRow[]>(() => fetchQueue(null, 100, 0), []);
  const complete = useLoader<CompleteMinimalRow[]>(() => fetchComplete(null, 10), []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Queue Debug</h1>

      <section>
        <h2 className="font-semibold">Unassigned Counts</h2>
        {counts.loading && <p>Loading…</p>}
        {counts.error && <p className="text-red-600">{counts.error}</p>}
        <ul className="list-disc pl-5">
          {(counts.data ?? []).map((r, i) => (
            <li key={i}>{r.store} · {r.stage} → {r.count}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Queue (first 10 by due_date)</h2>
        {queue.loading && <p>Loading…</p>}
        {queue.error && <p className="text-red-600">{queue.error}</p>}
        <ul className="list-disc pl-5">
          {(queue.data ?? []).slice(0,10).map((o) => (
            <li key={o.id}>
              <span className="font-mono">{o.human_id ?? o.id.slice(0,8)}</span>
              {' · '}{o.store} · {o.stage} · {o.priority}
              {o.due_date ? ` · due ${o.due_date}` : ''}
              {o.assignee_id ? ` · assigned` : ' · unassigned'}
            </li>
          ))}
        </ul>
        <button className="mt-2 rounded px-3 py-1 border" onClick={queue.refresh}>Refresh</button>
      </section>

      <section>
        <h2 className="font-semibold">Recent Complete</h2>
        {complete.loading && <p>Loading…</p>}
        {complete.error && <p className="text-red-600">{complete.error}</p>}
        <ul className="list-disc pl-5">
          {(complete.data ?? []).map((o) => (
            <li key={o.id}>
              <span className="font-mono">{o.human_id ?? o.id.slice(0,8)}</span>
              {' · '}{o.store} · {o.storage_location ?? 'no storage'}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
