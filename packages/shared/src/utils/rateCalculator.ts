import type { Customer } from '../types/customer.js';
import type { Invoice } from '../types/invoice.js';
import type { TimesheetEntry } from '../types/entry.js';

/**
 * Get the effective hourly rate for an entry following the hierarchy:
 * 1. Entry-level override (most specific)
 * 2. Invoice-level override
 * 3. Customer default rate
 */
export function getEffectiveRate(
  entry: Pick<TimesheetEntry, 'hourlyRateOverride'>,
  invoice: Pick<Invoice, 'hourlyRateOverride'> | null,
  customer: Pick<Customer, 'defaultHourlyRate'>
): number {
  // Entry-level override takes precedence
  if (entry.hourlyRateOverride !== null && entry.hourlyRateOverride !== undefined) {
    return entry.hourlyRateOverride;
  }

  // Invoice-level override is second priority
  if (invoice?.hourlyRateOverride !== null && invoice?.hourlyRateOverride !== undefined) {
    return invoice.hourlyRateOverride;
  }

  // Fall back to customer default rate
  return customer.defaultHourlyRate;
}

/**
 * Calculate the cost for a given number of minutes at a specific rate
 */
export function calculateCost(totalMinutes: number, hourlyRate: number): number {
  const hours = totalMinutes / 60;
  return Math.round(hours * hourlyRate * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate the cost for an entry using the rate hierarchy
 */
export function calculateEntryCost(
  entry: Pick<TimesheetEntry, 'totalMinutes' | 'hourlyRateOverride'>,
  invoice: Pick<Invoice, 'hourlyRateOverride'> | null,
  customer: Pick<Customer, 'defaultHourlyRate'>
): number {
  const rate = getEffectiveRate(entry, invoice, customer);
  return calculateCost(entry.totalMinutes, rate);
}

/**
 * Calculate invoice totals from entries
 */
export function calculateInvoiceTotals(
  entries: Array<Pick<TimesheetEntry, 'totalMinutes' | 'hourlyRateOverride' | 'calculatedCost'>>,
  invoice: Pick<Invoice, 'hourlyRateOverride' | 'taxRate'>,
  customer: Pick<Customer, 'defaultHourlyRate'>
): { subtotal: number; taxAmount: number; total: number } {
  const subtotal = entries.reduce((sum, entry) => {
    const cost = calculateEntryCost(entry, invoice, customer);
    return sum + cost;
  }, 0);

  const taxAmount = Math.round(subtotal * invoice.taxRate * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  return { subtotal, taxAmount, total };
}
