import PDFDocument from 'pdfkit';
import { getSettings } from './settings.service.js';
import { getInvoiceWithDetails } from './invoice.service.js';
import {
  formatCurrency,
  formatDuration,
  getEffectiveRate,
  calculateCost,
} from '@invoicer/shared';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Custom font paths - WAN Ninjas brand typography
const FONTS = {
  orbitronBold: join(__dirname, '../fonts/Orbitron-Bold.ttf'),
  orbitronMedium: join(__dirname, '../fonts/Orbitron-Medium.ttf'),
  interRegular: join(__dirname, '../fonts/extras/ttf/Inter-Regular.ttf'),
  interBold: join(__dirname, '../fonts/extras/ttf/Inter-Bold.ttf'),
};

// WAN Ninjas brand colors - FULL DARK THEME
const THEME = {
  bg: '#0b0e14',           // Main dark background
  card: '#161b22',         // Card/panel background (slightly lighter)
  accent: '#6366f1',       // Brand indigo/purple
  neonCyan: '#00f7ff',     // Bright cyan accent
  textLight: '#e6edf3',    // Primary light text
  textMuted: '#8b949e',    // Muted/secondary text
  border: '#30363d',       // Border color
  tableRowAlt: '#1c2128',  // Slightly lighter row for alternating
};

// Format date as MM/DD/YY
function formatShortDate(date: Date | string): string {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
}

export async function generateInvoicePdf(invoiceId: string): Promise<Buffer> {
  const invoice = await getInvoiceWithDetails(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const settings = await getSettings();

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 40, size: 'LETTER', autoFirstPage: false });

    // Register custom fonts (WAN Ninjas branding)
    doc.registerFont('Orbitron-Bold', FONTS.orbitronBold);
    doc.registerFont('Orbitron-Medium', FONTS.orbitronMedium);
    doc.registerFont('Inter', FONTS.interRegular);
    doc.registerFont('Inter-Bold', FONTS.interBold);

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // LETTER size dimensions (612 x 792 points)
    const letterWidth = 612;
    const letterHeight = 792;
    const pageWidth = letterWidth - 80;
    const leftMargin = 40;
    const rightEdge = letterWidth - 40;

    // Helper function to draw page background
    const drawPageBackground = () => {
      doc.rect(0, 0, letterWidth, letterHeight).fill(THEME.bg);
      doc.rect(0, 0, letterWidth, 5).fill(THEME.accent);
    };

    // Helper function to add a new page with dark background
    const addNewPage = () => {
      doc.addPage({ margin: 40, size: 'LETTER' });
      drawPageBackground();
    };

    // Add first page
    addNewPage();

    // === HEADER SECTION ===
    // Company logo - left side
    if (settings.companyLogo) {
      const logoPath = join(__dirname, '../../uploads/logos', settings.companyLogo);
      if (existsSync(logoPath)) {
        doc.image(logoPath, leftMargin, 15, { height: 55 });
      }
    }
    // Website link under logo
    doc.font('Orbitron-Medium').fontSize(8).fillColor(THEME.neonCyan);
    doc.text('wan-ninjas.com', leftMargin, 75);

    // Company info - right aligned
    doc.fillColor(THEME.textLight).font('Orbitron-Bold').fontSize(18);
    doc.text(settings.companyName, leftMargin, 20, {
      width: pageWidth,
      align: 'right'
    });

    // Address and contact - stacked properly
    doc.font('Orbitron-Medium').fontSize(9).fillColor(THEME.textMuted);
    let headerY = 42;

    if (settings.companyAddress) {
      // Split by newlines only, keep commas together (e.g., "Phoenix, AZ 85041" stays together)
      const addressLines = settings.companyAddress.split(/\n/).map((s: string) => s.trim()).filter(Boolean);
      for (const line of addressLines) {
        doc.text(line, leftMargin, headerY, { width: pageWidth, align: 'right' });
        headerY += 11;
      }
    }

    const contactLine = [settings.companyEmail, settings.companyPhone].filter(Boolean).join('  •  ');
    if (contactLine) {
      doc.text(contactLine, leftMargin, headerY, { width: pageWidth, align: 'right' });
    }

    // === INVOICE TITLE SECTION ===
    const infoSectionY = 110;

    // Invoice title
    doc.font('Orbitron-Bold').fontSize(32).fillColor(THEME.accent);
    doc.text('INVOICE', leftMargin, infoSectionY);

    // Invoice details
    doc.font('Orbitron-Medium').fontSize(10).fillColor(THEME.textMuted);
    doc.text(`#${invoice.invoiceNumber}`, leftMargin, infoSectionY + 50);
    doc.text(`Date: ${formatShortDate(invoice.createdAt)}`, leftMargin, infoSectionY + 64);
    if (invoice.dueDate) {
      doc.text(`Due: ${formatShortDate(invoice.dueDate)}`, leftMargin, infoSectionY + 78);
    }

    // === BILL TO BOX - Dark card style ===
    const billToX = 330;
    const billToWidth = rightEdge - billToX;
    const billToHeight = 95;

    // Card background with accent border
    doc.rect(billToX - 15, infoSectionY, billToWidth + 15, billToHeight).fill(THEME.card);
    doc.rect(billToX - 15, infoSectionY, 4, billToHeight).fill(THEME.accent);

    doc.font('Orbitron-Medium').fontSize(8).fillColor(THEME.accent);
    doc.text('BILL TO', billToX, infoSectionY + 10);

    doc.font('Orbitron-Bold').fontSize(11).fillColor(THEME.textLight);
    doc.text(invoice.customer.name, billToX, infoSectionY + 24);

    doc.font('Orbitron-Medium').fontSize(8).fillColor(THEME.textMuted);
    let billToY = infoSectionY + 38;
    if (invoice.customer.email) {
      doc.text(invoice.customer.email, billToX, billToY);
      billToY += 11;
    }
    if (invoice.customer.address) {
      doc.text(invoice.customer.address, billToX, billToY, { width: billToWidth - 15 });
    }

    // === LINE ITEMS TABLE ===
    const tableTop = 220;
    const rowHeight = 22;
    const colWidths = { date: 65, description: 300, duration: 60, amount: 65 };
    const maxContentY = letterHeight - 120; // Leave room for footer on last page
    const continuationTableTop = 50; // Where table starts on continuation pages

    // Helper function to draw table header
    const drawTableHeader = (y: number) => {
      doc.rect(leftMargin, y, pageWidth, 26).fill(THEME.card);
      doc.fillColor(THEME.textLight).font('Orbitron-Bold').fontSize(9);
      let xPos = leftMargin + 10;
      doc.text('DATE', xPos, y + 9);
      xPos += colWidths.date;
      doc.text('DESCRIPTION', xPos, y + 9);
      xPos += colWidths.description;
      doc.text('TIME', xPos, y + 9, { width: colWidths.duration, align: 'right' });
      xPos += colWidths.duration;
      doc.text('AMOUNT', xPos, y + 9, { width: colWidths.amount, align: 'right' });
      return y + 32; // Return Y position for first row
    };

    // Draw first page table header
    let rowY = drawTableHeader(tableTop);
    doc.font('Orbitron-Medium').fontSize(9);

    for (let i = 0; i < invoice.entries.length; i++) {
      // Check if we need a new page before drawing this row
      if (rowY + rowHeight > maxContentY) {
        addNewPage();
        // Draw "continued" indicator and table header on new page
        doc.font('Orbitron-Medium').fontSize(8).fillColor(THEME.textMuted);
        doc.text(`${invoice.invoiceNumber} - Continued`, leftMargin, 25);
        rowY = drawTableHeader(continuationTableTop);
        doc.font('Orbitron-Medium').fontSize(9);
      }

      const entry = invoice.entries[i];
      const effectiveRate = getEffectiveRate(entry, invoice, invoice.customer);
      const amount = calculateCost(entry.totalMinutes, effectiveRate);

      // Alternate row background
      if (i % 2 === 0) {
        doc.rect(leftMargin, rowY - 4, pageWidth, rowHeight).fill(THEME.tableRowAlt);
      }

      let xPos = leftMargin + 10;
      doc.fillColor(THEME.textLight);
      doc.text(formatShortDate(entry.entryDate), xPos, rowY + 2);
      xPos += colWidths.date;

      // Description - truncate if needed
      let desc = entry.taskDescription;
      if (desc.length > 55) desc = desc.substring(0, 52) + '...';
      doc.text(desc, xPos, rowY + 2, { width: colWidths.description - 5 });
      xPos += colWidths.description;

      doc.fillColor(THEME.textMuted);
      doc.text(formatDuration(entry.totalMinutes), xPos, rowY + 2, {
        width: colWidths.duration,
        align: 'right'
      });
      xPos += colWidths.duration;

      doc.fillColor(THEME.neonCyan).font('Orbitron-Bold');
      doc.text(formatCurrency(amount), xPos, rowY + 2, {
        width: colWidths.amount,
        align: 'right'
      });
      doc.font('Orbitron-Medium');

      rowY += rowHeight;
    }

    // Check if totals section needs a new page
    const totalsHeight = (invoice.taxRate > 0 ? 60 : 36) + 100; // Tax + total box + footer space
    if (rowY + totalsHeight > letterHeight - 40) {
      addNewPage();
      rowY = 50;
    }

    // Table bottom border
    doc.moveTo(leftMargin, rowY + 4).lineTo(rightEdge, rowY + 4)
      .strokeColor(THEME.border).lineWidth(1).stroke();

    // === TOTALS SECTION ===
    rowY += 25;
    const totalsX = rightEdge - 170;

    // Tax if applicable (no subtotal shown)
    if (invoice.taxRate > 0) {
      doc.font('Orbitron-Medium').fontSize(10).fillColor(THEME.textMuted);
      doc.text(`Tax (${(invoice.taxRate * 100).toFixed(1)}%):`, totalsX, rowY);
      doc.fillColor(THEME.textLight);
      doc.text(formatCurrency(invoice.taxAmount), totalsX + 80, rowY, { width: 90, align: 'right' });
      rowY += 25;
    }

    // Total box - card style with accent
    doc.rect(totalsX - 15, rowY - 8, 185, 36).fill(THEME.card);
    doc.rect(totalsX - 15, rowY - 8, 4, 36).fill(THEME.accent);

    doc.font('Orbitron-Bold').fontSize(14).fillColor(THEME.textLight);
    doc.text('TOTAL:', totalsX, rowY + 4);
    doc.fillColor(THEME.neonCyan);
    doc.text(formatCurrency(invoice.total), totalsX + 80, rowY + 4, { width: 90, align: 'right' });

    // === FOOTER ===
    const footerY = letterHeight - 80;

    // Footer divider
    doc.moveTo(leftMargin, footerY - 15).lineTo(rightEdge, footerY - 15)
      .strokeColor(THEME.border).lineWidth(0.5).stroke();

    // Terms on left
    if (settings.invoiceTerms) {
      doc.font('Orbitron-Bold').fontSize(8).fillColor(THEME.accent);
      doc.text('Terms & Conditions', leftMargin, footerY);
      doc.font('Orbitron-Medium').fontSize(8).fillColor(THEME.textMuted);
      doc.text(settings.invoiceTerms, leftMargin, footerY + 12, { width: pageWidth * 0.55 });
    }

    // Thank you on right
    doc.font('Orbitron-Bold').fontSize(10).fillColor(THEME.textLight);
    doc.text('Thank you for your business!', leftMargin, footerY, {
      width: pageWidth,
      align: 'right'
    });

    doc.end();
  });
}
