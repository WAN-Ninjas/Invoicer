import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(1000).optional(),
  defaultHourlyRate: z.number().min(0, 'Rate must be positive'),
  notes: z.string().max(5000).optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  address: z.string().max(1000).nullable().optional(),
  defaultHourlyRate: z.number().min(0).optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export type CreateCustomerSchema = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerSchema = z.infer<typeof updateCustomerSchema>;
