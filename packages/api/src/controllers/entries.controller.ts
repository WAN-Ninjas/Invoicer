import type { Request, Response } from 'express';
import * as entryService from '../services/entry.service.js';
import * as csvService from '../services/csv.service.js';
import { createEntrySchema, updateEntrySchema, importEntriesSchema } from '@invoicer/shared';
import { AppError } from '../middleware/errorHandler.js';

export async function getAll(req: Request, res: Response): Promise<void> {
  const { customerId, invoiceId, unbilledOnly } = req.query;

  const entries = await entryService.getAllEntries({
    customerId: customerId as string | undefined,
    invoiceId: invoiceId === 'null' ? null : (invoiceId as string | undefined),
    unbilledOnly: unbilledOnly === 'true',
  });

  res.json(entries);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const entry = await entryService.getEntryById(id);

  if (!entry) {
    throw new AppError(404, 'Entry not found');
  }

  res.json(entry);
}

export async function getUnbilled(req: Request, res: Response): Promise<void> {
  const { customerId } = req.params;
  const entries = await entryService.getUnbilledEntriesByCustomer(customerId);
  res.json(entries);
}

export async function create(req: Request, res: Response): Promise<void> {
  const data = createEntrySchema.parse(req.body);
  const entry = await entryService.createEntry(data);
  res.status(201).json(entry);
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const data = updateEntrySchema.parse(req.body);
  const entry = await entryService.updateEntry(id, data);
  res.json(entry);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    await entryService.deleteEntry(id);
    res.json({ success: true, message: 'Entry deleted' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('part of an invoice')) {
      throw new AppError(400, error.message);
    }
    throw error;
  }
}

export async function previewImport(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new AppError(400, 'No file uploaded');
  }

  const { customerId, hourlyRate } = req.body;

  if (!customerId || !hourlyRate) {
    throw new AppError(400, 'customerId and hourlyRate are required');
  }

  const fileContent = req.file.buffer.toString('utf-8');
  const rows = csvService.parseCsvFile(fileContent);
  const preview = csvService.previewCsvImport(rows, parseFloat(hourlyRate));

  res.json(preview);
}

export async function importCsv(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new AppError(400, 'No file uploaded');
  }

  const data = importEntriesSchema.parse(req.body);
  const fileContent = req.file.buffer.toString('utf-8');
  const rows = csvService.parseCsvFile(fileContent);
  const preview = csvService.previewCsvImport(rows, data.hourlyRate);

  const result = await csvService.importCsvEntries(
    data.customerId,
    data.hourlyRate,
    preview.entries,
    data.filename
  );

  res.status(201).json({
    success: true,
    batchId: result.batchId,
    entriesCount: result.entries.length,
    totalMinutes: preview.totalMinutes,
    totalCost: preview.totalCost,
  });
}
