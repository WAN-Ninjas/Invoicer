import Papa from 'papaparse';
import { prisma } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import {
  parseDateString,
  parseTimeString,
  parseCurrency,
  calculateCost,
} from '@invoicer/shared';
import type { CsvRow, CsvImportPreview, ParsedCsvEntry, TimesheetEntry } from '@invoicer/shared';
import { Decimal } from '@prisma/client/runtime/library';

function toNumber(decimal: Decimal | null | undefined): number {
  if (decimal === null || decimal === undefined) return 0;
  return decimal.toNumber();
}

export function parseCsvFile(fileContent: string): CsvRow[] {
  const result = Papa.parse<CsvRow>(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    console.warn('CSV parse warnings:', result.errors);
  }

  return result.data;
}

export function previewCsvImport(rows: CsvRow[], hourlyRate: number): CsvImportPreview {
  const entries: ParsedCsvEntry[] = [];
  let skippedRows = 0;

  for (const row of rows) {
    // Skip empty rows (Total Minutes = 00 or 0 or empty)
    const totalMinutes = parseInt(row['Total Minutes'], 10);
    if (isNaN(totalMinutes) || totalMinutes <= 0) {
      skippedRows++;
      continue;
    }

    // Skip rows without a date
    const date = parseDateString(row.Date);
    if (!date) {
      skippedRows++;
      continue;
    }

    // Skip rows without task description
    if (!row.Task || row.Task.trim() === '') {
      skippedRows++;
      continue;
    }

    const startTime = parseTimeString(row.Begin);
    const endTime = parseTimeString(row.End);
    const originalCost = parseCurrency(row['Cost(90/hr)']);

    entries.push({
      entryDate: date.toISOString(),
      startTime,
      endTime,
      totalMinutes,
      taskDescription: row.Task.trim(),
      requestor: row.Requestor?.trim() || null,
      originalCost,
    });
  }

  const totalMinutes = entries.reduce((sum, e) => sum + e.totalMinutes, 0);
  const totalCost = calculateCost(totalMinutes, hourlyRate);

  return {
    entries,
    totalMinutes,
    totalCost,
    rowCount: entries.length,
    skippedRows,
  };
}

export async function importCsvEntries(
  customerId: string,
  hourlyRate: number,
  entries: ParsedCsvEntry[],
  filename: string
): Promise<{ batchId: string; entries: TimesheetEntry[] }> {
  const batchId = uuidv4();

  // Create import batch
  const totalMinutes = entries.reduce((sum, e) => sum + e.totalMinutes, 0);
  const totalCost = calculateCost(totalMinutes, hourlyRate);

  // Atomically create batch + entries in a single transaction
  const createdEntries = await prisma.$transaction(async (tx) => {
    await tx.importBatch.create({
      data: {
        id: batchId,
        filename,
        customerId,
        entriesCount: entries.length,
        totalMinutes,
        totalCost,
      },
    });

    await tx.timesheetEntry.createMany({
      data: entries.map((entry) => ({
        customerId,
        entryDate: new Date(entry.entryDate),
        startTime: entry.startTime,
        endTime: entry.endTime,
        totalMinutes: entry.totalMinutes,
        taskDescription: entry.taskDescription,
        requestor: entry.requestor,
        calculatedCost: calculateCost(entry.totalMinutes, hourlyRate),
        importBatchId: batchId,
      })),
    });

    return tx.timesheetEntry.findMany({
      where: { importBatchId: batchId },
      orderBy: { entryDate: 'asc' },
    });
  });

  return {
    batchId,
    entries: createdEntries.map((e) => ({
      id: e.id,
      invoiceId: e.invoiceId,
      customerId: e.customerId,
      entryDate: e.entryDate,
      startTime: e.startTime,
      endTime: e.endTime,
      totalMinutes: e.totalMinutes,
      taskDescription: e.taskDescription,
      requestor: e.requestor,
      hourlyRateOverride: toNumber(e.hourlyRateOverride) || null,
      calculatedCost: toNumber(e.calculatedCost),
      importBatchId: e.importBatchId,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
  };
}
