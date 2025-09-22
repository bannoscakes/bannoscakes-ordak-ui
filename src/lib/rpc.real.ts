import * as mockRpc from "../mocks/rpc";
// TODO: import your real clients when ready, e.g.:
// import { supabase } from "@/lib/supabase";

export const get_queue: typeof mockRpc.get_queue = async (..._args) => {
  // TODO: implement using real backend (e.g., Supabase)
  throw new Error("rpc.real:get_queue not wired; leave VITE_USE_MOCKS=true until implemented");
};

export const get_order_for_scan: typeof mockRpc.get_order_for_scan = async (..._args) => {
  throw new Error("rpc.real:get_order_for_scan not wired; leave VITE_USE_MOCKS=true until implemented");
};

export const advance_stage: typeof mockRpc.advance_stage = async (..._args) => {
  throw new Error("rpc.real:advance_stage not wired; leave VITE_USE_MOCKS=true until implemented");
};

export const handle_print_barcode: typeof mockRpc.handle_print_barcode = async (..._args) => {
  throw new Error("rpc.real:handle_print_barcode not wired; leave VITE_USE_MOCKS=true until implemented");
};
