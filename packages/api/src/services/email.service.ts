import nodemailer from 'nodemailer';
import { prisma } from '../config/database.js';
import { getSettings } from './settings.service.js';
import { getInvoiceWithDetails } from './invoice.service.js';
import { generateInvoicePdf } from './pdf.service.js';
import {
  getTemplate,
  getDefaultTemplate,
  processTemplate,
  buildTemplateContext,
} from './template.service.js';

interface SendInvoiceResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): void {
  if (!EMAIL_REGEX.test(email) || /[\r\n,;]/.test(email)) {
    throw new Error('Invalid email address');
  }
}

export async function sendInvoiceEmail(
  invoiceId: string,
  recipientEmail?: string
): Promise<SendInvoiceResult> {
  const invoice = await getInvoiceWithDetails(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const settings = await getSettings();

  // Use provided email or fall back to customer email
  const toEmail = recipientEmail || invoice.customer.email;
  if (!toEmail) {
    throw new Error('No recipient email address provided');
  }
  validateEmail(toEmail);

  // Check if Mailgun is configured
  if (!settings.mailgunSmtpUser || !settings.mailgunSmtpPass) {
    throw new Error('Email not configured. Please set up Mailgun SMTP in settings.');
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: settings.mailgunSmtpHost,
    port: settings.mailgunSmtpPort,
    secure: false,
    auth: {
      user: settings.mailgunSmtpUser,
      pass: settings.mailgunSmtpPass,
    },
  });

  // Generate PDF
  const pdfBuffer = await generateInvoicePdf(invoiceId);

  // Get email template
  const template = await getTemplate('invoice_email') || getDefaultTemplate('invoice_email');

  // Build template context
  const context = buildTemplateContext(invoice, settings);

  // Process template
  const subject = processTemplate(template.subject || 'Invoice {{invoice.invoiceNumber}}', context);
  const htmlContent = processTemplate(template.htmlContent, context);

  try {
    const info = await transporter.sendMail({
      from: `"${settings.companyName}" <${settings.mailgunFromEmail}>`,
      to: toEmail,
      subject,
      html: htmlContent,
      attachments: [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    // Log successful send
    await prisma.emailLog.create({
      data: {
        invoiceId,
        recipientEmail: toEmail,
        subject,
        status: 'sent',
        mailgunMessageId: info.messageId,
      },
    });

    // Update invoice status to sent
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failed send
    await prisma.emailLog.create({
      data: {
        invoiceId,
        recipientEmail: toEmail,
        subject,
        status: 'failed',
        errorMessage,
      },
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function sendReminderEmail(
  invoiceId: string,
  recipientEmail?: string
): Promise<SendInvoiceResult> {
  const invoice = await getInvoiceWithDetails(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status !== 'sent' && invoice.status !== 'overdue') {
    throw new Error('Can only send reminders for sent or overdue invoices');
  }

  const settings = await getSettings();

  const toEmail = recipientEmail || invoice.customer.email;
  if (!toEmail) {
    throw new Error('No recipient email address provided');
  }
  validateEmail(toEmail);

  if (!settings.mailgunSmtpUser || !settings.mailgunSmtpPass) {
    throw new Error('Email not configured. Please set up Mailgun SMTP in settings.');
  }

  const transporter = nodemailer.createTransport({
    host: settings.mailgunSmtpHost,
    port: settings.mailgunSmtpPort,
    secure: false,
    auth: {
      user: settings.mailgunSmtpUser,
      pass: settings.mailgunSmtpPass,
    },
  });

  const pdfBuffer = await generateInvoicePdf(invoiceId);

  // Get reminder email template
  const template = await getTemplate('reminder_email') || getDefaultTemplate('reminder_email');

  // Build template context
  const context = buildTemplateContext(invoice, settings);

  // Process template
  const subject = processTemplate(template.subject || 'Friendly Reminder: Invoice {{invoice.invoiceNumber}}', context);
  const htmlContent = processTemplate(template.htmlContent, context);

  try {
    const info = await transporter.sendMail({
      from: `"${settings.companyName}" <${settings.mailgunFromEmail}>`,
      to: toEmail,
      subject,
      html: htmlContent,
      attachments: [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    await prisma.emailLog.create({
      data: {
        invoiceId,
        recipientEmail: toEmail,
        subject,
        status: 'sent',
        mailgunMessageId: info.messageId,
      },
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.emailLog.create({
      data: {
        invoiceId,
        recipientEmail: toEmail,
        subject,
        status: 'failed',
        errorMessage,
      },
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function getEmailLogs(invoiceId?: string) {
  const where = invoiceId ? { invoiceId } : {};

  return prisma.emailLog.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    take: 100,
  });
}
