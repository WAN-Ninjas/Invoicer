export interface TimesheetEntry {
  id: string;
  invoiceId: string | null;
  customerId: string;
  entryDate: Date;
  startTime: string | null;
  endTime: string | null;
  totalMinutes: number;
  taskDescription: string;
  requestor: string | null;
  hourlyRateOverride: number | null;
  calculatedCost: number;
  importBatchId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEntryInput {
  customerId: string;
  invoiceId?: string;
  entryDate: Date | string;
  startTime?: string;
  endTime?: string;
  totalMinutes: number;
  taskDescription: string;
  requestor?: string;
  hourlyRateOverride?: number;
}

export interface UpdateEntryInput {
  invoiceId?: string | null;
  entryDate?: Date | string;
  startTime?: string | null;
  endTime?: string | null;
  totalMinutes?: number;
  taskDescription?: string;
  requestor?: string | null;
  hourlyRateOverride?: number | null;
}

export interface CsvRow {
  Date: string;
  Begin: string;
  End: string;
  'Total Minutes': string;
  Task: string;
  Requestor: string;
  Company: string;
  'Cost(90/hr)': string;
  'Running Total': string;
}

export interface CsvImportPreview {
  entries: ParsedCsvEntry[];
  totalMinutes: number;
  totalCost: number;
  rowCount: number;
  skippedRows: number;
}

export interface ParsedCsvEntry {
  entryDate: string;
  startTime: string | null;
  endTime: string | null;
  totalMinutes: number;
  taskDescription: string;
  requestor: string | null;
  originalCost: number;
}

export interface ImportBatch {
  id: string;
  filename: string;
  customerId: string;
  entriesCount: number;
  totalMinutes: number;
  totalCost: number;
  importedAt: Date;
}
