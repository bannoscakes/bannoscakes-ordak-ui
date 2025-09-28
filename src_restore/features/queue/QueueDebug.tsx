import React from 'react';
import { useQueueMinimal, useUnassignedCounts, useCompleteMinimal } from './hooks';

export function QueueDebug() {
  const queue = useQueueMinimal();
  const counts = useUnassignedCounts();
  const complete = useCompleteMinimal(10);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Queue Debug</h1>

      <section>
        <h2 className="font-semibold">Unassigned Counts</h2>
        {counts.loading && <p>Loading…</p>}
        {counts.error && <p className="text-red-600">{counts.error}</p>}
        <ul className="list-disc pl-5">
          {counts.data.map((r, i) => (
            <li key={i}>{r.store} · {r.stage} → {r.count}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Queue (first 10 by due_date)</h2>
        {queue.loading && <p>Loading…</p>}
        {queue.error && <p className="text-red-600">{queue.error}</p>}
        <ul className="list-disc pl-5">
          {queue.data.slice(0,10).map((o) => (
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
          {complete.data.map((o) => (
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
export default QueueDebug;
