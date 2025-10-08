import { getOrderForScan, handlePrintBarcode, completeFilling, completeCovering, completeDecorating, completePacking } from "@/lib/rpc-client";

/**
 * Supports two commands:
 *  - plain ID: "bannos-12345" → advance one stage based on current stage
 *  - print ID: "print bannos-12345" → set filling_start_ts (idempotent)
 */
export async function handleScanCommand(input: string): Promise<{ ok: boolean; message: string; order?: any }> {
  const trimmed = input.trim();
  const [cmd, maybeId] = trimmed.split(/\s+/, 2);

  if (cmd.toLowerCase() === "print" && maybeId) {
    const ord = await getOrderForScan(maybeId);
    if (!ord) return { ok: false, message: `Order not found: ${maybeId}` };
    await handlePrintBarcode(maybeId, maybeId);
    return { ok: true, message: `Printed barcode (Filling start) for ${maybeId}`, order: ord };
  }

  const id = trimmed;
  const ord = await getOrderForScan(id);
  if (!ord) return { ok: false, message: `Order not found: ${id}` };

  // Map current stage to appropriate completion function
  const stage = ord.stage;
  const store = ord.store || 'bannos'; // Default to bannos if store not found
  let res;
  
  switch (stage) {
    case 'Filling':
      res = await completeFilling(id, store);
      break;
    case 'Covering':
      res = await completeCovering(id, store);
      break;
    case 'Decorating':
      res = await completeDecorating(id, store);
      break;
    case 'Packing':
      res = await completePacking(id, store);
      break;
    default:
      return { ok: false, message: `Unknown stage: ${stage}` };
  }

  return { ok: true, message: `${stage} stage completed for ${id}`, order: ord };
}