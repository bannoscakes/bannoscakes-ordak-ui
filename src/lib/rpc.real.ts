import * as mockRpc from "../mocks/rpc";
import { supabase } from "./supabase";

const QUEUE_SOURCE =
  String(import.meta.env.VITE_QUEUE_SOURCE ?? "").trim() || "queue_view";

export const get_queue: typeof mockRpc.get_queue = async (..._args) => {
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
    })) as unknown as Awaited<ReturnType<typeof mockRpc.get_queue>>;

    return items;
  } catch {
    // Any runtime issue → safe, empty list
    return [];
  }
};

// keep these throwing until implemented
export const get_order_for_scan: typeof mockRpc.get_order_for_scan = async (..._args) => {
  throw new Error("rpc.real:get_order_for_scan not wired; leave VITE_USE_MOCKS=true");
};
export const advance_stage: typeof mockRpc.advance_stage = async (..._args) => {
  throw new Error("rpc.real:advance_stage not wired; leave VITE_USE_MOCKS=true");
};
export const handle_print_barcode: typeof mockRpc.handle_print_barcode = async (..._args) => {
  throw new Error("rpc.real:handle_print_barcode not wired; leave VITE_USE_MOCKS=true");
};
