import { z } from 'zod';

export const invoiceStatusSchema = z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']);

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  entryIds: z.array(z.string().uuid()).min(1, 'At least one entry is required'),
  hourlyRateOverride: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(1).optional(),
  notes: z.string().max(5000).optional(),
  dueDate: z.string().or(z.date()).optional(),
});

export const updateInvoiceSchema = z.object({
  hourlyRateOverride: z.number().min(0).nullable().optional(),
  taxRate: z.number().min(0).max(1).optional(),
  notes: z.string().max(5000).nullable().optional(),
  dueDate: z.string().or(z.date()).nullable().optional(),
  status: invoiceStatusSchema.optional(),
});

export const addEntriesToInvoiceSchema = z.object({
  entryIds: z.array(z.string().uuid()).min(1),
});

export type CreateInvoiceSchema = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceSchema = z.infer<typeof updateInvoiceSchema>;
export type AddEntriesToInvoiceSchema = z.infer<typeof addEntriesToInvoiceSchema>;
