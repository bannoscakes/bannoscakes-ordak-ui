/**
 * Neutral RPC facade that can switch between mocks and real RPCs.
 * Behavior today: still uses mocks (realRpc is aliased to mocks for now).
 * Later, replace realRpc import with the real implementation.
 */
import { config } from "./config";
import * as mockRpc from "../mocks/rpc";
import * as realRpc from "./rpc.real";

if (typeof window !== "undefined") {
  console.info("[rpc] using", (config.useMocks ? "mocks" : "real"), "via facade");
}

// Forwarders with correct parameter typing (preserve names/signatures)
export const get_queue = (...args: Parameters<typeof mockRpc.get_queue>) =>
  (config.useMocks ? mockRpc : realRpc).get_queue(...args);

export const get_order_for_scan = (...args: Parameters<typeof mockRpc.get_order_for_scan>) =>
  (config.useMocks ? mockRpc : realRpc).get_order_for_scan(...args);

export const advance_stage = (...args: Parameters<typeof mockRpc.advance_stage>) =>
  (config.useMocks ? mockRpc : realRpc).advance_stage(...args);

export const handle_print_barcode = (...args: Parameters<typeof mockRpc.handle_print_barcode>) =>
  (config.useMocks ? mockRpc : realRpc).handle_print_barcode(...args);
