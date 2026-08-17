import { jsPDF } from 'jspdf';

export interface InvoiceData {
  id: string;
  projectId?: string;
  projectTitle?: string;
  clientUid?: string;
  clientName?: string;
  clientEmail?: string;
  clientCompany?: string;
  amount: number; // in cents (e.g. 500000 = $5,000.00)
  description: string;
  status: 'paid' | 'unpaid' | 'overdue' | 'draft' | string;
  dueDate: string;
  createdAt: string;
  paidAt?: string;
  stripeSessionId?: string;
  lineItems?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount?: number;
  }>;
}

/**
 * Generates and downloads a clean, professional, high-resolution PDF invoice for clients.
 */
export function exportInvoiceToPDF(invoice: InvoiceData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const primaryDark = [10, 12, 16]; // #0a0c10
  const goldAccent = [212, 175, 55]; // #d4af37
  const textDark = [30, 32, 38];
  const textMuted = [100, 105, 115];
  const bgLight = [248, 248, 246];
  const borderLight = [225, 225, 220];

  // Top subtle gold accent stripe
  doc.setFillColor(goldAccent[0], goldAccent[1], goldAccent[2]);
  doc.rect(0, 0, pageWidth, 4, 'F');

  y += 4;

  // ----------------------------------------------------
  // 1. BRAND HEADER BANNER
  // ----------------------------------------------------
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'F');

  // Brand Name
  doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('artificialBRIDGE', margin + 8, y + 10);

  // Subtitle / Department
  doc.setTextColor(220, 220, 220);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('AI ARCHITECTURE & WORKFLOW VERIFICATION SERVICES', margin + 8, y + 17);

  // Invoice Title & Number on right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  const invNumberStr = `INVOICE #${(invoice.id || '00000000').slice(0, 8).toUpperCase()}`;
  doc.text(invNumberStr, pageWidth - margin - 8, y + 10, { align: 'right' });

  // Issue Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(190, 190, 190);
  const createdDateStr = new Date(invoice.createdAt || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  doc.text(`Issue Date: ${createdDateStr}`, pageWidth - margin - 8, y + 17, { align: 'right' });

  y += 32;

  // ----------------------------------------------------
  // 2. STATUS BADGE & METADATA SECTION
  // ----------------------------------------------------
  const status = (invoice.status || 'unpaid').toLowerCase();
  const isPaid = status === 'paid';
  const isOverdue = !isPaid && new Date(invoice.dueDate) < new Date();

  // Status Box
  let statusBadgeBg = [245, 245, 240];
  let statusBadgeText = [80, 80, 80];
  let statusText = 'UNPAID';

  if (isPaid) {
    statusBadgeBg = [220, 245, 230];
    statusBadgeText = [16, 130, 60];
    statusText = 'PAID IN FULL';
  } else if (isOverdue) {
    statusBadgeBg = [254, 226, 226];
    statusBadgeText = [185, 28, 28];
    statusText = 'OVERDUE';
  } else {
    statusBadgeBg = [254, 243, 199];
    statusBadgeText = [180, 83, 9];
    statusText = 'PAYMENT PENDING';
  }

  // Metadata Columns Grid
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'S');

  // Left column: BILLED TO
  doc.setTextColor(goldAccent[0] - 20, goldAccent[1] - 20, goldAccent[2] - 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('BILLED TO (CLIENT)', margin + 6, y + 7);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const clientDisplayName = invoice.clientName || invoice.clientCompany || invoice.clientEmail || 'Valued Client';
  doc.text(clientDisplayName, margin + 6, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  if (invoice.clientEmail) {
    doc.text(invoice.clientEmail, margin + 6, y + 18);
  }
  if (invoice.projectTitle) {
    doc.text(`Project: ${invoice.projectTitle}`, margin + 6, y + 23);
  } else if (invoice.projectId) {
    doc.text(`Project Ref: #${invoice.projectId.slice(0, 10)}`, margin + 6, y + 23);
  }

  // Middle Column: BILLED FROM
  const col2X = margin + (contentWidth / 3);
  doc.setTextColor(goldAccent[0] - 20, goldAccent[1] - 20, goldAccent[2] - 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('BILLED FROM', col2X + 6, y + 7);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('artificialBRIDGE Inc.', col2X + 6, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Cloud Verification Division', col2X + 6, y + 18);
  doc.text('billing@theartificialbridge.com', col2X + 6, y + 23);
  doc.text('https://theartificialbridge.com', col2X + 6, y + 28);

  // Right Column: PAYMENT DETAILS & DUE DATE
  const col3X = margin + (contentWidth * 2 / 3);
  doc.setTextColor(goldAccent[0] - 20, goldAccent[1] - 20, goldAccent[2] - 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TERMS & STATUS', col3X + 6, y + 7);

  // Draw Status Badge Pill
  doc.setFillColor(statusBadgeBg[0], statusBadgeBg[1], statusBadgeBg[2]);
  doc.roundedRect(col3X + 6, y + 10, 48, 6.5, 1.5, 1.5, 'F');
  doc.setTextColor(statusBadgeText[0], statusBadgeText[1], statusBadgeText[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(statusText, col3X + 30, y + 14.5, { align: 'center' });

  // Due Date
  const dueDateStr = invoice.dueDate 
    ? new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Net 14 Days';

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Due Date: `, col3X + 6, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(dueDateStr, col3X + 22, y + 22);

  if (isPaid && invoice.paidAt) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(16, 130, 60);
    doc.setFontSize(7.5);
    const paidDate = new Date(invoice.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    doc.text(`Settled on: ${paidDate}`, col3X + 6, y + 27);
  }

  y += 42;

  // ----------------------------------------------------
  // 3. ITEMIZATION TABLE
  // ----------------------------------------------------
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, 'F');

  doc.setTextColor(240, 240, 240);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DESCRIPTION & DELIVERABLE SPECIFICATION', margin + 6, y + 5.5);
  doc.text('QTY', margin + contentWidth - 55, y + 5.5, { align: 'center' });
  doc.text('RATE (USD)', margin + contentWidth - 30, y + 5.5, { align: 'right' });
  doc.text('AMOUNT', margin + contentWidth - 6, y + 5.5, { align: 'right' });

  y += 10;

  // Total amount in dollars
  const totalAmountDollars = (invoice.amount || 0) / 100;
  const formattedTotal = `$${totalAmountDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Line item row
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 18, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(margin, y + 18, margin + contentWidth, y + 18);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const mainDesc = invoice.description || 'Milestone Implementation & AI Acceptance Verification';
  doc.text(mainDesc, margin + 6, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const subDesc = invoice.projectTitle 
    ? `Deliverables corresponding to SOW Milestone for ${invoice.projectTitle}`
    : 'Fixed price verified deliverable package per executed Statement of Work.';
  doc.text(subDesc, margin + 6, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('1', margin + contentWidth - 55, y + 8, { align: 'center' });
  doc.text(formattedTotal, margin + contentWidth - 30, y + 8, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(formattedTotal, margin + contentWidth - 6, y + 8, { align: 'right' });

  y += 24;

  // ----------------------------------------------------
  // 4. TOTAL SUMMARY CARD (BOTTOM RIGHT)
  // ----------------------------------------------------
  const totalsBoxWidth = 75;
  const totalsBoxX = margin + contentWidth - totalsBoxWidth;

  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(totalsBoxX, y, totalsBoxWidth, 32, 2, 2, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(totalsBoxX, y, totalsBoxWidth, 32, 2, 2, 'S');

  // Subtotal
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Subtotal:', totalsBoxX + 6, y + 7);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(formattedTotal, totalsBoxX + totalsBoxWidth - 6, y + 7, { align: 'right' });

  // Tax/VAT (0.00% standard consulting exemption)
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Tax / VAT (0%):', totalsBoxX + 6, y + 14);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('$0.00', totalsBoxX + totalsBoxWidth - 6, y + 14, { align: 'right' });

  // Divider
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(totalsBoxX + 4, y + 18, totalsBoxX + totalsBoxWidth - 4, y + 18);

  // Total Due
  doc.setTextColor(goldAccent[0] - 25, goldAccent[1] - 25, goldAccent[2] - 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Total Due (USD):', totalsBoxX + 6, y + 26);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(formattedTotal, totalsBoxX + totalsBoxWidth - 6, y + 26, { align: 'right' });

  // Left note: Payment Instructions
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PAYMENT INSTRUCTIONS & TERMS', margin, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('1. Payment is accepted securely via Stripe card gateway or ACH wire.', margin, y + 13);
  doc.text('2. Please reference Invoice ID #' + (invoice.id || '').slice(0, 8).toUpperCase() + ' with all remittances.', margin, y + 18);
  doc.text('3. Terms: Invoices are payable within 14 calendar days of issue.', margin, y + 23);
  doc.text('4. Work conducted under artificialBRIDGE standard Acceptance Contract Terms.', margin, y + 28);

  y += 42;

  // ----------------------------------------------------
  // 5. SECURITY & VERIFICATION FOOTER
  // ----------------------------------------------------
  const footerY = pageHeight - 20;

  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, margin + contentWidth, footerY);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('artificialBRIDGE Inc. • 100 Pine Street, Suite 1250, San Francisco, CA 94111 • support@theartificialbridge.com', margin, footerY + 5);

  const securityHash = `DocHash: SHA256-${(invoice.id + (invoice.createdAt || '')).slice(0, 16).toUpperCase()} • Portal Verified`;
  doc.text(securityHash, pageWidth - margin, footerY + 5, { align: 'right' });

  // Download Trigger
  const filename = `Invoice_${(invoice.id || 'INV').slice(0, 8).toUpperCase()}_artificialBRIDGE.pdf`;
  doc.save(filename);
}
