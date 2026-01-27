import type { Customer } from './customer.js';
import type { TimesheetEntry } from './entry.js';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  status: InvoiceStatus;
  hourlyRateOverride: number | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  dueDate: Date | null;
  sentAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceWithDetails extends Invoice {
  customer: Customer;
  entries: TimesheetEntry[];
}

export interface CreateInvoiceInput {
  customerId: string;
  entryIds: string[];
  hourlyRateOverride?: number;
  taxRate?: number;
  notes?: string;
  dueDate?: Date | string;
}

export interface UpdateInvoiceInput {
  hourlyRateOverride?: number | null;
  taxRate?: number;
  notes?: string | null;
  dueDate?: Date | string | null;
  status?: InvoiceStatus;
}

export interface InvoiceSummary {
  totalDraft: number;
  totalSent: number;
  totalPaid: number;
  totalOverdue: number;
  amountDraft: number;
  amountSent: number;
  amountPaid: number;
  amountOverdue: number;
}
