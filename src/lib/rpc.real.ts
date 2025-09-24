import { supabase } from "./supabase";

const QUEUE_SOURCE =
  String(import.meta.env.VITE_QUEUE_SOURCE ?? "").trim() || "queue_view";

export const get_queue = async (..._args: any[]): Promise<any[]> => {
  try {
    if (!supabase) return []; // no envs set → safe fallback
    // Adjust the view/columns to your schema; this is a conservative example.
    const { data, error } = await supabase
      .from(QUEUE_SOURCE)
      .select("id, store, stage, title, priority, due_date")
      .limit(200);

    if (error || !data) return [];

    const items = data.map((row: any) => ({
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

export const get_order_for_scan = async (..._args: any[]): Promise<any> => {
  // TODO: replace with real server function
  return null;
};

// advance_stage: safe fallback (never throws, explicit return)
export const advance_stage = async (..._args: any[]): Promise<{ ok: true }> => {
  // TODO: replace with real server function
  return { ok: true } as const;
};

// handle_print_barcode: safe no-op (never throws)
export const handle_print_barcode = async (..._args: any[]): Promise<void> => {
  // TODO: replace with real server function
  return;
};
