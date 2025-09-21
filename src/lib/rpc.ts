/**
 * Neutral RPC facade that can switch between mocks and real RPCs.
 * Behavior today: still uses mocks (realRpc is aliased to mocks for now).
 * Later, replace realRpc import with the real implementation.
 */
import { config } from "./config";
import * as mockRpc from "../mocks/rpc";

// TODO: replace with actual real RPC module when ready.
// import * as realRpc from "./rpc.real";
const realRpc = mockRpc; // placeholder: no behavior change

// Forwarders. Keep names stable so feature code imports stay identical.
export const get_queue = (...args: any[]) =>
  (config.useMocks ? mockRpc : realRpc).get_queue(...args);

export const get_order_for_scan = (...args: any[]) =>
  (config.useMocks ? mockRpc : realRpc).get_order_for_scan(...args);

export const advance_stage = (...args: any[]) =>
  (config.useMocks ? mockRpc : realRpc).advance_stage(...args);

export const handle_print_barcode = (...args: any[]) =>
  (config.useMocks ? mockRpc : realRpc).handle_print_barcode(...args);
