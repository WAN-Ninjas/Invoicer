import puppeteer from 'puppeteer';
import { getSettings } from './settings.service.js';
import { getInvoiceWithDetails } from './invoice.service.js';
import {
  getTemplate,
  getDefaultTemplate,
  processTemplate,
  buildTemplateContext,
  buildLineItemsHtml,
} from './template.service.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function generateInvoicePdf(invoiceId: string): Promise<Buffer> {
  const invoice = await getInvoiceWithDetails(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const settings = await getSettings();

  // Get PDF template
  const template = await getTemplate('invoice_pdf') || getDefaultTemplate('invoice_pdf');

  // Build template context
  const context = buildTemplateContext(invoice, settings);

  // Build line items HTML
  const charges = (invoice as { charges?: Array<{ chargeDate: Date; description: string; quantity: number; total: number }> }).charges || [];
  context.lineItems = buildLineItemsHtml(
    invoice.entries.map((e) => ({
      entryDate: e.entryDate,
      taskDescription: e.taskDescription,
      totalMinutes: e.totalMinutes,
      calculatedCost: e.calculatedCost,
    })),
    charges.map((c) => ({
      chargeDate: c.chargeDate,
      description: c.description,
      quantity: c.quantity,
      total: c.total,
    }))
  );

  // Handle company logo - convert to base64 data URI for PDF
  if (settings.companyLogo) {
    const logoPath = join(__dirname, '../../uploads/logos', settings.companyLogo);
    if (existsSync(logoPath)) {
      try {
        const logoBuffer = readFileSync(logoPath);
        const ext = settings.companyLogo.split('.').pop()?.toLowerCase() || 'png';
        const mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        context.company.logo = `data:${mimeType};base64,${logoBuffer.toString('base64')}`;
      } catch {
        context.company.logo = '';
      }
    }
  }

  // Process template
  const processedHtml = processTemplate(template.htmlContent, context);

  // Generate PDF with Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  let page;
  try {
    page = await browser.newPage();
    await page.setContent(processedHtml, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px',
      },
    });

    return Buffer.from(pdf);
  } finally {
    try { await page?.close(); } catch { /* ignore */ }
    await browser.close();
  }
}
