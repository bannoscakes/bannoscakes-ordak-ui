import { advance_stage, get_order_for_scan, handle_print_barcode } from "@/lib/rpc";

/**
 * Supports two commands:
 *  - plain ID: "bannos-12345" → advance one stage based on current stage
 *  - print ID: "print bannos-12345" → set filling_start_ts (idempotent)
 */
interface ScannedOrder {
  id: string;
  stage?: string;
  [key: string]: unknown;
}

export async function handleScanCommand(input: string): Promise<{ ok: boolean; message: string; order?: ScannedOrder }> {
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

  try {
    await advance_stage(id);
    return { ok: true, message: `Stage advanced for ${id}`, order: ord };
  } catch (error) {
    return { ok: false, message: `Error advancing stage: ${error}`, order: ord };
  }
}