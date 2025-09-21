import { advance_stage, get_order_for_scan, handle_print_barcode } from "@/lib/rpc";
import type { MockOrder } from "@/mocks/mock-data";

/**
 * Supports two commands:
 *  - plain ID: "bannos-12345" → advance one stage based on current stage
 *  - print ID: "print bannos-12345" → set filling_start_ts (idempotent)
 */
export async function handleScanCommand(input: string): Promise<{ ok: boolean; message: string; order?: MockOrder }> {
  const trimmed = input.trim();
  const [cmd, maybeId] = trimmed.split(/\s+/, 2);

  if (cmd.toLowerCase() === "print" && maybeId) {
    const ord = await get_order_for_scan(maybeId);
    if (!ord) return { ok: false, message: `Order not found: ${maybeId}` };
    await handle_print_barcode(maybeId);
    return { ok: true, message: `Printed barcode (Filling start) for ${maybeId}`, order: ord };
  }

  const id = trimmed;
  const ord = await get_order_for_scan(id);
  if (!ord) return { ok: false, message: `Order not found: ${id}` };

  const res = await advance_stage(id);
  return { ok: res.ok, message: res.message, order: ord };
}