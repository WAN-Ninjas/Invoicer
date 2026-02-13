import { prisma } from '../config/database.js';
import type { TemplateType, UpdateTemplateInput } from '@invoicer/shared';
import { formatCurrency, formatDateLong } from '@invoicer/shared';

interface TemplateContext {
  invoice: {
    invoiceNumber: string;
    createdAt: string;
    dueDate: string;
    subtotal: string;
    taxRate: string;
    taxAmount: string;
    total: string;
    notes: string;
    sentAt: string;
  };
  customer: {
    name: string;
    email: string;
    address: string;
  };
  company: {
    name: string;
    email: string;
    phone: string;
    address: string;
    logo: string;
  };
  lineItems: string;
}

const DEFAULT_TEMPLATES: Record<TemplateType, { name: string; subject: string | null; htmlContent: string }> = {
  invoice_email: {
    name: 'Invoice Email',
    subject: 'Invoice {{invoice.invoiceNumber}} from {{company.name}}',
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Invoice {{invoice.invoiceNumber}}</h2>

  <p>Dear {{customer.name}},</p>

  <p>Please find attached invoice <strong>{{invoice.invoiceNumber}}</strong> for services rendered.</p>

  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 5px 0;"><strong>Invoice Number:</strong> {{invoice.invoiceNumber}}</p>
    <p style="margin: 5px 0;"><strong>Date:</strong> {{invoice.createdAt}}</p>
    <p style="margin: 5px 0;"><strong>Due Date:</strong> {{invoice.dueDate}}</p>
    <p style="margin: 15px 0 5px 0; font-size: 18px;"><strong>Amount Due: {{invoice.total}}</strong></p>
  </div>

  <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>

  <p>Thank you for your business!</p>

  <p style="margin-top: 30px;">
    Best regards,<br>
    <strong>{{company.name}}</strong><br>
    {{company.email}}<br>
    {{company.phone}}
  </p>
</div>`,
  },
  reminder_email: {
    name: 'Payment Reminder Email',
    subject: 'Friendly Reminder: Invoice {{invoice.invoiceNumber}} from {{company.name}}',
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Friendly Reminder: Invoice {{invoice.invoiceNumber}}</h2>

  <p>Dear {{customer.name}},</p>

  <p>We hope this message finds you well.</p>

  <p>This is a friendly reminder regarding invoice <strong>{{invoice.invoiceNumber}}</strong>, which was sent on {{invoice.sentAt}}.</p>

  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 5px 0;"><strong>Invoice Number:</strong> {{invoice.invoiceNumber}}</p>
    <p style="margin: 5px 0;"><strong>Date:</strong> {{invoice.createdAt}}</p>
    <p style="margin: 5px 0;"><strong>Due Date:</strong> {{invoice.dueDate}}</p>
    <p style="margin: 15px 0 5px 0; font-size: 18px;"><strong>Amount Due: {{invoice.total}}</strong></p>
  </div>

  <p>We would appreciate it if you could process this payment at your earliest convenience. If you have already sent the payment, please disregard this reminder.</p>

  <p>If you have any questions about this invoice or need to discuss payment arrangements, please don't hesitate to reach out.</p>

  <p>Thank you for your continued business!</p>

  <p style="margin-top: 30px;">
    Best regards,<br>
    <strong>{{company.name}}</strong><br>
    {{company.email}}<br>
    {{company.phone}}
  </p>
</div>`,
  },
  invoice_pdf: {
    name: 'Invoice PDF',
    subject: null,
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', Arial, sans-serif;
      background: #0b0e14;
      color: #e6edf3;
      padding: 40px;
      font-size: 12px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      border-top: 5px solid #6366f1;
      padding-top: 20px;
    }

    .logo img {
      max-height: 55px;
    }

    .company-info {
      text-align: right;
    }

    .company-name {
      font-size: 18px;
      font-weight: 700;
      color: #e6edf3;
      margin-bottom: 8px;
    }

    .company-details {
      color: #8b949e;
      font-size: 9px;
      line-height: 1.6;
    }

    .invoice-title {
      font-size: 32px;
      font-weight: 700;
      color: #6366f1;
      margin-bottom: 10px;
    }

    .invoice-meta {
      color: #8b949e;
      font-size: 10px;
      line-height: 1.8;
    }

    .bill-to-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }

    .bill-to {
      background: #161b22;
      padding: 15px 20px;
      border-radius: 4px;
      border-left: 4px solid #6366f1;
      min-width: 250px;
    }

    .bill-to-label {
      color: #6366f1;
      font-size: 8px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .bill-to-name {
      font-size: 11px;
      font-weight: 700;
      color: #e6edf3;
      margin-bottom: 4px;
    }

    .bill-to-details {
      color: #8b949e;
      font-size: 8px;
      line-height: 1.6;
    }

    .line-items {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    .line-items th {
      background: #161b22;
      color: #e6edf3;
      font-weight: 700;
      font-size: 9px;
      text-align: left;
      padding: 12px 10px;
      text-transform: uppercase;
    }

    .line-items th:nth-child(3),
    .line-items th:nth-child(4) {
      text-align: right;
    }

    .line-items td {
      padding: 10px;
      border-bottom: 1px solid #30363d;
      font-size: 9px;
    }

    .line-items tr:nth-child(even) td {
      background: #1c2128;
    }

    .line-items td:nth-child(3),
    .line-items td:nth-child(4) {
      text-align: right;
    }

    .line-items .amount {
      color: #00f7ff;
      font-weight: 700;
    }

    .line-items .qty {
      color: #8b949e;
    }

    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }

    .totals-box {
      min-width: 200px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      color: #8b949e;
      font-size: 10px;
    }

    .total-final {
      background: #161b22;
      border-left: 4px solid #6366f1;
      padding: 12px 15px;
      margin-top: 10px;
    }

    .total-final .label {
      font-weight: 700;
      color: #e6edf3;
      font-size: 14px;
    }

    .total-final .value {
      font-weight: 700;
      color: #00f7ff;
      font-size: 14px;
    }

    .footer {
      border-top: 1px solid #30363d;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
    }

    .terms {
      max-width: 60%;
    }

    .terms-label {
      color: #6366f1;
      font-size: 8px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .terms-text {
      color: #8b949e;
      font-size: 8px;
      line-height: 1.6;
    }

    .thank-you {
      color: #e6edf3;
      font-weight: 700;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      {{#if company.logo}}
      <img src="{{company.logo}}" alt="Logo">
      {{/if}}
    </div>
    <div class="company-info">
      <div class="company-name">{{company.name}}</div>
      <div class="company-details">
        {{company.address}}<br>
        {{company.email}} • {{company.phone}}
      </div>
    </div>
  </div>

  <div class="bill-to-section">
    <div>
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-meta">
        #{{invoice.invoiceNumber}}<br>
        Date: {{invoice.createdAt}}<br>
        Due: {{invoice.dueDate}}
      </div>
    </div>
    <div class="bill-to">
      <div class="bill-to-label">Bill To</div>
      <div class="bill-to-name">{{customer.name}}</div>
      <div class="bill-to-details">
        {{customer.email}}<br>
        {{customer.address}}
      </div>
    </div>
  </div>

  {{lineItems}}

  <div class="totals">
    <div class="totals-box">
      {{#if invoice.taxRate}}
      <div class="total-row">
        <span>Tax ({{invoice.taxRate}})</span>
        <span>{{invoice.taxAmount}}</span>
      </div>
      {{/if}}
      <div class="total-final">
        <span class="label">TOTAL:</span>
        <span class="value">{{invoice.total}}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="terms">
      <div class="terms-label">Terms & Conditions</div>
      <div class="terms-text">{{invoice.notes}}</div>
    </div>
    <div class="thank-you">Thank you for your business!</div>
  </div>
</body>
</html>`,
  },
};

export async function getTemplate(type: TemplateType) {
  const template = await prisma.template.findUnique({
    where: { type },
  });
  return template;
}

export async function getAllTemplates() {
  return prisma.template.findMany({
    orderBy: { type: 'asc' },
  });
}

export async function updateTemplate(type: TemplateType, input: UpdateTemplateInput) {
  return prisma.template.update({
    where: { type },
    data: input,
  });
}

export async function resetToDefault(type: TemplateType) {
  const defaultTemplate = DEFAULT_TEMPLATES[type];
  return prisma.template.update({
    where: { type },
    data: {
      name: defaultTemplate.name,
      subject: defaultTemplate.subject,
      htmlContent: defaultTemplate.htmlContent,
    },
  });
}

export function processTemplate(html: string, context: TemplateContext): string {
  let result = html;

  const esc = escapeHtml;

  // Replace simple variables (escaped to prevent XSS)
  result = result.replace(/\{\{invoice\.invoiceNumber\}\}/g, esc(context.invoice.invoiceNumber));
  result = result.replace(/\{\{invoice\.createdAt\}\}/g, esc(context.invoice.createdAt));
  result = result.replace(/\{\{invoice\.dueDate\}\}/g, esc(context.invoice.dueDate));
  result = result.replace(/\{\{invoice\.subtotal\}\}/g, esc(context.invoice.subtotal));
  result = result.replace(/\{\{invoice\.taxRate\}\}/g, esc(context.invoice.taxRate));
  result = result.replace(/\{\{invoice\.taxAmount\}\}/g, esc(context.invoice.taxAmount));
  result = result.replace(/\{\{invoice\.total\}\}/g, esc(context.invoice.total));
  result = result.replace(/\{\{invoice\.notes\}\}/g, esc(context.invoice.notes));
  result = result.replace(/\{\{invoice\.sentAt\}\}/g, esc(context.invoice.sentAt));

  result = result.replace(/\{\{customer\.name\}\}/g, esc(context.customer.name));
  result = result.replace(/\{\{customer\.email\}\}/g, esc(context.customer.email));
  result = result.replace(/\{\{customer\.address\}\}/g, esc(context.customer.address));

  result = result.replace(/\{\{company\.name\}\}/g, esc(context.company.name));
  result = result.replace(/\{\{company\.email\}\}/g, esc(context.company.email));
  result = result.replace(/\{\{company\.phone\}\}/g, esc(context.company.phone));
  result = result.replace(/\{\{company\.address\}\}/g, esc(context.company.address));
  result = result.replace(/\{\{company\.logo\}\}/g, esc(context.company.logo));

  // lineItems is pre-built HTML, not user input — intentionally unescaped
  result = result.replace(/\{\{lineItems\}\}/g, context.lineItems);

  // Handle simple conditionals like {{#if company.logo}}...{{/if}}
  result = result.replace(/\{\{#if ([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, condition, content) => {
    const value = getNestedValue(context as unknown as Record<string, unknown>, condition.trim());
    return value ? content : '';
  });

  return result;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

export async function initializeDefaultTemplates(): Promise<void> {
  for (const [type, template] of Object.entries(DEFAULT_TEMPLATES)) {
    const existing = await prisma.template.findUnique({
      where: { type },
    });

    if (!existing) {
      await prisma.template.create({
        data: {
          type,
          name: template.name,
          subject: template.subject,
          htmlContent: template.htmlContent,
        },
      });
      console.log(`Created default template: ${type}`);
    }
  }
}

export function buildTemplateContext(
  invoice: {
    invoiceNumber: string;
    createdAt: Date;
    dueDate: Date | null;
    subtotal: number | { toString(): string };
    taxRate: number | { toString(): string };
    taxAmount: number | { toString(): string };
    total: number | { toString(): string };
    notes: string | null;
    sentAt: Date | null;
    customer: {
      name: string;
      email: string | null;
      address: string | null;
    };
    entries: Array<{
      entryDate: Date;
      taskDescription: string;
      totalMinutes: number;
      hourlyRateOverride?: number | { toString(): string } | null;
    }>;
    charges?: Array<{
      chargeDate: Date;
      description: string;
      quantity: number | { toString(): string };
      total: number | { toString(): string };
    }>;
  },
  settings: {
    companyName: string;
    companyEmail: string | null;
    companyPhone: string | null;
    companyAddress: string | null;
    companyLogo: string | null;
    invoiceTerms?: string;
  },
  baseUrl?: string
): TemplateContext {
  const toNum = (val: number | { toString(): string }): number =>
    typeof val === 'number' ? val : parseFloat(val.toString());

  const taxRateNum = toNum(invoice.taxRate);

  return {
    invoice: {
      invoiceNumber: invoice.invoiceNumber,
      createdAt: formatDateLong(invoice.createdAt),
      dueDate: invoice.dueDate ? formatDateLong(invoice.dueDate) : '',
      subtotal: formatCurrency(toNum(invoice.subtotal)),
      taxRate: taxRateNum > 0 ? `${(taxRateNum * 100).toFixed(1)}%` : '',
      taxAmount: formatCurrency(toNum(invoice.taxAmount)),
      total: formatCurrency(toNum(invoice.total)),
      notes: invoice.notes || settings.invoiceTerms || '',
      sentAt: invoice.sentAt ? formatDateLong(invoice.sentAt) : formatDateLong(invoice.createdAt),
    },
    customer: {
      name: invoice.customer.name,
      email: invoice.customer.email || '',
      address: invoice.customer.address || '',
    },
    company: {
      name: settings.companyName,
      email: settings.companyEmail || '',
      phone: settings.companyPhone || '',
      address: settings.companyAddress || '',
      logo: settings.companyLogo
        ? (baseUrl ? `${baseUrl}/uploads/logos/${settings.companyLogo}` : `/uploads/logos/${settings.companyLogo}`)
        : '',
    },
    lineItems: '', // Will be set by the caller
  };
}

export function buildLineItemsHtml(
  entries: Array<{
    entryDate: Date;
    taskDescription: string;
    totalMinutes: number;
    calculatedCost: number | { toString(): string };
  }>,
  charges: Array<{
    chargeDate: Date;
    description: string;
    quantity: number | { toString(): string };
    total: number | { toString(): string };
  }> = []
): string {
  const toNum = (val: number | { toString(): string }): number =>
    typeof val === 'number' ? val : parseFloat(val.toString());

  const formatShortDate = (date: Date) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  let html = `<table class="line-items">
    <thead>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th>Qty</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>`;

  for (const entry of entries) {
    const rawDesc = entry.taskDescription.length > 55
      ? entry.taskDescription.substring(0, 52) + '...'
      : entry.taskDescription;
    const desc = escapeHtml(rawDesc);
    html += `
      <tr>
        <td>${formatShortDate(entry.entryDate)}</td>
        <td>${desc}</td>
        <td class="qty">${formatDuration(entry.totalMinutes)}</td>
        <td class="amount">${formatCurrency(toNum(entry.calculatedCost))}</td>
      </tr>`;
  }

  for (const charge of charges) {
    const rawDesc = charge.description.length > 55
      ? charge.description.substring(0, 52) + '...'
      : charge.description;
    const desc = escapeHtml(rawDesc);
    const qty = toNum(charge.quantity);
    html += `
      <tr>
        <td>${formatShortDate(charge.chargeDate)}</td>
        <td>${desc}</td>
        <td class="qty">${qty === 1 ? '1' : qty}</td>
        <td class="amount">${formatCurrency(toNum(charge.total))}</td>
      </tr>`;
  }

  html += `
    </tbody>
  </table>`;

  return html;
}

export function getDefaultTemplate(type: TemplateType) {
  return DEFAULT_TEMPLATES[type];
}

export function getSampleContext(): TemplateContext {
  return {
    invoice: {
      invoiceNumber: 'INV-2024-001',
      createdAt: 'January 15, 2024',
      dueDate: 'February 14, 2024',
      subtotal: '$1,500.00',
      taxRate: '8.0%',
      taxAmount: '$120.00',
      total: '$1,620.00',
      notes: 'Payment due within 30 days. Thank you for your business!',
      sentAt: 'January 15, 2024',
    },
    customer: {
      name: 'Acme Corporation',
      email: 'billing@acme.com',
      address: '123 Business Ave\nSuite 100\nNew York, NY 10001',
    },
    company: {
      name: 'Your Company',
      email: 'invoices@yourcompany.com',
      phone: '(555) 123-4567',
      address: '456 Tech Blvd\nSan Francisco, CA 94102',
      logo: '/uploads/logos/sample-logo.png',
    },
    lineItems: `<table class="line-items">
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Qty</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1/10/24</td>
          <td>Website development - Homepage design</td>
          <td class="qty">4h</td>
          <td class="amount">$400.00</td>
        </tr>
        <tr>
          <td>1/11/24</td>
          <td>Website development - Backend API setup</td>
          <td class="qty">6h</td>
          <td class="amount">$600.00</td>
        </tr>
        <tr>
          <td>1/12/24</td>
          <td>Server configuration and deployment</td>
          <td class="qty">5h</td>
          <td class="amount">$500.00</td>
        </tr>
      </tbody>
    </table>`,
  };
}
