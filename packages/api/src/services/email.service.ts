import nodemailer from 'nodemailer';
import { prisma } from '../config/database.js';
import { getSettings } from './settings.service.js';
import { getInvoiceWithDetails } from './invoice.service.js';
import { generateInvoicePdf } from './pdf.service.js';
import { formatCurrency, formatDateLong } from '@invoicer/shared';

interface SendInvoiceResult {
  success: boolean;
  messageId?: string;
  error?: string;
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

  // Email content
  const subject = `Invoice ${invoice.invoiceNumber} from ${settings.companyName}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Invoice ${invoice.invoiceNumber}</h2>

      <p>Dear ${invoice.customer.name},</p>

      <p>Please find attached invoice <strong>${invoice.invoiceNumber}</strong> for services rendered.</p>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
        <p style="margin: 5px 0;"><strong>Date:</strong> ${formatDateLong(invoice.createdAt)}</p>
        ${invoice.dueDate ? `<p style="margin: 5px 0;"><strong>Due Date:</strong> ${formatDateLong(invoice.dueDate)}</p>` : ''}
        <p style="margin: 15px 0 5px 0; font-size: 18px;"><strong>Amount Due: ${formatCurrency(invoice.total)}</strong></p>
      </div>

      <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>

      <p>Thank you for your business!</p>

      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>${settings.companyName}</strong>
        ${settings.companyEmail ? `<br>${settings.companyEmail}` : ''}
        ${settings.companyPhone ? `<br>${settings.companyPhone}` : ''}
      </p>
    </div>
  `;

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

export async function getEmailLogs(invoiceId?: string) {
  const where = invoiceId ? { invoiceId } : {};

  return prisma.emailLog.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    take: 100,
  });
}
