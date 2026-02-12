import type { Request, Response } from 'express';
import * as invoiceService from '../services/invoice.service.js';
import { generateInvoicePdf } from '../services/pdf.service.js';
import { sendInvoiceEmail, sendReminderEmail } from '../services/email.service.js';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  addEntriesToInvoiceSchema,
} from '@invoicer/shared';
import { AppError } from '../middleware/errorHandler.js';
import type { InvoiceStatus } from '@invoicer/shared';

export async function getAll(req: Request, res: Response): Promise<void> {
  const { customerId, status } = req.query;

  const invoices = await invoiceService.getAllInvoices({
    customerId: customerId as string | undefined,
    status: status as InvoiceStatus | undefined,
  });

  res.json(invoices);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const invoice = await invoiceService.getInvoiceWithDetails(id);

  if (!invoice) {
    throw new AppError(404, 'Invoice not found');
  }

  res.json(invoice);
}

export async function getSummary(_req: Request, res: Response): Promise<void> {
  const summary = await invoiceService.getInvoiceSummary();
  res.json(summary);
}

export async function create(req: Request, res: Response): Promise<void> {
  const data = createInvoiceSchema.parse(req.body);

  try {
    const invoice = await invoiceService.createInvoice(data);
    res.status(201).json(invoice);
  } catch (error) {
    if (error instanceof Error) {
      throw new AppError(400, error.message);
    }
    throw error;
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const data = updateInvoiceSchema.parse(req.body);

  try {
    const invoice = await invoiceService.updateInvoice(id, data);
    res.json(invoice);
  } catch (error) {
    if (error instanceof Error) {
      throw new AppError(400, error.message);
    }
    throw error;
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    await invoiceService.deleteInvoice(id);
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (error) {
    if (error instanceof Error) {
      throw new AppError(400, error.message);
    }
    throw error;
  }
}

export async function addEntries(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { entryIds } = addEntriesToInvoiceSchema.parse(req.body);

  // Get invoice to verify it exists and is draft
  const invoice = await invoiceService.getInvoiceById(id);
  if (!invoice) {
    throw new AppError(404, 'Invoice not found');
  }

  if (invoice.status !== 'draft') {
    throw new AppError(400, 'Can only add entries to draft invoices');
  }

  // Import entry service for assigning entries
  const { assignEntriesToInvoice } = await import('../services/entry.service.js');
  await assignEntriesToInvoice(entryIds, id);

  // Recalculate totals
  const updatedInvoice = await invoiceService.recalculateInvoiceTotals(id);
  res.json(updatedInvoice);
}

export async function removeEntry(req: Request, res: Response): Promise<void> {
  const { id, entryId } = req.params;

  // Get invoice to verify it exists and is draft
  const invoice = await invoiceService.getInvoiceById(id);
  if (!invoice) {
    throw new AppError(404, 'Invoice not found');
  }

  if (invoice.status !== 'draft') {
    throw new AppError(400, 'Can only remove entries from draft invoices');
  }

  const { removeEntryFromInvoice } = await import('../services/entry.service.js');
  await removeEntryFromInvoice(entryId);

  // Recalculate totals
  const updatedInvoice = await invoiceService.recalculateInvoiceTotals(id);
  res.json(updatedInvoice);
}

export async function recalculate(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const invoice = await invoiceService.recalculateInvoiceTotals(id);
  res.json(invoice);
}

export async function downloadPdf(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const invoice = await invoiceService.getInvoiceById(id);
  if (!invoice) {
    throw new AppError(404, 'Invoice not found');
  }

  const pdfBuffer = await generateInvoicePdf(id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${invoice.invoiceNumber}.pdf"`
  );
  res.send(pdfBuffer);
}

export async function sendEmail(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { email } = req.body;

  const result = await sendInvoiceEmail(id, email);

  if (!result.success) {
    throw new AppError(500, result.error || 'Failed to send email');
  }

  res.json({
    success: true,
    message: 'Invoice sent successfully',
    messageId: result.messageId,
  });
}

export async function sendReminder(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { email } = req.body;

  const result = await sendReminderEmail(id, email);

  if (!result.success) {
    throw new AppError(500, result.error || 'Failed to send reminder');
  }

  res.json({
    success: true,
    message: 'Reminder sent successfully',
    messageId: result.messageId,
  });
}
