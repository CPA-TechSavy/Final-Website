import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, Customer, Company } from '../types';
import { getCurrencySymbol } from './currency';

export interface PDFExportOptions {
  invoice: Invoice;
  company: Company;
  customer?: Customer;
}

export type DemandLetterSeverity = 'friendly_reminder' | 'formal_demand' | 'urgent_warning' | 'final_legal_demand';

export interface DemandLetterExportOptions {
  customer: Customer;
  overdueInvoices: Invoice[];
  company: Company;
  asOfDate: string;
  severityLevel?: DemandLetterSeverity;
  customDeadlineDate?: string;
  signatoryName?: string;
  signatoryTitle?: string;
}

/**
 * Helper to get a safe currency prefix for jsPDF's built-in Helvetica font
 * Standard Helvetica in jsPDF does not have unicode '₱' (U+20B1), which causes crookedness/boxes.
 */
function getPdfSafeCurrencySymbol(company?: Company): string {
  const code = (company?.currency || 'USD').toUpperCase();
  if (code === 'PHP' || code.includes('PESO')) {
    return 'PHP ';
  }
  const sym = getCurrencySymbol(company);
  if (sym === '₱') {
    return 'PHP ';
  }
  return sym;
}

/**
 * Converts a live HTML preview document directly into a high-DPI crystal-clear A4 PDF.
 * This guarantees 100% exact visual fidelity with what the user sees in preview mode.
 */
export async function downloadElementAsPDF(
  element: HTMLElement,
  filename: string,
  options?: {
    marginMm?: number;
  }
): Promise<void> {
  const marginMm = options?.marginMm !== undefined ? options.marginMm : 8;

  const canvas = await html2canvas(element, {
    scale: 3, // 3x high-resolution capture for crisp vector-like text and borders
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1024,
    onclone: (clonedDoc) => {
      // Find the element in the cloned doc and remove any shadows/scrollbars for printing
      const clonedEl = (clonedDoc.getElementById(element.id) || clonedDoc.querySelector('[data-printable="true"]')) as HTMLElement;
      if (clonedEl) {
        clonedEl.style.boxShadow = 'none';
        clonedEl.style.borderRadius = '0px';
        clonedEl.style.margin = '0px';
        clonedEl.style.maxWidth = '100%';
        clonedEl.style.width = '100%';
      }
    },
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

  const printableWidth = pageWidth - marginMm * 2; // ~194mm
  const imgWidth = printableWidth;
  const imgHeight = (canvas.height * printableWidth) / canvas.width;

  if (imgHeight <= pageHeight - marginMm * 2) {
    // Fits neatly on a single page
    doc.addImage(imgData, 'JPEG', marginMm, marginMm, imgWidth, imgHeight);
  } else {
    // Multi-page proportional placement
    let heightLeft = imgHeight;
    let position = marginMm;

    doc.addImage(imgData, 'JPEG', marginMm, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - marginMm * 2);

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + marginMm;
      doc.addPage();
      doc.addImage(imgData, 'JPEG', marginMm, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - marginMm * 2);
    }
  }

  doc.save(filename);
}

/**
 * Generates and downloads a clean, highly legible, professional corporate Billing Invoice PDF (Vector fallback)
 */
export function generateBillingPDF({ invoice, company, customer }: PDFExportOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currencySym = getPdfSafeCurrencySymbol(company);
  const currencyCode = company.currency || 'USD';

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  const rightX = pageWidth - margin;

  // Professional Palette
  const navyPrimary = [15, 39, 68]; // #0F2744 - Deep Executive Navy
  const textDark = [30, 41, 59]; // #1E293B - Slate 800
  const textMuted = [71, 85, 105]; // #475569 - Slate 600
  const borderLight = [203, 213, 225]; // #CBD5E1 - Slate 300
  const bgSubtle = [248, 250, 252]; // #F8FAFC - Slate 50
  const emeraldDark = [6, 95, 70];
  const emeraldLight = [236, 253, 245];
  const redDark = [153, 27, 27];
  const redLight = [254, 242, 242];
  const amberDark = [146, 64, 14];
  const amberLight = [254, 243, 199];

  // 1. Top Decorative Brand Strip
  doc.setFillColor(navyPrimary[0], navyPrimary[1], navyPrimary[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Company Brand & Document Title
  let y = 14;

  // Left: Company Information
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(navyPrimary[0], navyPrimary[1], navyPrimary[2]);
  doc.text(company.name || 'ACME GLOBAL ENTERPRISES', margin, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);

  let compY = y + 9;
  if (company.legalName && company.legalName !== company.name) {
    doc.text(`Legal Entity: ${company.legalName}`, margin, compY);
    compY += 4;
  }
  const taxIdText = company.taxId ? `Tax ID / TIN: ${company.taxId}` : 'Tax ID / TIN: 984-210-004-000';
  doc.text(taxIdText, margin, compY);
  compY += 4;

  const address = company.address || 'Financial Center, Commercial Business District';
  const addressLines = doc.splitTextToSize(address, 100);
  doc.text(addressLines[0] || '', margin, compY);
  compY += 4;

  const contactLine = `${company.email || 'billing@company.com'} ${company.phone ? '• ' + company.phone : ''}`;
  doc.text(contactLine, margin, compY);

  // Right: Document Title & Invoice Number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(navyPrimary[0], navyPrimary[1], navyPrimary[2]);
  doc.text('BILLING INVOICE', rightX, y + 4, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, rightX, y + 9.5, { align: 'right' });

  // Status Badge on Right
  let statusText = 'ISSUED & DUE';
  let badgeFill = [239, 246, 255];
  let badgeTextCol = [29, 78, 216];

  if (invoice.status === 'paid' || invoice.balance <= 0) {
    statusText = 'PAID IN FULL';
    badgeFill = emeraldLight;
    badgeTextCol = emeraldDark;
  } else if (invoice.status === 'partially_paid') {
    statusText = `PARTIALLY PAID (${currencySym}${Number(invoice.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })})`;
    badgeFill = amberLight;
    badgeTextCol = amberDark;
  } else if (invoice.status === 'overdue' || (invoice.overdueDays || 0) > 0) {
    statusText = `OVERDUE (+${invoice.overdueDays || 0} DAYS)`;
    badgeFill = redLight;
    badgeTextCol = redDark;
  } else if (invoice.status === 'disputed') {
    statusText = 'UNDER DISPUTE';
    badgeFill = amberLight;
    badgeTextCol = amberDark;
  }

  const badgeW = 56;
  const badgeH = 6.5;
  doc.setFillColor(badgeFill[0], badgeFill[1], badgeFill[2]);
  doc.roundedRect(rightX - badgeW, y + 13, badgeW, badgeH, 1.5, 1.5, 'F');
  doc.setDrawColor(badgeTextCol[0], badgeTextCol[1], badgeTextCol[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(rightX - badgeW, y + 13, badgeW, badgeH, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(badgeTextCol[0], badgeTextCol[1], badgeTextCol[2]);
  doc.text(statusText, rightX - badgeW / 2, y + 17.5, { align: 'center' });

  // Horizontal Divider Line
  y = Math.max(compY + 5, y + 24);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, y, rightX, y);

  // 3. Two-Column Metadata Box: Customer Billed To vs Invoice Terms
  y += 5;
  const colGap = 6;
  const colW = (contentWidth - colGap) / 2; // 88mm
  const boxH = 34;

  // Box 1: Billed To
  doc.setFillColor(bgSubtle[0], bgSubtle[1], bgSubtle[2]);
  doc.roundedRect(margin, y, colW, boxH, 2, 2, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, colW, boxH, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(navyPrimary[0], navyPrimary[1], navyPrimary[2]);
  doc.text('BILLED TO (REGISTERED CLIENT):', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const custName = doc.splitTextToSize(invoice.customerName || 'Valued Corporate Client', colW - 8);
  doc.text(custName[0] || '', margin + 4, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const emailLine = doc.splitTextToSize(`Email: ${invoice.customerEmail || customer?.email || 'accounts@client.com'}`, colW - 8);
  doc.text(emailLine[0] || '', margin + 4, y + 16);
  doc.text(`Contact Person: ${customer?.contactName || 'Accounts Payable'}`, margin + 4, y + 20.5);
  doc.text(`Client Code: ${customer?.code || invoice.customerId || 'CUST-001'}`, margin + 4, y + 25);
  const custAddr = doc.splitTextToSize(customer?.address || 'Registered Address on File', colW - 8);
  doc.text(custAddr[0] || '', margin + 4, y + 29.5);

  // Box 2: Invoice Schedule & Terms
  const rightBoxX = margin + colW + colGap;
  doc.setFillColor(bgSubtle[0], bgSubtle[1], bgSubtle[2]);
  doc.roundedRect(rightBoxX, y, colW, boxH, 2, 2, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(rightBoxX, y, colW, boxH, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(navyPrimary[0], navyPrimary[1], navyPrimary[2]);
  doc.text('INVOICE TERMS & SCHEDULE:', rightBoxX + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  doc.text('Billing Issue Date:', rightBoxX + 4, y + 11);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.issueDate, rightBoxX + 38, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.text('Payment Due Date:', rightBoxX + 4, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(redDark[0], redDark[1], redDark[2]);
  doc.text(invoice.dueDate, rightBoxX + 38, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Payment Terms:', rightBoxX + 4, y + 20.5);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.paymentTerms || 'Net 30 Days', rightBoxX + 38, y + 20.5);

  doc.setFont('helvetica', 'normal');
  doc.text('Purchase Order (PO):', rightBoxX + 4, y + 25);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.poNumber || 'N/A (Standard)', rightBoxX + 38, y + 25);

  doc.setFont('helvetica', 'normal');
  doc.text('Currency:', rightBoxX + 4, y + 29.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${currencyCode} (${currencySym.trim()})`, rightBoxX + 38, y + 29.5);

  // 4. Line Items Table Header
  y += boxH + 6;

  const headerH = 7;
  doc.setFillColor(navyPrimary[0], navyPrimary[1], navyPrimary[2]);
  doc.rect(margin, y, contentWidth, headerH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  const colItem = margin + 3;
  const colDesc = margin + 12;
  const colQty = margin + 114;
  const colRate = margin + 144;
  const colAmount = rightX - 3;

  doc.text('#', colItem, y + 4.8);
  doc.text('Description / Deliverable Particulars', colDesc, y + 4.8);
  doc.text('Qty', colQty, y + 4.8, { align: 'center' });
  doc.text(`Unit Price (${currencySym.trim()})`, colRate, y + 4.8, { align: 'right' });
  doc.text(`Total (${currencySym.trim()})`, colAmount, y + 4.8, { align: 'right' });

  // 5. Line Items Rows
  y += headerH;
  const items = invoice.items && invoice.items.length > 0 ? invoice.items : [
    { id: '1', description: 'Professional Services & Commercial Deliverables', quantity: 1, unitPrice: invoice.amount || 0, amount: invoice.amount || 0 }
  ];

  items.forEach((item, index) => {
    const rowH = 7;
    const isEven = index % 2 === 0;

    if (isEven) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(bgSubtle[0], bgSubtle[1], bgSubtle[2]);
    }
    doc.rect(margin, y, contentWidth, rowH, 'F');

    // Bottom row separator
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, y + rowH, rightX, y + rowH);

    // Number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text((index + 1).toString(), colItem, y + 4.8);

    // Description
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    const maxDescWidth = 96;
    const descText = item.description || 'Deliverable Item';
    const splitDesc = doc.splitTextToSize(descText, maxDescWidth);
    doc.text(splitDesc[0], colDesc, y + 4.8);

    // Qty
    doc.setFont('helvetica', 'normal');
    doc.text(item.quantity.toString(), colQty, y + 4.8, { align: 'center' });

    // Rate
    doc.text(
      Number(item.unitPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      colRate,
      y + 4.8,
      { align: 'right' }
    );

    // Amount
    doc.setFont('helvetica', 'bold');
    doc.text(
      Number(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      colAmount,
      y + 4.8,
      { align: 'right' }
    );

    y += rowH;
  });

  // 6. Summary Totals & Bank/eWallet Settlement Section
  y += 5;
  const startSummaryY = y;

  const totalsWidth = 78;
  const totalsLeft = rightX - totalsWidth;
  const notesWidth = contentWidth - totalsWidth - 6;

  // Subtotal & Tax values
  const subtotal = Number(invoice.subtotal || invoice.amount || 0);
  const taxRate = invoice.taxRate !== undefined ? Number(invoice.taxRate) : 0.12;
  const taxAmount = invoice.taxAmount !== undefined ? Number(invoice.taxAmount) : subtotal * taxRate;
  const totalAmount = Number(invoice.amount || (subtotal + taxAmount));
  const paidAmount = Number(invoice.paidAmount || 0);
  const balance = invoice.balance !== undefined ? Number(invoice.balance) : Math.max(0, totalAmount - paidAmount);

  // Right Side Totals
  let curTotalsY = startSummaryY;

  // Subtotal line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Subtotal:', totalsLeft + 4, curTotalsY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`${currencySym}${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, rightX, curTotalsY + 4, { align: 'right' });
  curTotalsY += 5;

  // Tax line
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const taxLabel = taxRate === 0 ? 'Sales Tax (0% Exempt):' : `Value Added Tax (${(taxRate * 100).toFixed(1)}%):`;
  doc.text(taxLabel, totalsLeft + 4, curTotalsY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`${currencySym}${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, rightX, curTotalsY + 4, { align: 'right' });
  curTotalsY += 5;

  // Total Billed Divider
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.line(totalsLeft, curTotalsY + 1, rightX, curTotalsY + 1);
  curTotalsY += 3;

  // Gross Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(navyPrimary[0], navyPrimary[1], navyPrimary[2]);
  doc.text('Total Invoice Amount:', totalsLeft + 4, curTotalsY + 3.5);
  doc.text(`${currencySym}${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, rightX, curTotalsY + 3.5, { align: 'right' });
  curTotalsY += 5.5;

  // Payments Credited
  if (paidAmount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
    doc.text('Payments Received (-):', totalsLeft + 4, curTotalsY + 3.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`-${currencySym}${paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, rightX, curTotalsY + 3.5, { align: 'right' });
    curTotalsY += 5.5;
  }

  // Net Balance Due Banner Box
  doc.setFillColor(navyPrimary[0], navyPrimary[1], navyPrimary[2]);
  doc.roundedRect(totalsLeft, curTotalsY + 1.5, totalsWidth, 9.5, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('BALANCE DUE:', totalsLeft + 4, curTotalsY + 7.5);
  doc.setFontSize(10.5);
  doc.text(`${currencySym}${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, rightX - 3, curTotalsY + 7.5, { align: 'right' });

  // Left Side: Depository & eWallet Remittance Instructions
  const remBoxH = 44;
  doc.setFillColor(bgSubtle[0], bgSubtle[1], bgSubtle[2]);
  doc.roundedRect(margin, startSummaryY, notesWidth, remBoxH, 2, 2, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, startSummaryY, notesWidth, remBoxH, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(navyPrimary[0], navyPrimary[1], navyPrimary[2]);
  doc.text('OFFICIAL PAYMENT & DEPOSIT INSTRUCTIONS', margin + 4, startSummaryY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  const b = company.bankInfo;
  const w = company.eWalletInfo;

  let rY = startSummaryY + 11;
  doc.text(`• Bank: ${b?.bankName || 'BDO Unibank / Corporate Account'}`, margin + 4, rY);
  rY += 4.2;
  doc.text(`• Account Name: ${b?.accountName || company.legalName || company.name}`, margin + 4, rY);
  rY += 4.2;
  doc.text(`• Account No: ${b?.accountNumber || '0012-3456-7890'} | SWIFT: ${b?.routingOrSwift || 'CORP33'}`, margin + 4, rY);
  rY += 4.2;

  if (w && w.accountNumber) {
    doc.text(`• eWallet: ${w.walletType || 'GCash / Maya'} - ${w.accountNumber} (${w.accountName || company.name})`, margin + 4, rY);
  } else {
    doc.text(`• eWallet (GCash / Maya): ${company.phone || '0917-882-9102'}`, margin + 4, rY);
  }
  rY += 4.2;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navyPrimary[0], navyPrimary[1], navyPrimary[2]);
  doc.text(`• Reference: Please quote ${invoice.invoiceNumber} on your deposit slip.`, margin + 4, rY);

  // 7. Footer Certification & Security Hash
  const footerY = pageHeight - 12;
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, rightX, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(
    `Official corporate invoice generated by ${company.name} (${company.code}) on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
    margin,
    footerY + 3.8
  );

  doc.text(
    `Ref: ${invoice.invoiceNumber} | Page 1 of 1`,
    rightX,
    footerY + 3.8,
    { align: 'right' }
  );

  return doc;
}

/**
 * Downloads the PDF directly with standardized file naming
 */
export function downloadBillingPDF(options: PDFExportOptions): void {
  const doc = generateBillingPDF(options);
  const cleanNumber = options.invoice.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
  const cleanCustomer = (options.invoice.customerName || 'Client').replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `${cleanNumber}_${cleanCustomer}_Billing_Invoice.pdf`;
  doc.save(filename);
}

/**
 * Generates a formal Demand Letter PDF
 */
export function generateDemandLetterPDF(options: DemandLetterExportOptions): jsPDF {
  const { customer, overdueInvoices, company, asOfDate } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currencySym = getPdfSafeCurrencySymbol(company);
  const currencyCode = company.currency || 'USD';

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const rightX = pageWidth - margin;

  // Colors
  const navyPrimary = [15, 39, 68];
  const redPrimary = [153, 27, 27];
  const amberPrimary = [180, 83, 9];
  const textDark = [30, 41, 59];
  const textMuted = [71, 85, 105];
  const borderLight = [203, 213, 225];
  const bgSubtle = [248, 250, 252];

  const totalOverdue = overdueInvoices.reduce((s, i) => s + (i.balance || 0), 0);
  const maxOverdueDays = overdueInvoices.reduce((max, i) => Math.max(max, i.overdueDays || 0), 0);

  let severity = options.severityLevel;
  if (!severity) {
    if (maxOverdueDays >= 90 || totalOverdue >= 50000) {
      severity = 'final_legal_demand';
    } else if (maxOverdueDays >= 60) {
      severity = 'urgent_warning';
    } else if (maxOverdueDays >= 30) {
      severity = 'formal_demand';
    } else {
      severity = 'friendly_reminder';
    }
  }

  let letterTitle = 'PAST-DUE ACCOUNTS RECEIVABLE STATEMENT & REMINDER';
  let bannerColor = navyPrimary;
  let deadlineDays = 7;
  let demandToneText = '';

  if (severity === 'final_legal_demand') {
    letterTitle = 'FINAL STATUTORY DEMAND FOR IMMEDIATE PAYMENT PRIOR TO LEGAL ACTION';
    bannerColor = redPrimary;
    deadlineDays = 5;
    demandToneText = `This letter serves as our FINAL STATUTORY DEMAND for full settlement of delinquent accounts receivable. Despite previous notices, your account remains overdue by up to ${maxOverdueDays} days. Failure to remit payment in full within ${deadlineDays} business days will leave our executive management with no alternative but to refer this matter to corporate legal counsel for litigation and credit bureau reporting.`;
  } else if (severity === 'urgent_warning') {
    letterTitle = 'URGENT NOTICE OF ACCOUNT DEFAULT & CREDIT SUSPENSION WARNING';
    bannerColor = redPrimary;
    deadlineDays = 5;
    demandToneText = `Our accounting records indicate that the invoices itemized below have exceeded credit terms by ${maxOverdueDays} days and remain unpaid. As a consequence, your credit facility is subject to immediate suspension. Please remit the total demanded balance within ${deadlineDays} business days.`;
  } else if (severity === 'formal_demand') {
    letterTitle = 'FORMAL SECOND NOTICE OF DELINQUENT RECEIVABLES & DEMAND FOR PAYMENT';
    bannerColor = amberPrimary;
    deadlineDays = 7;
    demandToneText = `We are writing to formally follow up regarding outstanding overdue receivables. As of ${asOfDate}, your balance of ${currencySym}${totalOverdue.toLocaleString('en-US', { minimumFractionDigits: 2 })} is past due by up to ${maxOverdueDays} days. Please arrange settlement within ${deadlineDays} calendar days.`;
  } else {
    letterTitle = 'STATEMENT OF OVERDUE ACCOUNT & SETTLEMENT REMINDER';
    bannerColor = navyPrimary;
    deadlineDays = 10;
    demandToneText = `This is a friendly notification regarding open invoices currently past due on your corporate ledger. We value our relationship and would appreciate your assistance in processing settlement for the items listed below within ${deadlineDays} business days.`;
  }

  // 1. Top Severity Header Bar
  doc.setFillColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Corporate Letterhead
  let y = 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(navyPrimary[0], navyPrimary[1], navyPrimary[2]);
  doc.text(company.name || 'ACME GLOBAL ENTERPRISES', margin, y + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`${company.legalName || company.name} • Tax ID / TIN: ${company.taxId || '984-210-004'}`, margin, y + 7.5);
  doc.text(`${company.address || 'Corporate Headquarters'} • ${company.email || 'finance@company.com'}`, margin, y + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Date: ${asOfDate}`, rightX, y + 3, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Ref: DEMAND-${customer.code}-${new Date().getFullYear()}`, rightX, y + 7.5, { align: 'right' });

  y += 15;
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, y, rightX, y);

  // 3. Addressee Block
  y += 5;
  doc.setFillColor(bgSubtle[0], bgSubtle[1], bgSubtle[2]);
  doc.roundedRect(margin, y, contentWidth, 22, 1.5, 1.5, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 22, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  doc.text('DELIVERED TO (ACCOUNT HOLDER & ACCOUNTS PAYABLE):', margin + 4, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(customer.name, margin + 4, y + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Attention: ${customer.contactName || 'Finance Controller'} • Email: ${customer.email}`, margin + 4, y + 14);
  doc.text(`Address: ${customer.address || 'On File'} • Customer Code: ${customer.code}`, margin + 4, y + 18);

  // 4. Formal Notice Banner
  y += 26;
  doc.setFillColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  doc.roundedRect(margin, y, contentWidth, 7.5, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(letterTitle, margin + contentWidth / 2, y + 5.2, { align: 'center' });

  // 5. Formal Demand Statement Body
  y += 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  const splitTone = doc.splitTextToSize(demandToneText, contentWidth);
  doc.text(splitTone, margin, y);
  y += splitTone.length * 4.2 + 4;

  // 6. Itemized Table of Delinquent Invoices
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(navyPrimary[0], navyPrimary[1], navyPrimary[2]);
  doc.text('SCHEDULE OF DELINQUENT OVERDUE INVOICES:', margin, y);
  y += 3;

  const thH = 6;
  doc.setFillColor(navyPrimary[0], navyPrimary[1], navyPrimary[2]);
  doc.rect(margin, y, contentWidth, thH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  const tCol1 = margin + 3;
  const tCol2 = margin + 32;
  const tCol3 = margin + 62;
  const tCol4 = margin + 92;
  const tCol5 = margin + 120;
  const tCol6 = rightX - 3;

  doc.text('Invoice #', tCol1, y + 4.2);
  doc.text('Billing Date', tCol2, y + 4.2);
  doc.text('Due Date', tCol3, y + 4.2);
  doc.text('Overdue Days', tCol4, y + 4.2);
  doc.text(`Total Billed (${currencySym.trim()})`, tCol5, y + 4.2, { align: 'right' });
  doc.text(`Outstanding Due (${currencySym.trim()})`, tCol6, y + 4.2, { align: 'right' });

  y += thH;

  overdueInvoices.forEach((inv, idx) => {
    const rowH = 6;
    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(bgSubtle[0], bgSubtle[1], bgSubtle[2]);
    }
    doc.rect(margin, y, contentWidth, rowH, 'F');
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, y + rowH, rightX, y + rowH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(navyPrimary[0], navyPrimary[1], navyPrimary[2]);
    doc.text(inv.invoiceNumber, tCol1, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(inv.issueDate, tCol2, y + 4.2);
    doc.text(inv.dueDate, tCol3, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(redPrimary[0], redPrimary[1], redPrimary[2]);
    doc.text(`+${inv.overdueDays || 0} days`, tCol4, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }), tCol5, y + 4.2, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(redPrimary[0], redPrimary[1], redPrimary[2]);
    doc.text(inv.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }), tCol6, y + 4.2, { align: 'right' });

    y += rowH;
  });

  // Totals Row
  y += 2;
  doc.setFillColor(bgSubtle[0], bgSubtle[1], bgSubtle[2]);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setDrawColor(navyPrimary[0], navyPrimary[1], navyPrimary[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 7, rightX, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(navyPrimary[0], navyPrimary[1], navyPrimary[2]);
  doc.text(`TOTAL OVERDUE DEMANDED (${currencyCode}):`, margin + 4, y + 4.8);
  doc.setFontSize(10);
  doc.setTextColor(redPrimary[0], redPrimary[1], redPrimary[2]);
  doc.text(`${currencySym}${totalOverdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, rightX - 3, y + 4.8, { align: 'right' });

  // 7. Settlement Instructions & Deadline Notice
  y += 11;
  const payBoxH = 26;
  doc.setFillColor(bgSubtle[0], bgSubtle[1], bgSubtle[2]);
  doc.roundedRect(margin, y, contentWidth, payBoxH, 1.5, 1.5, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, payBoxH, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  doc.text(`SETTLEMENT INSTRUCTIONS & MANDATORY DEADLINE:`, margin + 4, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  const b = company.bankInfo;
  const w = company.eWalletInfo;
  doc.text(`• Depository Bank: ${b?.bankName || 'BDO Unibank'} • Account: ${b?.accountNumber || '0012-3456-7890'} (${b?.accountName || company.name})`, margin + 4, y + 9);
  if (w && w.accountNumber) {
    doc.text(`• Digital eWallet: ${w.walletType || 'GCash / Maya'} - ${w.accountNumber} (${w.accountName || company.name})`, margin + 4, y + 13.5);
  } else {
    doc.text(`• Digital eWallet (GCash / Maya): ${company.phone || '0917-882-9102'}`, margin + 4, y + 13.5);
  }

  const deadlineDate = options.customDeadlineDate || new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(redPrimary[0], redPrimary[1], redPrimary[2]);
  doc.text(`• FINAL PAYMENT DEADLINE: On or before ${deadlineDate} (${deadlineDays} Business Days).`, margin + 4, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`• Send proof of deposit to: ${company.email || 'billing@company.com'} quoting Ref: ${customer.code}.`, margin + 4, y + 22.5);

  // 8. Signature Block
  y += payBoxH + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Sincerely,', margin, y + 3.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(navyPrimary[0], navyPrimary[1], navyPrimary[2]);
  doc.text(options.signatoryName || 'John Suarez, CPA', margin, y + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(options.signatoryTitle || 'Lead Auditor & Controller, Accounts Receivable & Recovery', margin, y + 14.5);
  doc.text(company.name, margin, y + 18.5);

  // 9. Footer
  const fY = pageHeight - 11;
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, fY, rightX, fY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Official Demand Notice generated under commercial credit governance standards • ${company.name}`, margin, fY + 3.5);
  doc.text(`Security Code: AR-DEMAND-${customer.code}`, rightX, fY + 3.5, { align: 'right' });

  return doc;
}

export function downloadDemandLetterPDF(options: DemandLetterExportOptions): void {
  const doc = generateDemandLetterPDF(options);
  const cleanCustomer = options.customer.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `Demand_Letter_${cleanCustomer}_${options.asOfDate}.pdf`;
  doc.save(filename);
}
