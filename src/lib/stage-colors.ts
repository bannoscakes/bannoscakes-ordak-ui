// Single source of truth for stage colors
export interface StageColorParts {
  bg: string;
  border: string;
  text: string;
  dot: string;
}

export const stageColorParts: Record<string, StageColorParts> = {
  "Filling": {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  "Covering": {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
  "Decorating": {
    bg: "bg-pink-50",
    border: "border-pink-200",
    text: "text-pink-700",
    dot: "bg-pink-500",
  },
  "Packing": {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    dot: "bg-orange-500",
  },
  "Complete": {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    dot: "bg-green-500",
  },
};

const defaultColorParts: StageColorParts = {
  bg: "bg-gray-50",
  border: "border-gray-200",
  text: "text-gray-700",
  dot: "bg-gray-500",
};

const cancelledColorClass = "bg-red-100 text-red-800 border-red-200";

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
