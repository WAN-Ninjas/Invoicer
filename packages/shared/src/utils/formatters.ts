/**
 * Format a number as currency (USD)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format a date as MM/DD/YYYY
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Format a date as a long format (e.g., "January 15, 2024")
 */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

/**
 * Format minutes as hours and minutes (e.g., "2h 30m" or "45m")
 */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

/**
 * Format minutes as decimal hours (e.g., 2.5)
 */
export function formatHoursDecimal(totalMinutes: number): string {
  const hours = totalMinutes / 60;
  return hours.toFixed(2);
}

/**
 * Parse time string (H:MM AM/PM) to 24h format (HH:MM)
 */
export function parseTimeString(timeStr: string): string | null {
  if (!timeStr || timeStr.trim() === '') {
    return null;
  }

  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return null;
  }

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

/**
 * Format 24h time (HH:MM) to 12h format (H:MM AM/PM)
 */
export function formatTime12h(time24: string | null): string {
  if (!time24) {
    return '';
  }

  const [hoursStr, minutes] = time24.split(':');
  let hours = parseInt(hoursStr, 10);
  const period = hours >= 12 ? 'PM' : 'AM';

  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours -= 12;
  }

  return `${hours}:${minutes} ${period}`;
}

/**
 * Generate invoice number with prefix
 */
export function generateInvoiceNumber(prefix: string, sequence: number): string {
  const paddedSequence = sequence.toString().padStart(5, '0');
  return `${prefix}${paddedSequence}`;
}

/**
 * Parse currency string (e.g., "$1,234.50" or "$ 1,234.50") to number
 */
export function parseCurrency(currencyStr: string): number {
  if (!currencyStr || currencyStr.trim() === '') {
    return 0;
  }

  // Remove dollar sign, spaces, and commas
  const cleaned = currencyStr.replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse date string (MM/DD/YY) to Date object
 */
export function parseDateString(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }

  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (!match) {
    return null;
  }

  const month = parseInt(match[1], 10) - 1; // Months are 0-indexed
  const day = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);

  // Convert 2-digit year to 4-digit (assuming 2000s for values < 50, 1900s otherwise)
  year = year < 50 ? 2000 + year : 1900 + year;

  return new Date(year, month, day);
}
