import { z } from 'zod';

export const invoiceStatusSchema = z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']);

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  entryIds: z.array(z.string().uuid()).optional().default([]),
  chargeIds: z.array(z.string().uuid()).optional().default([]),
  hourlyRateOverride: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(1).optional(),
  notes: z.string().max(5000).optional(),
  dueDate: z.string().or(z.date()).optional(),
}).refine(
  (data) => data.entryIds.length > 0 || data.chargeIds.length > 0,
  { message: 'At least one entry or charge is required' },
);

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
