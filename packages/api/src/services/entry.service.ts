import { prisma } from '../config/database.js';
import type {
  TimesheetEntry,
  CreateEntryInput,
  UpdateEntryInput,
} from '@invoicer/shared';
import { calculateCost } from '@invoicer/shared';
import { Decimal } from '@prisma/client/runtime/library';

function toNumber(decimal: Decimal | null | undefined): number | null {
  if (decimal === null || decimal === undefined) return null;
  return decimal.toNumber();
}

function mapEntry(entry: {
  id: string;
  invoiceId: string | null;
  customerId: string;
  entryDate: Date;
  startTime: string | null;
  endTime: string | null;
  totalMinutes: number;
  taskDescription: string;
  requestor: string | null;
  hourlyRateOverride: Decimal | null;
  calculatedCost: Decimal;
  importBatchId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TimesheetEntry {
  return {
    ...entry,
    hourlyRateOverride: toNumber(entry.hourlyRateOverride),
    calculatedCost: toNumber(entry.calculatedCost) ?? 0,
  };
}

export async function getAllEntries(filters?: {
  customerId?: string;
  invoiceId?: string | null;
  unbilledOnly?: boolean;
}): Promise<TimesheetEntry[]> {
  const where: Record<string, unknown> = {};

  if (filters?.customerId) {
    where.customerId = filters.customerId;
  }

  if (filters?.invoiceId !== undefined) {
    where.invoiceId = filters.invoiceId;
  }

  if (filters?.unbilledOnly) {
    where.invoiceId = null;
  }

  const entries = await prisma.timesheetEntry.findMany({
    where,
    orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    take: 500,
  });

  return entries.map(mapEntry);
}

export async function getEntryById(id: string): Promise<TimesheetEntry | null> {
  const entry = await prisma.timesheetEntry.findUnique({
    where: { id },
  });

  return entry ? mapEntry(entry) : null;
}

export async function getUnbilledEntriesByCustomer(
  customerId: string
): Promise<TimesheetEntry[]> {
  const entries = await prisma.timesheetEntry.findMany({
    where: {
      customerId,
      invoiceId: null,
    },
    orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
  });

  return entries.map(mapEntry);
}

export async function createEntry(input: CreateEntryInput): Promise<TimesheetEntry> {
  // Get customer's default rate to calculate cost
  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    select: { defaultHourlyRate: true },
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  const hourlyRate = input.hourlyRateOverride ?? customer.defaultHourlyRate.toNumber();
  const calculatedCost = calculateCost(input.totalMinutes, hourlyRate);

  const entry = await prisma.timesheetEntry.create({
    data: {
      customerId: input.customerId,
      invoiceId: input.invoiceId || null,
      entryDate: new Date(input.entryDate),
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      totalMinutes: input.totalMinutes,
      taskDescription: input.taskDescription,
      requestor: input.requestor || null,
      hourlyRateOverride: input.hourlyRateOverride ?? null,
      calculatedCost,
    },
  });

  return mapEntry(entry);
}

export async function updateEntry(
  id: string,
  input: UpdateEntryInput
): Promise<TimesheetEntry> {
  // Get the current entry to check if we need to recalculate cost
  const currentEntry = await prisma.timesheetEntry.findUnique({
    where: { id },
    include: { customer: { select: { defaultHourlyRate: true } } },
  });

  if (!currentEntry) {
    throw new Error('Entry not found');
  }

  // If customer is changing, get the new customer's default rate
  const customerId = input.customerId ?? currentEntry.customerId;
  let customerDefaultRate = currentEntry.customer.defaultHourlyRate.toNumber();

  if (input.customerId && input.customerId !== currentEntry.customerId) {
    const newCustomer = await prisma.customer.findUnique({
      where: { id: input.customerId },
      select: { defaultHourlyRate: true },
    });
    if (!newCustomer) {
      throw new Error('Customer not found');
    }
    customerDefaultRate = newCustomer.defaultHourlyRate.toNumber();
  }

  // Determine if we need to recalculate cost
  const totalMinutes = input.totalMinutes ?? currentEntry.totalMinutes;
  const hourlyRateOverride =
    input.hourlyRateOverride !== undefined
      ? input.hourlyRateOverride
      : toNumber(currentEntry.hourlyRateOverride);

  const hourlyRate = hourlyRateOverride ?? customerDefaultRate;
  const calculatedCost = calculateCost(totalMinutes, hourlyRate);

  const entry = await prisma.timesheetEntry.update({
    where: { id },
    data: {
      customerId,
      invoiceId: input.invoiceId,
      entryDate: input.entryDate ? new Date(input.entryDate) : undefined,
      startTime: input.startTime,
      endTime: input.endTime,
      totalMinutes: input.totalMinutes,
      taskDescription: input.taskDescription,
      requestor: input.requestor,
      hourlyRateOverride,
      calculatedCost,
    },
  });

  return mapEntry(entry);
}

export async function deleteEntry(id: string): Promise<void> {
  const entry = await prisma.timesheetEntry.findUnique({
    where: { id },
    select: { invoiceId: true },
  });

  if (entry?.invoiceId) {
    throw new Error('Cannot delete entry that is part of an invoice');
  }

  await prisma.timesheetEntry.delete({
    where: { id },
  });
}

export async function assignEntriesToInvoice(
  entryIds: string[],
  invoiceId: string
): Promise<void> {
  await prisma.timesheetEntry.updateMany({
    where: { id: { in: entryIds } },
    data: { invoiceId },
  });
}

export async function removeEntryFromInvoice(entryId: string): Promise<void> {
  await prisma.timesheetEntry.update({
    where: { id: entryId },
    data: { invoiceId: null },
  });
}
