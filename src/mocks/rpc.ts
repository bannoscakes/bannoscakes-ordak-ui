import { MockOrder, MOCK_QUEUE } from "./mock-data";

let queue: MockOrder[] = [...MOCK_QUEUE];
const delay = (ms = 250) => new Promise(res => setTimeout(res, ms));

export async function get_queue(): Promise<MockOrder[]> {
  await delay(); return [...queue];
}

export async function handle_print_barcode(id: string) {
  await delay();
  queue = queue.map(o => (o.id === id
    ? { ...o, filling_start_ts: o.filling_start_ts ?? new Date().toISOString() }
    : o));
  return true;
}

export async function complete_filling(id: string) {
  await delay();
  queue = queue.map(o => (o.id === id
    ? {
        ...o,
        stage: "Covering" as const,
        filling_complete_ts: o.filling_complete_ts ?? new Date().toISOString()
      }
    : o));
  return true;
}

export async function complete_covering(id: string) {
  await delay();
  queue = queue.map(o => (o.id === id
    ? { ...o, stage: "Decorating" as const, covering_complete_ts: new Date().toISOString() }
    : o));
  return true;
}

export async function complete_decorating(id: string) {
  await delay();
  queue = queue.map(o => (o.id === id
    ? { ...o, stage: "Packing" as const, decorating_complete_ts: new Date().toISOString() }
    : o));
  return true;
}

export async function start_packing(id: string) {
  await delay();
  queue = queue.map(o => (o.id === id
    ? { ...o, packing_start_ts: o.packing_start_ts ?? new Date().toISOString() }
    : o));
  return true;
}

export async function complete_packing(id: string) {
  await delay();
  queue = queue.map(o => (o.id === id
    ? { ...o, stage: "Complete" as const, packing_complete_ts: new Date().toISOString() }
    : o));
  return true;
}

// --- scanner helpers ---
export async function get_order_for_scan(id: string): Promise<MockOrder | null> {
  await delay();
  const found = queue.find(o => o.id === id);
  return found ? { ...found } : null;
}

export async function advance_stage(id: string): Promise<{
  ok: boolean;
  from?: MockOrder["stage"];
  to?: MockOrder["stage"];
  action?: string;
  message: string;
}> {
  const ord = queue.find(o => o.id === id);
  if (!ord) return { ok: false, message: `Order not found: ${id}` };
  const from = ord.stage;

  try {
    if (from === "Filling") {
      await complete_filling(id);
      return { ok: true, from, to: "Covering", action: "complete_filling", message: "Filling → Covering" };
    }
    if (from === "Covering") {
      await complete_covering(id);
      return { ok: true, from, to: "Decorating", action: "complete_covering", message: "Covering → Decorating" };
    }
    if (from === "Decorating") {
      await complete_decorating(id);
      return { ok: true, from, to: "Packing", action: "complete_decorating", message: "Decorating → Packing" };
    }
    if (from === "Packing") {
      await start_packing(id);
      await complete_packing(id);
      return { ok: true, from, to: "Complete", action: "complete_packing", message: "Packing → Complete" };
    }
    return { ok: true, from, to: "Complete", action: "noop", message: "Already Complete" };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Advance failed" };
  }
}