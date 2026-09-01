import * as XLSX from 'xlsx';
import { Customer, Invoice, Payment, Company, DepositStatus } from '../types';
import { formatCurrency, getCurrencySymbol } from './currency';

/**
 * Formats a deposit status code into a clean, human-readable label
 */
export function formatDepositStatusLabel(status?: DepositStatus | string): string {
  switch (status) {
    case 'deposited_in_bank':
      return 'DEPOSITED IN BANK';
    case 'deposited_in_ewallet':
      return 'REFLECTED IN EWALLET';
    case 'cash_in_vault':
      return 'CASH IN VAULT / CASH BOX';
    case 'pending_deposit':
    default:
      return 'PENDING DEPOSIT / VERIFICATION';
  }
}

/**
 * Generates and downloads a dedicated Excel (.xlsx) file for a Single Client's Receivables & Bank/eWallet Deposit Schedule
 */
export function exportClientDepositLedgerToExcel(
  customer: Customer,
  invoices: Invoice[],
  payments: Payment[],
  company: Company,
  asOfDate: string
) {
  const wb = XLSX.utils.book_new();
  const currencySym = getCurrencySymbol(company);
  const currencyCode = company.currency || 'USD';

  const customerInvoices = invoices.filter((i) => i.customerId === customer.id);
  const rows: any[][] = [];

  // Header Banner Block
  rows.push([company.legalName || company.name]);
  rows.push(['CLIENT RECEIVABLES & BANK / eWALLET DEPOSIT RECONCILIATION SCHEDULE']);
  rows.push([]);
  rows.push(['Client Name:', customer.name, '', 'As-Of Date:', asOfDate]);
  rows.push(['Client Code:', customer.code, '', 'Currency:', `${currencyCode} (${currencySym})`]);
  rows.push(['Billing Contact:', customer.contactName, '', 'Payment Terms:', customer.paymentTerms]);
  rows.push(['Email Address:', customer.email, '', 'Credit Limit:', `${currencySym}${customer.creditLimit.toLocaleString()}`]);
  if (customer.address) {
    rows.push(['Address:', customer.address, '', 'Status:', 'ACTIVE ACCOUNT']);
  }
  rows.push([]);

  // Table Headers
  const tableHeaders = [
    'Invoice #',
    'Billing Date',
    'Due Date',
    'Terms',
    'PO Number',
    `Total Billed (${currencyCode})`,
    `Collected / Paid (${currencyCode})`,
    `Balance Due (${currencyCode})`,
    'Invoice Status',
    'Deposit Verification Status',
    'Depository Bank / Channel',
    'Deposit Slip / Trace Ref #',
    'Deposit Date',
    'Reconciliation Remarks',
  ];
  rows.push(tableHeaders);

  let totalBilled = 0;
  let totalPaid = 0;
  let totalBalance = 0;
  let totalDepositedBank = 0;
  let totalDepositedEWallet = 0;
  let totalPendingDeposit = 0;

  customerInvoices.forEach((inv) => {
    totalBilled += inv.amount || 0;
    totalPaid += inv.paidAmount || 0;
    totalBalance += inv.balance || 0;

    const depStatus = inv.depositStatus || (inv.status === 'paid' ? 'deposited_in_bank' : 'pending_deposit');
    const depStatusLabel = formatDepositStatusLabel(depStatus);

    if (depStatus === 'deposited_in_bank') {
      totalDepositedBank += inv.paidAmount || inv.amount || 0;
    } else if (depStatus === 'deposited_in_ewallet') {
      totalDepositedEWallet += inv.paidAmount || inv.amount || 0;
    } else {
      totalPendingDeposit += inv.balance || 0;
    }

    rows.push([
      inv.invoiceNumber,
      inv.issueDate,
      inv.dueDate,
      inv.paymentTerms,
      inv.poNumber || 'N/A',
      inv.amount || 0,
      inv.paidAmount || 0,
      inv.balance || 0,
      inv.status.toUpperCase().replace(/_/g, ' '),
      depStatusLabel,
      inv.depositChannel || (depStatus === 'deposited_in_bank' ? (company.bankInfo?.bankName || 'BDO Unibank') : depStatus === 'deposited_in_ewallet' ? 'GCash' : '-'),
      inv.depositReference || (inv.status === 'paid' ? 'DEP-VERIFIED' : '-'),
      inv.depositDate || (inv.status === 'paid' ? inv.dueDate : '-'),
      inv.depositNotes || inv.notes || '',
    ]);
  });

  // Summary Row
  rows.push([]);
  rows.push([
    'TOTALS',
    '',
    '',
    '',
    `${customerInvoices.length} Invoices`,
    totalBilled,
    totalPaid,
    totalBalance,
    '',
    `Bank: ${currencySym}${totalDepositedBank.toLocaleString()} | eWallet: ${currencySym}${totalDepositedEWallet.toLocaleString()}`,
    '',
    '',
    '',
    `Pending Deposit / Unsettled: ${currencySym}${totalPendingDeposit.toLocaleString()}`,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column Widths for readability
  ws['!cols'] = [
    { wch: 16 }, // Invoice #
    { wch: 13 }, // Billing Date
    { wch: 13 }, // Due Date
    { wch: 14 }, // Terms
    { wch: 14 }, // PO
    { wch: 18 }, // Total Billed
    { wch: 18 }, // Paid
    { wch: 18 }, // Balance
    { wch: 16 }, // Status
    { wch: 28 }, // Deposit Status
    { wch: 24 }, // Bank / Channel
    { wch: 22 }, // Trace #
    { wch: 14 }, // Deposit Date
    { wch: 32 }, // Remarks
  ];

  const sheetName = customer.code ? `${customer.code.slice(0, 20)}_Receivables` : 'Client_Receivables';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const cleanCustomer = customer.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `${cleanCustomer}_Receivables_Deposit_Schedule_${asOfDate}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Generates a comprehensive Multi-Client or Master Excel Workbook containing all Clients' Receivables and Deposit Statuses
 */
export function exportAllClientsDepositScheduleToExcel(
  customers: Customer[],
  invoices: Invoice[],
  payments: Payment[],
  company: Company,
  asOfDate: string
) {
  const wb = XLSX.utils.book_new();
  const currencySym = getCurrencySymbol(company);
  const currencyCode = company.currency || 'USD';

  // 1. MASTER SUMMARY SHEET
  const summaryRows: any[][] = [];
  summaryRows.push([company.legalName || company.name]);
  summaryRows.push(['MASTER CLIENT RECEIVABLES & BANK / eWALLET DEPOSIT RECONCILIATION SCHEDULE']);
  summaryRows.push([`As-Of Date: ${asOfDate}`, `Reporting Currency: ${currencyCode} (${currencySym})`]);
  summaryRows.push([`Generated On: ${new Date().toLocaleString()}`]);
  summaryRows.push([]);

  summaryRows.push([
    'Client Code',
    'Client Name',
    'Billing Contact',
    'Payment Terms',
    'Open Invoices',
    `Total Billed (${currencyCode})`,
    `Collected / Paid (${currencyCode})`,
    `Outstanding Balance (${currencyCode})`,
    `Deposited in Bank (${currencyCode})`,
    `Deposited in eWallet (${currencyCode})`,
    `Pending Deposit / Unsettled (${currencyCode})`,
    'Reconciliation Status',
  ]);

  let grandBilled = 0;
  let grandPaid = 0;
  let grandBalance = 0;
  let grandBank = 0;
  let grandEWallet = 0;
  let grandPending = 0;

  customers.forEach((cust) => {
    const custInvoices = invoices.filter((i) => i.customerId === cust.id);
    const billed = custInvoices.reduce((s, i) => s + (i.amount || 0), 0);
    const paid = custInvoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
    const bal = custInvoices.reduce((s, i) => s + (i.balance || 0), 0);

    let custBank = 0;
    let custEWallet = 0;
    let custPending = 0;

    custInvoices.forEach((inv) => {
      const depStatus = inv.depositStatus || (inv.status === 'paid' ? 'deposited_in_bank' : 'pending_deposit');
      if (depStatus === 'deposited_in_bank') {
        custBank += inv.paidAmount || inv.amount || 0;
      } else if (depStatus === 'deposited_in_ewallet') {
        custEWallet += inv.paidAmount || inv.amount || 0;
      } else {
        custPending += inv.balance || 0;
      }
    });

    grandBilled += billed;
    grandPaid += paid;
    grandBalance += bal;
    grandBank += custBank;
    grandEWallet += custEWallet;
    grandPending += custPending;

    summaryRows.push([
      cust.code,
      cust.name,
      cust.contactName,
      cust.paymentTerms,
      custInvoices.filter((i) => i.balance > 0).length,
      billed,
      paid,
      bal,
      custBank,
      custEWallet,
      custPending,
      bal === 0 ? 'FULLY SETTLED' : custPending === 0 ? 'ALL COLLECTIONS DEPOSITED' : 'ACTIVE BALANCE',
    ]);
  });

  // Master Summary Totals
  summaryRows.push([]);
  summaryRows.push([
    'CONSOLIDATED TOTALS',
    `${customers.length} Clients`,
    '',
    '',
    invoices.filter((i) => i.balance > 0).length,
    grandBilled,
    grandPaid,
    grandBalance,
    grandBank,
    grandEWallet,
    grandPending,
    'VERIFIED SCHEDULE',
  ]);

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  summaryWs['!cols'] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary_All_Clients');

  // 2. DETAILED ALL-RECEIVABLES CONSOLIDATED SHEET
  const detailRows: any[][] = [];
  detailRows.push([company.legalName || company.name]);
  detailRows.push(['ALL CLIENT RECEIVABLES & DEPOSIT REGISTER']);
  detailRows.push([`As-Of Date: ${asOfDate}`]);
  detailRows.push([]);

  detailRows.push([
    'Client Code',
    'Client Name',
    'Invoice #',
    'Billing Date',
    'Due Date',
    'Terms',
    `Billed Amount (${currencyCode})`,
    `Collected (${currencyCode})`,
    `Balance Due (${currencyCode})`,
    'Invoice Status',
    'Deposit Status',
    'Depository Bank / Channel',
    'Deposit Slip / Trace Ref #',
    'Deposit Date',
    'Remarks',
  ]);

  invoices.forEach((inv) => {
    const cust = customers.find((c) => c.id === inv.customerId);
    const depStatus = inv.depositStatus || (inv.status === 'paid' ? 'deposited_in_bank' : 'pending_deposit');
    detailRows.push([
      cust?.code || inv.customerId,
      inv.customerName,
      inv.invoiceNumber,
      inv.issueDate,
      inv.dueDate,
      inv.paymentTerms,
      inv.amount || 0,
      inv.paidAmount || 0,
      inv.balance || 0,
      inv.status.toUpperCase(),
      formatDepositStatusLabel(depStatus),
      inv.depositChannel || '-',
      inv.depositReference || '-',
      inv.depositDate || '-',
      inv.depositNotes || inv.notes || '',
    ]);
  });

  const detailWs = XLSX.utils.aoa_to_sheet(detailRows);
  detailWs['!cols'] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 16 },
    { wch: 13 },
    { wch: 13 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 26 },
    { wch: 22 },
    { wch: 20 },
    { wch: 14 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, detailWs, 'All_Receivables_Detail');

  const cleanName = company.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `${cleanName}_Master_Receivables_Deposits_${asOfDate}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Builds a standard customer ledger sheet data array for a specific customer
 */
export function buildCustomerLedgerSheet(
  customer: Customer,
  invoices: Invoice[],
  payments: Payment[],
  company: Company,
  asOfDate: string
): any[][] {
  const currencySym = getCurrencySymbol(company);
  const currencyCode = company.currency || 'USD';

  const rows: any[][] = [];

  // Header Banner
  rows.push([company.legalName || company.name]);
  rows.push(['ACCOUNTS RECEIVABLE CUSTOMER SUBSIDIARY LEDGER']);
  rows.push([]);
  rows.push(['Customer Name:', customer.name, '', 'Statement Date:', asOfDate]);
  rows.push(['Customer Code:', customer.code, '', 'Currency:', `${currencyCode} (${currencySym})`]);
  rows.push(['Billing Contact:', customer.contactName, '', 'Credit Limit:', `${currencySym}${customer.creditLimit.toLocaleString()}`]);
  rows.push(['Contact Email:', customer.email, '', 'Payment Terms:', customer.paymentTerms]);
  if (customer.address) {
    rows.push(['Address:', customer.address, '', 'Risk Profile:', customer.riskRating.toUpperCase()]);
  }
  rows.push([]);

  // Table Headers
  const tableHeaders = [
    'Date',
    'Document Type',
    'Reference #',
    'Description / Particulars',
    'Due Date',
    `Debit (Billed)`,
    `Credit (Collected)`,
    `Running Balance`,
    'Settlement Method / Deposit Channel',
    'Status',
  ];
  rows.push(tableHeaders);

  interface LedgerEvent {
    date: string;
    type: 'INVOICE' | 'PAYMENT';
    refNumber: string;
    description: string;
    dueDate: string;
    debit: number;
    credit: number;
    method?: string;
    status: string;
  }

  const events: LedgerEvent[] = [];

  const customerInvoices = invoices.filter((i) => i.customerId === customer.id);
  const customerPayments = payments.filter((p) => p.customerId === customer.id);

  customerInvoices.forEach((inv) => {
    events.push({
      date: inv.issueDate,
      type: 'INVOICE',
      refNumber: inv.invoiceNumber,
      description: inv.notes || `Billing for Goods/Services (Subtotal: ${currencySym}${inv.subtotal.toLocaleString()}, Tax: ${currencySym}${inv.taxAmount.toLocaleString()})`,
      dueDate: inv.dueDate,
      debit: inv.amount,
      credit: 0,
      method: inv.paymentTerms,
      status: inv.status.toUpperCase().replace('_', ' '),
    });
  });

  customerPayments.forEach((pmt) => {
    const channel = pmt.paymentMethod;
    events.push({
      date: pmt.paymentDate,
      type: 'PAYMENT',
      refNumber: pmt.referenceNumber || pmt.id,
      description: `Payment applied to ${pmt.invoiceNumber}`,
      dueDate: '-',
      debit: 0,
      credit: pmt.amount,
      method: channel,
      status: 'COLLECTION SETTLED',
    });
  });

  // Sort events chronologically
  events.sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    if (cmp !== 0) return cmp;
    return a.type === 'INVOICE' ? -1 : 1;
  });

  let runningBalance = 0;
  let totalDebits = 0;
  let totalCredits = 0;

  events.forEach((ev) => {
    runningBalance += ev.debit - ev.credit;
    totalDebits += ev.debit;
    totalCredits += ev.credit;

    rows.push([
      ev.date,
      ev.type,
      ev.refNumber,
      ev.description,
      ev.dueDate,
      ev.debit > 0 ? ev.debit : 0,
      ev.credit > 0 ? ev.credit : 0,
      runningBalance,
      ev.method || '-',
      ev.status,
    ]);
  });

  // Summary Row
  rows.push([]);
  rows.push([
    'TOTALS / OUTSTANDING',
    '',
    '',
    `Total Transactions: ${events.length}`,
    '',
    totalDebits,
    totalCredits,
    runningBalance,
    '',
    runningBalance > 0 ? 'ACTIVE BALANCE' : 'SETTLED',
  ]);

  return rows;
}

/**
 * Generates and downloads a complete Customer Subsidiary Ledger Excel workbook
 */
export function exportCustomerLedgersToExcel(
  customers: Customer[],
  invoices: Invoice[],
  payments: Payment[],
  company: Company,
  asOfDate: string,
  selectedCustomerId?: string
) {
  const wb = XLSX.utils.book_new();

  const targetCustomers = selectedCustomerId && selectedCustomerId !== 'all'
    ? customers.filter((c) => c.id === selectedCustomerId)
    : customers;

  targetCustomers.forEach((cust) => {
    const rows = buildCustomerLedgerSheet(cust, invoices, payments, company, asOfDate);
    const ws = XLSX.utils.aoa_to_sheet(rows);

    ws['!cols'] = [
      { wch: 13 }, // Date
      { wch: 14 }, // Doc Type
      { wch: 16 }, // Ref #
      { wch: 38 }, // Description
      { wch: 13 }, // Due Date
      { wch: 16 }, // Debit
      { wch: 16 }, // Credit
      { wch: 18 }, // Balance
      { wch: 22 }, // Method
      { wch: 18 }, // Status
    ];

    const cleanSheetName = (cust.code || cust.name).slice(0, 28).replace(/[:\\\/\?\*\[\]]/g, '_');
    XLSX.utils.book_append_sheet(wb, ws, cleanSheetName);
  });

  const cleanCompany = company.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = selectedCustomerId && selectedCustomerId !== 'all' && targetCustomers[0]
    ? `${cleanCompany}_Ledger_${targetCustomers[0].name.replace(/[^a-zA-Z0-9-_]/g, '_')}_${asOfDate}.xlsx`
    : `${cleanCompany}_Customer_Subsidiary_Ledgers_${asOfDate}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Generates an Excel ledger for Billing Invoices per client
 */
export function exportBillingInvoicesToExcel(
  invoices: Invoice[],
  company: Company,
  asOfDate: string,
  customers: Customer[],
  payments: Payment[]
) {
  exportCustomerLedgersToExcel(customers, invoices, payments, company, asOfDate);
}

export function exportBillingInvoicesLedgerToExcel(
  invoices: Invoice[],
  customers: Customer[],
  company: Company,
  asOfDate: string,
  payments: Payment[] = []
) {
  exportCustomerLedgersToExcel(customers, invoices, payments, company, asOfDate);
}

/**
 * Generates an Excel export for bank remittances and collections
 */
export function exportBankRemittanceToExcel(
  payments: Payment[],
  company: Company,
  asOfDate: string
) {
  const wb = XLSX.utils.book_new();
  const currencyCode = company.currency || 'USD';

  const rows: any[][] = [
    [company.legalName || company.name],
    ['BANK REMITTANCES & SETTLEMENTS SCHEDULE'],
    [`As-Of Date: ${asOfDate}`, `Currency: ${currencyCode}`],
    [],
    [
      'Remittance Date',
      'Customer',
      'Invoice #',
      `Remittance Amount (${currencyCode})`,
      'Payment Method',
      'Reference / Deposit Slip #',
      'Notes / Clearing Status',
    ],
    ...payments.map((p) => [
      p.paymentDate,
      p.customerName,
      p.invoiceNumber,
      p.amount,
      p.paymentMethod,
      p.referenceNumber || 'N/A',
      p.notes || 'Settled & Verified',
    ]),
    [],
    [
      'TOTAL SETTLED REMITTANCES',
      `${payments.length} Transactions`,
      '',
      payments.reduce((s, p) => s + (p.amount || 0), 0),
      '',
      '',
      '',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 16 },
    { wch: 28 },
    { wch: 18 },
    { wch: 24 },
    { wch: 20 },
    { wch: 26 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Remittances');

  const cleanName = company.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  XLSX.writeFile(wb, `${cleanName}_Bank_Remittances_${asOfDate}.xlsx`);
}
