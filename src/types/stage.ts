export type Stage =
  | "total" | "filling" | "covering" | "decorating" | "packing" | "complete" | "unassigned";

export type StoreKey = "bannos" | "flourlane";

export type StatsByStore = {
  bannos: Record<Stage, number>;
  flourlane: Record<Stage, number>;
};
