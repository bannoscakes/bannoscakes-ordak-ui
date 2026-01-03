// Single source of truth for stage colors
export interface StageColorParts {
  bg: string;
  border: string;
  text: string;
  dot: string;
}

export const stageColorParts: Record<string, StageColorParts> = {
  "Filling": {
    bg: "bg-blue-50 dark:bg-blue-950",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500 dark:bg-blue-300",
  },
  "Covering": {
    bg: "bg-purple-50 dark:bg-purple-950",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500 dark:bg-purple-300",
  },
  "Decorating": {
    bg: "bg-pink-50 dark:bg-pink-950",
    border: "border-pink-200 dark:border-pink-800",
    text: "text-pink-700 dark:text-pink-300",
    dot: "bg-pink-500 dark:bg-pink-300",
  },
  "Packing": {
    bg: "bg-orange-50 dark:bg-orange-950",
    border: "border-orange-200 dark:border-orange-800",
    text: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500 dark:bg-orange-300",
  },
  "Complete": {
    bg: "bg-green-50 dark:bg-green-950",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-700 dark:text-green-300",
    dot: "bg-green-500 dark:bg-green-300",
  },
};

const defaultColorParts: StageColorParts = {
  bg: "bg-gray-50 dark:bg-gray-900",
  border: "border-gray-200 dark:border-gray-700",
  text: "text-gray-700 dark:text-gray-300",
  dot: "bg-gray-500 dark:bg-gray-300",
};

const cancelledColorClass = "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800";

// Derived from stageColorParts - single source of truth
function partsToClass(parts: StageColorParts): string {
  return `${parts.bg} ${parts.text} ${parts.border}`;
}

export function getStageColorClass(stage: string, cancelledAt?: string | null): string {
  if (cancelledAt) {
    return cancelledColorClass;
  }
  const parts = stageColorParts[stage] || defaultColorParts;
  return partsToClass(parts);
}

export function getStageColorParts(stage: string): StageColorParts {
  return stageColorParts[stage] || defaultColorParts;
}
