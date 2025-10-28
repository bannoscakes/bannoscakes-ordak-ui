// Normalize incoming metric-like values. Never return "..." or "97.1%".
export function toNumberOrNull(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number" && Number.isFinite(input)) return input;

  if (typeof input === "string") {
    const s = input.trim();
    if (s === "" || s === "…" || s === "..." || s.toLowerCase() === "na") return null;
    // strip common decorations like % or commas
    const stripped = s.replace(/[%,$\s,]/g, "");
    const n = Number(stripped);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}


