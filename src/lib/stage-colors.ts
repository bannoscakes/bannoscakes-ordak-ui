// Single source of truth for stage colors
export interface StageColorParts {
  bg: string;
  border: string;
  text: string;
  dot: string;
}

// Progress bar colors for production status cards
export const stageProgressColors: Record<string, string> = {
  "Filling": "bg-blue-500",
  "Covering": "bg-purple-500",
  "Decorating": "bg-pink-500",
  "Packing": "bg-orange-500",
  "Complete": "bg-green-500",
};

export function getStageProgressColor(stage: string): string {
  return stageProgressColors[stage] || "bg-gray-500";
}

export const stageColorParts: Record<string, StageColorParts> = {
  "Filling": {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-300 dark:border-blue-700",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  "Covering": {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    border: "border-purple-300 dark:border-purple-700",
    text: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500",
  },
  "Decorating": {
    bg: "bg-pink-100 dark:bg-pink-900/30",
    border: "border-pink-300 dark:border-pink-700",
    text: "text-pink-700 dark:text-pink-300",
    dot: "bg-pink-500",
  },
  "Packing": {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    border: "border-orange-300 dark:border-orange-700",
    text: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
  },
  "Complete": {
    bg: "bg-green-100 dark:bg-green-900/30",
    border: "border-green-300 dark:border-green-700",
    text: "text-green-700 dark:text-green-300",
    dot: "bg-green-500",
  },
};

const defaultColorParts: StageColorParts = {
  bg: "bg-gray-100 dark:bg-gray-800/30",
  border: "border-gray-300 dark:border-gray-700",
  text: "text-gray-700 dark:text-gray-300",
  dot: "bg-gray-500",
};

const cancelledColorClass = "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700";

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
