import { z } from 'zod';

export const createEntrySchema = z.object({
  customerId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  entryDate: z.string().or(z.date()),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  totalMinutes: z.number().int().min(1, 'Duration must be at least 1 minute'),
  taskDescription: z.string().min(1, 'Task description is required').max(2000),
  requestor: z.string().max(255).optional(),
  hourlyRateOverride: z.number().min(0).optional(),
});

export const updateEntrySchema = z.object({
  invoiceId: z.string().uuid().nullable().optional(),
  entryDate: z.string().or(z.date()).optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  totalMinutes: z.number().int().min(1).optional(),
  taskDescription: z.string().min(1).max(2000).optional(),
  requestor: z.string().max(255).nullable().optional(),
  hourlyRateOverride: z.number().min(0).nullable().optional(),
});

export const importEntriesSchema = z.object({
  customerId: z.string().uuid(),
  hourlyRate: z.coerce.number().min(0),
  filename: z.string().min(1),
});

export type CreateEntrySchema = z.infer<typeof createEntrySchema>;
export type UpdateEntrySchema = z.infer<typeof updateEntrySchema>;
export type ImportEntriesSchema = z.infer<typeof importEntriesSchema>;
