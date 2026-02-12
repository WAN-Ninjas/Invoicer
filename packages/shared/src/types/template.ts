export type TemplateType = 'invoice_email' | 'reminder_email' | 'invoice_pdf';

export interface Template {
  id: string;
  type: TemplateType;
  name: string;
  subject: string | null;
  htmlContent: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateTemplateInput {
  name?: string;
  subject?: string | null;
  htmlContent?: string;
}

export interface TemplatePreviewInput {
  htmlContent: string;
}

export const TEMPLATE_VARIABLES = [
  { key: '{{invoice.invoiceNumber}}', description: 'Invoice number' },
  { key: '{{invoice.createdAt}}', description: 'Invoice date (formatted)' },
  { key: '{{invoice.dueDate}}', description: 'Due date (formatted)' },
  { key: '{{invoice.subtotal}}', description: 'Subtotal' },
  { key: '{{invoice.taxRate}}', description: 'Tax rate %' },
  { key: '{{invoice.taxAmount}}', description: 'Tax amount' },
  { key: '{{invoice.total}}', description: 'Total amount' },
  { key: '{{invoice.notes}}', description: 'Invoice notes' },
  { key: '{{invoice.sentAt}}', description: 'Date invoice was sent' },
  { key: '{{customer.name}}', description: 'Customer name' },
  { key: '{{customer.email}}', description: 'Customer email' },
  { key: '{{customer.address}}', description: 'Customer address' },
  { key: '{{company.name}}', description: 'Company name' },
  { key: '{{company.email}}', description: 'Company email' },
  { key: '{{company.phone}}', description: 'Company phone' },
  { key: '{{company.address}}', description: 'Company address' },
  { key: '{{company.logo}}', description: 'Logo URL' },
  { key: '{{lineItems}}', description: 'Rendered line items table HTML' },
] as const;
