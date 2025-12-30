export type Stage =
  | "total" | "Filling" | "Covering" | "Decorating" | "Packing" | "Complete" | "unassigned";

export type StoreKey = "bannos" | "flourlane";

export type StatsByStore = {
  bannos: Record<Stage, number>;
  flourlane: Record<Stage, number>;
};

export const STAGES = [
  "total","Filling","Covering","Decorating","Packing","Complete","unassigned",
] as const satisfies readonly Stage[];

export const STAGE_ORDER = [
  "Filling","Covering","Decorating","Packing","Complete",
] as const satisfies readonly Stage[];

/** Utility to create a zeroed stage counter map */
export const makeEmptyCounts = (): Record<Stage, number> => ({
  total: 0,
  Filling: 0,
  Covering: 0,
  Decorating: 0,
  Packing: 0,
  Complete: 0,
  unassigned: 0,
});
