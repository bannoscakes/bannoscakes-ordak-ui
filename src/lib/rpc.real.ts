// Mock types removed - using direct Supabase calls
import { supabase } from "./supabase";

const QUEUE_SOURCE =
  String(import.meta.env.VITE_QUEUE_SOURCE ?? "").trim() || "queue_view";

// Raw queue row from database view
interface QueueViewRow {
  id: string;
  store: string | null;
  stage: string;
  title: string | null;
  priority: number | null;
  due_date: string | null;
}

// Normalized queue item
interface QueueItem {
  id: string;
  store: string;
  stage: string;
  title: string;
  priority: number;
  due_date: string | null;
}

export const get_queue = async (..._args: unknown[]): Promise<QueueItem[]> => {
  try {
    if (!supabase) return []; // no envs set → safe fallback
    // Adjust the view/columns to your schema; this is a conservative example.
    const { data, error } = await supabase
      .from(QUEUE_SOURCE)
      .select("id, store, stage, title, priority, due_date")
      .limit(200);

    if (error || !data) return [];

    const items = data.map((row: QueueViewRow) => ({
      id: row.id,
      store: row.store ?? "bannos",
      stage: row.stage,
      title: row.title ?? "",
      priority: row.priority ?? 0,
      due_date: row.due_date ?? null,
    }));

    return items;
  } catch {
    // Any runtime issue → safe, empty list
    return [];
  }
};

// keep these throwing until implemented
export const get_order_for_scan = async (..._args: unknown[]): Promise<never> => {
  throw new Error("rpc.real:get_order_for_scan not wired; leave VITE_USE_MOCKS=true");
};
export const advance_stage = async (..._args: unknown[]): Promise<never> => {
  throw new Error("rpc.real:advance_stage not wired; leave VITE_USE_MOCKS=true");
};
export const handle_print_barcode = async (..._args: unknown[]): Promise<never> => {
  throw new Error("rpc.real:handle_print_barcode not wired; leave VITE_USE_MOCKS=true");
};
