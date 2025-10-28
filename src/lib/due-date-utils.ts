// due-date-utils.ts
// Utility functions for due date calculations based on settings

export interface DueDateSettings {
  defaultDue: string;
  allowedDays: boolean[]; // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  blackoutDates: string[]; // Array of date strings in YYYY-MM-DD format
}

/**
 * Calculate the next available due date based on settings
 * @param settings - Due date settings from the database
 * @param startDate - Optional start date (defaults to today)
 * @returns Date object for the next available due date
 */
export function calculateDueDate(
  settings: DueDateSettings, 
  startDate: Date = new Date()
): Date {
  let currentDate = new Date(startDate);
  
  // Parse default due time
  const defaultDue = settings.defaultDue;
  let daysToAdd = 0;
  
  if (defaultDue === 'today') {
    daysToAdd = 0;
  } else if (defaultDue === '+1 day') {
    daysToAdd = 1;
  } else if (defaultDue === '+2 days') {
    daysToAdd = 2;
  } else if (defaultDue.startsWith('+') && defaultDue.includes(' day')) {
    // Parse "+X day(s)" format
    const match = defaultDue.match(/\+(\d+)\s+day/);
    if (match) {
      daysToAdd = parseInt(match[1]);
    }
  }
  
  // Add the default days
  currentDate.setDate(currentDate.getDate() + daysToAdd);
  
  // Find next available date considering allowed days and blackout dates
  let attempts = 0;
  const maxAttempts = 30; // Prevent infinite loop
  
  while (attempts < maxAttempts) {
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Check if this day is allowed (convert Sunday=0 to index 6 for our array)
    const allowedDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const isDayAllowed = settings.allowedDays[allowedDayIndex];
    
    // Check if this date is not blacked out
    const isBlackedOut = settings.blackoutDates.includes(dateString);
    
    if (isDayAllowed && !isBlackedOut) {
      return currentDate;
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    attempts++;
  }
  
  // If we can't find a valid date, return the original calculated date
  return new Date(startDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
}

/**
 * Check if a specific date is available for delivery
 * @param date - Date to check
 * @param settings - Due date settings
 * @returns boolean indicating if the date is available
 */
export function isDateAvailable(date: Date, settings: DueDateSettings): boolean {
  const dayOfWeek = date.getDay();
  const dateString = date.toISOString().split('T')[0];
  
  // Check if this day is allowed
  const allowedDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const isDayAllowed = settings.allowedDays[allowedDayIndex];
  
  // Check if this date is not blacked out
  const isBlackedOut = settings.blackoutDates.includes(dateString);
  
  return isDayAllowed && !isBlackedOut;
}

/**
 * Get the next N available dates for delivery
 * @param settings - Due date settings
 * @param count - Number of dates to return
 * @param startDate - Optional start date (defaults to today)
 * @returns Array of available dates
 */
export function getNextAvailableDates(
  settings: DueDateSettings, 
  count: number = 7, 
  startDate: Date = new Date()
): Date[] {
  const availableDates: Date[] = [];
  let currentDate = new Date(startDate);
  let attempts = 0;
  const maxAttempts = 30;
  
  while (availableDates.length < count && attempts < maxAttempts) {
    if (isDateAvailable(currentDate, settings)) {
      availableDates.push(new Date(currentDate));
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
    attempts++;
  }
  
  return availableDates;
}

/**
 * Format a date for display in the UI
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDueDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };
  
  return date.toLocaleDateString('en-US', options);
}

/**
 * Get default due date settings for a store
 * @param store - Store identifier
 * @returns Default due date settings
 */
export function getDefaultDueDateSettings(store: 'bannos' | 'flourlane'): DueDateSettings {
  return {
    defaultDue: '+1 day',
    allowedDays: [true, true, true, true, true, true, false], // Mon-Sat
    blackoutDates: ['2024-12-25', '2024-01-01'] // Christmas and New Year
  };
}
