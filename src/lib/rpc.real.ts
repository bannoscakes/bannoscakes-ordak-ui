import { supabase } from "./supabase";

const QUEUE_SOURCE =
  String(import.meta.env.VITE_QUEUE_SOURCE ?? "").trim() || "queue_view";

const ORDERS_SOURCE =
  String(import.meta.env.VITE_ORDERS_SOURCE ?? "").trim() || "orders_view";

 hotfix/remove-mocks-on-main
type QueueRow = {
  id: string;
  store: "bannos" | "flourlane";
  stage: "unassigned" | "filling" | "covering" | "decorating" | "packing" | "quality_check" | "complete" | "ready";
  title: string;
  priority: number;
  due_date: string | null; // date-only in UI
};

export const get_queue = async (..._args: any[]): Promise<QueueRow[]> => {
export const get_queue = async (..._args: any[]): Promise<any[]> => {
  try {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from(QUEUE_SOURCE)
      .select("id, store, stage, title, priority, due_date")
      .limit(200);

    if (error || !data) return [];

    const items: QueueRow[] = data.map((row: any) => ({
      id: String(row.id),
      store: row.store,
      stage: String(row.stage).toLowerCase() as QueueRow["stage"],
      title: row.title ?? "",
      priority: Number(row.priority ?? 0),
      due_date: row.due_date ?? null,
    }));

    return items;
  } catch {
    return [];
  }
};

export const get_order_for_scan = async (barcode: string): Promise<any> => {
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
    };
  } catch {
    return null; // never throw; scanner remains stable
  }
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