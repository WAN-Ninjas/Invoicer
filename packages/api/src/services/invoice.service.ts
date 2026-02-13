import { prisma } from '../config/database.js';
import type {
  Invoice,
  InvoiceWithDetails,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceSummary,
  InvoiceStatus,
} from '@invoicer/shared';
import { calculateEntryCost, generateInvoiceNumber } from '@invoicer/shared';
import { getSetting } from './settings.service.js';
import { Prisma } from '../generated/prisma/client.js';
type Decimal = Prisma.Decimal;

function toNumber(decimal: Decimal | null | undefined): number | null {
  if (decimal === null || decimal === undefined) return null;
  return decimal.toNumber();
}

function toNumberRequired(decimal: Decimal): number {
  return decimal.toNumber();
}

function mapInvoice(invoice: {
  id: string;
  invoiceNumber: string;
  customerId: string;
  status: string;
  hourlyRateOverride: Decimal | null;
  subtotal: Decimal;
  taxRate: Decimal;
  taxAmount: Decimal;
  total: Decimal;
  notes: string | null;
  dueDate: Date | null;
  sentAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Invoice {
  return {
    ...invoice,
    status: invoice.status as InvoiceStatus,
    hourlyRateOverride: toNumber(invoice.hourlyRateOverride),
    subtotal: toNumberRequired(invoice.subtotal),
    taxRate: toNumberRequired(invoice.taxRate),
    taxAmount: toNumberRequired(invoice.taxAmount),
    total: toNumberRequired(invoice.total),
  };
}

export async function getNextInvoiceNumber(): Promise<string> {
  const prefix = await getSetting('invoicePrefix');

  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });

  let sequence = 1;
  if (lastInvoice) {
    const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
    if (match) {
      sequence = parseInt(match[1], 10) + 1;
    }
  }

  return generateInvoiceNumber(prefix, sequence);
}

export async function getAllInvoices(filters?: {
  customerId?: string;
  status?: InvoiceStatus;
}): Promise<Invoice[]> {
  const where: Record<string, unknown> = {};

  if (filters?.customerId) {
    where.customerId = filters.customerId;
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  return invoices.map(mapInvoice);
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
  });

  return invoice ? mapInvoice(invoice) : null;
}

export async function getInvoiceWithDetails(id: string): Promise<InvoiceWithDetails | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      entries: {
        orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
      },
      charges: {
        orderBy: [{ chargeDate: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (!invoice) return null;

  return {
    ...mapInvoice(invoice),
    customer: {
      ...invoice.customer,
      defaultHourlyRate: invoice.customer.defaultHourlyRate.toNumber(),
    },
    entries: invoice.entries.map((e) => ({
      ...e,
      hourlyRateOverride: toNumber(e.hourlyRateOverride),
      calculatedCost: toNumberRequired(e.calculatedCost),
    })),
    charges: invoice.charges.map((c) => ({
      ...c,
      quantity: toNumberRequired(c.quantity),
      unitPrice: toNumberRequired(c.unitPrice),
      total: toNumberRequired(c.total),
    })),
  };
}

export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceWithDetails> {
  const invoiceNumber = await getNextInvoiceNumber();

  // Get customer
  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  // Get entries (if any)
  const entryIds = input.entryIds || [];
  const entries = entryIds.length > 0 ? await prisma.timesheetEntry.findMany({
    where: {
      id: { in: entryIds },
      customerId: input.customerId,
      invoiceId: null, // Only unbilled entries
    },
  }) : [];

  if (entryIds.length > 0 && entries.length !== entryIds.length) {
    throw new Error('Some entries are not available for invoicing');
  }

  // Get charges (if any)
  const chargeIds = (input as { chargeIds?: string[] }).chargeIds || [];
  const charges = chargeIds.length > 0 ? await prisma.charge.findMany({
    where: {
      id: { in: chargeIds },
      customerId: input.customerId,
      invoiceId: null, // Only unbilled charges
    },
  }) : [];

  if (chargeIds.length > 0 && charges.length !== chargeIds.length) {
    throw new Error('Some charges are not available for invoicing');
  }

  // Require at least one entry or charge
  if (entries.length === 0 && charges.length === 0) {
    throw new Error('Invoice must have at least one entry or charge');
  }

  // Calculate totals
  const taxRate = input.taxRate ?? (await getSetting('defaultTaxRate'));
  const invoiceData = {
    hourlyRateOverride: input.hourlyRateOverride ?? null,
    taxRate,
  };

  // Calculate time entries subtotal
  const entriesSubtotal = entries.reduce((sum, entry) => {
    const cost = calculateEntryCost(
      {
        totalMinutes: entry.totalMinutes,
        hourlyRateOverride: toNumber(entry.hourlyRateOverride),
      },
      invoiceData,
      { defaultHourlyRate: customer.defaultHourlyRate.toNumber() }
    );
    return sum + cost;
  }, 0);

  // Calculate charges subtotal
  const chargesSubtotal = charges.reduce((sum, charge) => {
    return sum + charge.total.toNumber();
  }, 0);

  const subtotal = entriesSubtotal + chargesSubtotal;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  // Create invoice and assign entries/charges in a transaction
  const invoice = await prisma.$transaction(async (tx) => {
    const newInvoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        customerId: input.customerId,
        hourlyRateOverride: input.hourlyRateOverride ?? null,
        subtotal,
        taxRate,
        taxAmount,
        total,
        notes: input.notes || null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      },
    });

    // Assign entries to invoice
    if (entryIds.length > 0) {
      await tx.timesheetEntry.updateMany({
        where: { id: { in: entryIds } },
        data: { invoiceId: newInvoice.id },
      });
    }

    // Assign charges to invoice
    if (chargeIds.length > 0) {
      await tx.charge.updateMany({
        where: { id: { in: chargeIds } },
        data: { invoiceId: newInvoice.id },
      });
    }

    return newInvoice;
  });

  // Fetch the complete invoice with details
  const result = await getInvoiceWithDetails(invoice.id);
  if (!result) {
    throw new Error('Failed to create invoice');
  }

  return result;
}

export async function updateInvoice(
  id: string,
  input: UpdateInvoiceInput
): Promise<InvoiceWithDetails> {
  const existingInvoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      entries: true,
    },
  });

  if (!existingInvoice) {
    throw new Error('Invoice not found');
  }

  // Only allow updates to draft invoices (except status changes)
  if (existingInvoice.status !== 'draft' && Object.keys(input).some((k) => k !== 'status')) {
    throw new Error('Can only update draft invoices');
  }

  // Recalculate totals if rate or tax changed
  let subtotal = existingInvoice.subtotal.toNumber();
  let taxAmount = existingInvoice.taxAmount.toNumber();
  let total = existingInvoice.total.toNumber();

  if (input.hourlyRateOverride !== undefined || input.taxRate !== undefined) {
    const hourlyRateOverride =
      input.hourlyRateOverride !== undefined
        ? input.hourlyRateOverride
        : toNumber(existingInvoice.hourlyRateOverride);
    const taxRate = input.taxRate ?? existingInvoice.taxRate.toNumber();

    subtotal = existingInvoice.entries.reduce((sum, entry) => {
      const cost = calculateEntryCost(
        {
          totalMinutes: entry.totalMinutes,
          hourlyRateOverride: toNumber(entry.hourlyRateOverride),
        },
        { hourlyRateOverride },
        { defaultHourlyRate: existingInvoice.customer.defaultHourlyRate.toNumber() }
      );
      return sum + cost;
    }, 0);

    taxAmount = Math.round(subtotal * taxRate * 100) / 100;
    total = Math.round((subtotal + taxAmount) * 100) / 100;
  }

  await prisma.invoice.update({
    where: { id },
    data: {
      hourlyRateOverride: input.hourlyRateOverride,
      taxRate: input.taxRate,
      notes: input.notes,
      dueDate: input.dueDate ? new Date(input.dueDate) : input.dueDate,
      status: input.status,
      sentAt: input.status === 'sent' ? new Date() : undefined,
      paidAt: input.status === 'paid' ? new Date() : undefined,
      subtotal,
      taxAmount,
      total,
    },
  });

  const result = await getInvoiceWithDetails(id);
  if (!result) {
    throw new Error('Failed to update invoice');
  }

  return result;
}

export async function deleteInvoice(id: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status !== 'draft') {
    throw new Error('Can only delete draft invoices');
  }

  // Remove entries and charges from invoice and delete
  await prisma.$transaction(async (tx) => {
    await tx.timesheetEntry.updateMany({
      where: { invoiceId: id },
      data: { invoiceId: null },
    });

    await tx.charge.updateMany({
      where: { invoiceId: id },
      data: { invoiceId: null },
    });

    await tx.invoice.delete({
      where: { id },
    });
  });
}

export async function recalculateInvoiceTotals(id: string): Promise<InvoiceWithDetails> {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      entries: true,
      charges: true,
    },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Calculate time entries subtotal
  const entriesSubtotal = invoice.entries.reduce((sum, entry) => {
    const cost = calculateEntryCost(
      {
        totalMinutes: entry.totalMinutes,
        hourlyRateOverride: toNumber(entry.hourlyRateOverride),
      },
      { hourlyRateOverride: toNumber(invoice.hourlyRateOverride) },
      { defaultHourlyRate: invoice.customer.defaultHourlyRate.toNumber() }
    );
    return sum + cost;
  }, 0);

  // Calculate charges subtotal
  const chargesSubtotal = invoice.charges.reduce((sum, charge) => {
    return sum + charge.total.toNumber();
  }, 0);

  const subtotal = entriesSubtotal + chargesSubtotal;
  const taxAmount = Math.round(subtotal * invoice.taxRate.toNumber() * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  await prisma.invoice.update({
    where: { id },
    data: { subtotal, taxAmount, total },
  });

  const result = await getInvoiceWithDetails(id);
  if (!result) {
    throw new Error('Failed to recalculate invoice');
  }

  return result;
}

export async function getInvoiceSummary(): Promise<InvoiceSummary> {
  const invoices = await prisma.invoice.findMany({
    select: { status: true, total: true },
  });

  const summary: InvoiceSummary = {
    totalDraft: 0,
    totalSent: 0,
    totalPaid: 0,
    totalOverdue: 0,
    amountDraft: 0,
    amountSent: 0,
    amountPaid: 0,
    amountOverdue: 0,
  };

  for (const invoice of invoices) {
    const amount = invoice.total.toNumber();

    switch (invoice.status) {
      case 'draft':
        summary.totalDraft++;
        summary.amountDraft += amount;
        break;
      case 'sent':
        summary.totalSent++;
        summary.amountSent += amount;
        break;
      case 'paid':
        summary.totalPaid++;
        summary.amountPaid += amount;
        break;
      case 'overdue':
        summary.totalOverdue++;
        summary.amountOverdue += amount;
        break;
    }
  }

  return summary;
}
