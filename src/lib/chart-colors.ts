/**
 * Theme-aware chart colors for Recharts components.
 * Provides appropriate color contrast for light and dark modes.
 */

export interface ChartColors {
  // Store-specific primary colors
  bannos: {
    primary: string;
    gradient: string[];
  };
  flourlane: {
    primary: string;
    gradient: string[];
  };
  staff: {
    primary: string;
  };
  // Semantic colors
  completed: string;
  pending: string;
  success: string;
  warning: string;
  error: string;
  // Chart axis and grid
  axis: string;
  grid: string;
  text: string;
  // Additional colors for multi-series charts
  hours: string;
  overtime: string;
  present: string;
  absent: string;
  late: string;
  // Shift distribution
  shifts: string[];
}

const lightColors: ChartColors = {
  bannos: {
    primary: '#2563eb', // blue-600 - darker for light bg
    gradient: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
  },
  flourlane: {
    primary: '#db2777', // pink-600 - darker for light bg
    gradient: ['#db2777', '#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8'],
  },
  staff: {
    primary: '#7c3aed', // violet-600 - darker for light bg
  },
  completed: '#16a34a', // green-600
  pending: '#ea580c', // orange-600
  success: '#16a34a', // green-600
  warning: '#d97706', // amber-600
  error: '#dc2626', // red-600
  axis: '#6b7280', // gray-500
  grid: '#e5e7eb', // gray-200
  text: '#374151', // gray-700
  hours: '#7c3aed', // violet-600
  overtime: '#d97706', // amber-600
  present: '#059669', // emerald-600
  absent: '#dc2626', // red-600
  late: '#d97706', // amber-600
  shifts: ['#2563eb', '#059669', '#d97706', '#7c3aed'],
};

const darkColors: ChartColors = {
  bannos: {
    primary: '#60a5fa', // blue-400 - lighter for dark bg
    gradient: ['#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff'],
  },
  flourlane: {
    primary: '#f472b6', // pink-400 - lighter for dark bg
    gradient: ['#f472b6', '#f9a8d4', '#fbcfe8', '#fce7f3', '#fdf2f8'],
  },
  staff: {
    primary: '#a78bfa', // violet-400 - lighter for dark bg
  },
  completed: '#4ade80', // green-400
  pending: '#fb923c', // orange-400
  success: '#4ade80', // green-400
  warning: '#fbbf24', // amber-400
  error: '#f87171', // red-400
  axis: '#9ca3af', // gray-400
  grid: '#374151', // gray-700
  text: '#e5e7eb', // gray-200
  hours: '#a78bfa', // violet-400
  overtime: '#fbbf24', // amber-400
  present: '#34d399', // emerald-400
  absent: '#f87171', // red-400
  late: '#fbbf24', // amber-400
  shifts: ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa'],
};

/**
 * Returns theme-appropriate chart colors.
 * @param theme - Current theme ('light' or 'dark')
 * @returns ChartColors object with all color values
 */
export function getChartColors(theme: 'light' | 'dark' | undefined): ChartColors {
  return theme === 'dark' ? darkColors : lightColors;
}

/**
 * Hook-friendly helper to get chart colors with a mounted guard.
 * Use with useTheme's resolvedTheme.
 */
export function useChartColors(resolvedTheme: string | undefined): ChartColors {
  return getChartColors(resolvedTheme as 'light' | 'dark' | undefined);
}
