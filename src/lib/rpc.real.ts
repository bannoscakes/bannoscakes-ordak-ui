import * as mockRpc from "../mocks/rpc";
import { supabase } from "./supabase";

const QUEUE_SOURCE =
  String(import.meta.env.VITE_QUEUE_SOURCE ?? "").trim() || "queue_view";

const ORDERS_SOURCE =
  String(import.meta.env.VITE_ORDERS_SOURCE ?? "").trim() || "orders_view";

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

cleanup/remove-mocks
// keep these throwing until implemented
export const get_order_for_scan: typeof mockRpc.get_order_for_scan = async (..._args) => {
  throw new Error("rpc.real:get_order_for_scan not wired; leave VITE_USE_MOCKS=true");
export const get_order_for_scan: typeof mockRpc.get_order_for_scan = async (barcode) => {
  try {
    if (!supabase) return null;  // envs not set → safe null
    if (!barcode) return null;

    // Adjust selected columns to your schema; ORDERS_SOURCE is the env-driven table/view.
    const { data, error } = await supabase
      .from(ORDERS_SOURCE)
      .select("id, store, stage, title, barcode")
      .eq("barcode", barcode)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      store: data.store ?? "bannos",
      stage: data.stage ?? "filling",
      title: data.title ?? "",
      assignee_id: null,
      product_title: data.title ?? "",
      due_date: "",
      priority: "Medium" as const,
      storage: "",
    } as Awaited<ReturnType<typeof mockRpc.get_order_for_scan>>;
  } catch {
    return null; // never throw; scanner remains stable
  }
};
export const advance_stage: typeof mockRpc.advance_stage = async (..._args) => {
  throw new Error("rpc.real:advance_stage not wired; leave VITE_USE_MOCKS=true");
};
export const handle_print_barcode: typeof mockRpc.handle_print_barcode = async (..._args) => {
  throw new Error("rpc.real:handle_print_barcode not wired; leave VITE_USE_MOCKS=true");
};
