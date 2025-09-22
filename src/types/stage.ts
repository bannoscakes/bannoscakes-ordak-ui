export type Stage =
  | "total" | "filling" | "covering" | "decorating" | "packing" | "complete" | "unassigned";

export type StoreKey = "bannos" | "flourlane";

export type StatsByStore = {
  bannos: Record<Stage, number>;
  flourlane: Record<Stage, number>;
};

export const STAGES = [
  "total","filling","covering","decorating","packing","complete","unassigned",
] as const satisfies readonly Stage[];

export const STAGE_ORDER = [
  "filling","covering","decorating","packing","complete",
] as const satisfies readonly Stage[];

/** Utility to create a zeroed stage counter map */
export const makeEmptyCounts = (): Record<Stage, number> => ({
  total: 0,
  filling: 0,
  covering: 0,
  decorating: 0,
  packing: 0,
  complete: 0,
  unassigned: 0,
});
