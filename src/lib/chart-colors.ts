/**
 * Theme-aware chart colors for Recharts components.
 * Provides appropriate color contrast for light and dark modes.
 *
 * Note: lightColors and darkColors are module-level singletons,
 * so getChartColors returns stable object references (no re-render concerns).
 */

export interface ChartColors {
  // Store-specific primary colors
  readonly bannos: {
    readonly primary: string;
    readonly gradient: readonly string[];
  };
  readonly flourlane: {
    readonly primary: string;
    readonly gradient: readonly string[];
  };
  readonly staff: {
    readonly primary: string;
  };
  // Semantic colors
  readonly completed: string;
  readonly pending: string;
  // Reserved for future chart customization (axis labels, gridlines, tooltips)
  readonly success: string;
  readonly warning: string;
  readonly error: string;
  readonly axis: string;
  readonly grid: string;
  readonly text: string;
  // Additional colors for multi-series charts
  readonly hours: string;
  readonly overtime: string;
  readonly present: string;
  readonly absent: string;
  readonly late: string;
  // Shift distribution
  readonly shifts: readonly string[];
}

const lightColors: ChartColors = Object.freeze({
  bannos: Object.freeze({
    primary: '#2563eb', // blue-600 - darker for light bg
    gradient: Object.freeze(['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']),
  }),
  flourlane: Object.freeze({
    primary: '#db2777', // pink-600 - darker for light bg
    gradient: Object.freeze(['#db2777', '#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8']),
  }),
  staff: Object.freeze({
    primary: '#7c3aed', // violet-600 - darker for light bg
  }),
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
  shifts: Object.freeze(['#2563eb', '#059669', '#d97706', '#7c3aed']),
});

const darkColors: ChartColors = Object.freeze({
  bannos: Object.freeze({
    primary: '#60a5fa', // blue-400 - lighter for dark bg
    gradient: Object.freeze(['#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af']), // blue-400 to blue-800 (maintains contrast)
  }),
  flourlane: Object.freeze({
    primary: '#f472b6', // pink-400 - lighter for dark bg
    gradient: Object.freeze(['#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d']), // pink-400 to pink-800 (maintains contrast)
  }),
  staff: Object.freeze({
    primary: '#a78bfa', // violet-400 - lighter for dark bg
  }),
  completed: '#4ade80', // green-400
  pending: '#f97316', // orange-500 - darker to differentiate from warning
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
  shifts: Object.freeze(['#60a5fa', '#34d399', '#fbbf24', '#a78bfa']),
});

/**
 * Returns theme-appropriate chart colors.
 * @param theme - Current theme ('light' or 'dark')
 * @returns ChartColors object with all color values
 */
export function getChartColors(theme: 'light' | 'dark' | undefined): ChartColors {
  return theme === 'dark' ? darkColors : lightColors;
}

/**
 * Helper to get chart colors from a resolved theme string.
 * Use with useTheme's resolvedTheme.
 */
export function getChartColorsFromTheme(resolvedTheme: string | undefined): ChartColors {
  return getChartColors(resolvedTheme === 'dark' ? 'dark' : 'light');
}
