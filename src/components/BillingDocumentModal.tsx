import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Printer,
  Mail,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Building2,
  Calendar,
  DollarSign,
  Landmark,
  Smartphone,
  Info,
  Sparkles,
} from 'lucide-react';
import { Invoice, Customer } from '../types';
import { useReceivables } from '../context/ReceivablesContext';
import { downloadElementAsPDF, downloadBillingPDF } from '../utils/pdfGenerator';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';

interface BillingDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onOpenSendEmail?: (invoice: Invoice) => void;
}

export const BillingDocumentModal: React.FC<BillingDocumentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onOpenSendEmail,
}) => {
  const { currentCompany, customers, sendBillingEmail } = useReceivables();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingQuickEmail, setIsSendingQuickEmail] = useState(false);
  const [quickEmailSent, setQuickEmailSent] = useState(false);
  const previewDocRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoice) return null;

  const customer: Customer = customers.find((c) => c.id === invoice.customerId) || {
    id: invoice.customerId,
    name: invoice.customerName,
    email: invoice.customerEmail || 'billing@client.com',
    contactName: 'Accounts Payable Manager',
    phone: '+63 917 800 1234',
    address: 'Registered Commercial Address on File',
    code: 'CUST',
    creditLimit: 50000,
    paymentTerms: invoice.paymentTerms,
    riskRating: 'low' as const,
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const cleanNumber = invoice.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      const cleanCustomer = (invoice.customerName || 'Client').replace(/[^a-zA-Z0-9-_]/g, '_');
      const filename = `${cleanNumber}_${cleanCustomer}_Billing_Invoice.pdf`;

      if (previewDocRef.current) {
        // High-DPI export of the exact on-screen rendered preview document
        await downloadElementAsPDF(previewDocRef.current, filename, { marginMm: 8 });
      } else {
        // Vector fallback
        downloadBillingPDF({
          invoice,
          company: currentCompany,
          customer,
        });
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      // Fallback in case of rendering exception
      downloadBillingPDF({
        invoice,
        company: currentCompany,
        customer,
      });
    } finally {
      setTimeout(() => setIsDownloading(false), 500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleQuickSendEmail = async () => {
    setIsSendingQuickEmail(true);
    try {
      await sendBillingEmail(invoice.id, {
        recipientEmail: invoice.customerEmail || customer.email,
        recipientName: invoice.customerName || customer.contactName || customer.name,
        subject: `Official Billing Invoice ${invoice.invoiceNumber} - ${currentCompany.legalName || currentCompany.name}`,
        message: `Please find attached the official PDF billing statement for your account (Invoice #${invoice.invoiceNumber}) in the amount of ${formatCurrency(balance, currentCompany)}.`,
        attachPdf: true,
      });
      setQuickEmailSent(true);
      setTimeout(() => setQuickEmailSent(false), 4000);
    } catch (err) {
      console.error('Failed to send billing email:', err);
    } finally {
      setIsSendingQuickEmail(false);
    }
  };

  const subtotal = Number(invoice.subtotal || invoice.amount || 0);
  const taxRate = invoice.taxRate !== undefined ? Number(invoice.taxRate) : 0.12;
  const taxAmount = invoice.taxAmount !== undefined ? Number(invoice.taxAmount) : subtotal * taxRate;
  const totalAmount = Number(invoice.amount || subtotal + taxAmount);
  const paidAmount = Number(invoice.paidAmount || 0);
  const balance = invoice.balance !== undefined ? Number(invoice.balance) : Math.max(0, totalAmount - paidAmount);

  const bank = currentCompany.bankInfo;
  const wallet = currentCompany.eWalletInfo;
  const currencySymbol = getCurrencySymbol(currentCompany);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full p-4 sm:p-5 shadow-2xl border border-slate-200 my-auto max-h-[95vh] flex flex-col">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  Billing Document: {invoice.invoiceNumber}
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  Official Corporate Statement
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Client: <strong className="text-slate-700">{invoice.customerName}</strong> ({invoice.customerEmail || customer.email})
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? 'Generating Crisp PDF...' : 'Download PDF'}</span>
            </button>

            {onOpenSendEmail ? (
              <button
                onClick={() => {
                  onClose();
                  onOpenSendEmail(invoice);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Email Client</span>
              </button>
            ) : (
              <button
                onClick={handleQuickSendEmail}
                disabled={isSendingQuickEmail}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>{isSendingQuickEmail ? 'Sending...' : quickEmailSent ? 'Email Dispatched!' : 'Email Client'}</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Print Document"
            >
              <Printer className="w-4 h-4 text-slate-500" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 ml-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Email Sent Banner */}
        {quickEmailSent && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2 rounded-lg mt-2 flex items-center justify-between shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                Billing invoice successfully dispatched to <strong>{invoice.customerEmail || customer.email}</strong>!
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Dispatched Now</span>
          </div>
        )}

        {/* Scrollable Container with the Printable Invoice Document */}
        <div className="mt-3 overflow-y-auto flex-1 pr-1 bg-slate-200/70 p-3 sm:p-5 rounded-lg border border-slate-300">
          {/* Printable Invoice DOM Component (Target for html2canvas & live preview) */}
          <div
            id="billing-invoice-preview-document"
            ref={previewDocRef}
            data-printable="true"
            className="bg-white rounded-lg shadow-sm border border-slate-300 p-6 sm:p-8 max-w-[760px] mx-auto text-slate-900 text-xs space-y-5 select-text"
          >
            {/* Top Navy Accent Bar */}
            <div className="h-1.5 bg-[#0F2744] -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 mb-5 rounded-t-lg" />

            {/* Document Header Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b-2 border-slate-800">
              <div className="space-y-1 max-w-[65%] min-w-0">
                <span className="text-[11px] font-black tracking-widest text-[#0F2744] uppercase block">
                  {currentCompany.name || 'ACME ENTERPRISES'}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-none">
                  BILLING INVOICE
                </h1>
                {currentCompany.legalName && currentCompany.legalName !== currentCompany.name && (
                  <p className="text-[11px] text-slate-600 font-medium">
                    Legal Entity: <strong className="text-slate-800">{currentCompany.legalName}</strong>
                  </p>
                )}
                <p className="text-[11px] text-slate-600">
                  Tax ID / TIN: <strong className="text-slate-800">{currentCompany.taxId || '984-210-004-000'}</strong>
                </p>
                <p className="text-[11px] text-slate-600 break-words">
                  {currentCompany.address || 'Financial Commercial Center, Manila, Philippines'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {currentCompany.email || 'billing@company.com'} {currentCompany.phone ? `• ${currentCompany.phone}` : ''}
                </p>
              </div>

              <div className="sm:text-right space-y-1 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-md w-full sm:w-auto border sm:border-0 border-slate-200 shrink-0">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invoice Identifier</div>
                <div className="text-lg font-mono font-black text-[#0F2744]">
                  {invoice.invoiceNumber}
                </div>
                <div>
                  <span className={`inline-block px-2.5 py-0.5 rounded text-[10.5px] font-bold border ${
                    invoice.status === 'paid' || balance <= 0
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : invoice.status === 'partially_paid'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : (invoice.overdueDays || 0) > 0
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-blue-50 text-blue-800 border-blue-300'
                  }`}>
                    {invoice.status === 'paid' || balance <= 0
                      ? 'PAID IN FULL'
                      : invoice.status === 'partially_paid'
                      ? 'PARTIALLY PAID'
                      : (invoice.overdueDays || 0) > 0
                      ? `PAST DUE (${invoice.overdueDays} DAYS)`
                      : 'ISSUED & DUE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Two-Column Metadata Box: Customer Billed To vs Invoice Terms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Billed To Box */}
              <div className="bg-slate-50/90 p-3.5 rounded-lg border border-slate-200 space-y-1 min-w-0 overflow-hidden">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#0F2744] block">
                  BILLED TO (REGISTERED CUSTOMER):
                </span>
                <div className="text-sm font-black text-slate-950 truncate">
                  {invoice.customerName}
                </div>
                <div className="text-[11px] text-slate-700 break-words">
                  Email: <strong className="text-blue-700">{invoice.customerEmail || customer.email}</strong>
                </div>
                {customer.contactName && (
                  <div className="text-[11px] text-slate-600">
                    Attention: <strong>{customer.contactName}</strong>
                  </div>
                )}
                <div className="text-[11px] text-slate-500">
                  Client ID: <strong className="font-mono text-slate-700">{customer.code || invoice.customerId}</strong>
                </div>
                <div className="text-[11px] text-slate-500 break-words line-clamp-2">
                  {customer.address || 'Registered Commercial Address on File'}
                </div>
              </div>

              {/* Billing Schedule & Terms Box */}
              <div className="bg-slate-50/90 p-3.5 rounded-lg border border-slate-200 space-y-1.5 text-[11px] min-w-0 overflow-hidden">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#0F2744] block">
                  INVOICE SCHEDULE & TERMS:
                </span>
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-slate-600">Billing Date:</span>
                  <strong className="text-slate-900 font-mono">{invoice.issueDate}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Payment Due Date:</span>
                  <strong className="text-rose-700 font-mono font-bold">{invoice.dueDate}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Payment Terms:</span>
                  <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                    {invoice.paymentTerms || 'Net 30'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Purchase Order (PO):</span>
                  <strong className="text-slate-900 font-mono">{invoice.poNumber || 'N/A'}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Currency:</span>
                  <strong className="text-slate-900 font-mono">{currentCompany.currency || 'PHP'} ({currencySymbol})</strong>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-hidden rounded-lg border border-slate-300">
              <table className="w-full text-left border-collapse table-fixed text-[11px]">
                <thead>
                  <tr className="bg-[#0F2744] text-white text-[10px] uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-3 w-[7%] text-center">#</th>
                    <th className="py-2.5 px-3 w-[47%]">Item Description</th>
                    <th className="py-2.5 px-3 w-[11%] text-center">Qty</th>
                    <th className="py-2.5 px-3 w-[17%] text-right">Unit Price</th>
                    <th className="py-2.5 px-3 w-[18%] text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item, idx) => (
                      <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}>
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 break-words leading-tight">
                          {item.description}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-700 font-mono">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800 whitespace-nowrap">
                          {formatCurrency(item.unitPrice || 0, currentCompany)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-950 whitespace-nowrap">
                          {formatCurrency(item.amount || 0, currentCompany)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 px-3 text-center text-slate-400 italic">
                        Commercial Deliverables and Professional Services on Record
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals & Tax Breakdown + Remittance Instructions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-1">
              {/* Remittance & Bank / eWallet Info Box */}
              <div className="bg-slate-50/90 p-3.5 rounded-lg border border-slate-200 space-y-2 text-[11px] min-w-0 overflow-hidden">
                <div>
                  <div className="font-bold text-[#0F2744] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-blue-700" />
                    <span>Official Remittance & Bank Depository:</span>
                  </div>
                  <div className="text-slate-600">Bank: <strong className="text-slate-900">{bank?.bankName || 'BDO Unibank / Corporate Depository'}</strong></div>
                  <div className="text-slate-600">Account Name: <strong className="text-slate-900">{bank?.accountName || currentCompany.legalName || currentCompany.name}</strong></div>
                  <div className="text-slate-600">Account No: <strong className="font-mono text-slate-950 font-bold">{bank?.accountNumber || '0092-4820-1920'}</strong></div>
                  <div className="text-slate-600">Routing / SWIFT: <strong className="font-mono text-slate-800">{bank?.routingOrSwift || 'CHASUS33'}</strong></div>
                </div>

                {/* eWallet Transfer info */}
                {wallet && wallet.accountNumber && (
                  <div className="pt-2 border-t border-slate-200">
                    <div className="font-bold text-purple-900 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-purple-700" />
                      <span>e-Wallet Transfer ({wallet.walletType || 'GCash / Maya'}):</span>
                    </div>
                    <div className="text-slate-600">Account Name: <strong className="text-slate-900">{wallet.accountName || currentCompany.name}</strong></div>
                    <div className="text-slate-600">Mobile / Acct No: <strong className="font-mono text-purple-950 font-bold">{wallet.accountNumber}</strong></div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 text-slate-600">
                  <div>Payment Reference: <strong className="text-[#0F2744] font-mono font-bold">{invoice.invoiceNumber}</strong></div>
                  {currentCompany.paymentInstructions ? (
                    <div className="text-[10px] text-slate-500 mt-1 italic break-words">{currentCompany.paymentInstructions}</div>
                  ) : (
                    <div className="text-[10px] text-slate-500 mt-1">Please quote the invoice number on your deposit slip / wire advice.</div>
                  )}
                </div>
              </div>

              {/* Financial Calculation Summary */}
              <div className="bg-slate-50/90 p-3.5 rounded-lg border border-slate-200 space-y-2 text-xs min-w-0 overflow-hidden">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold text-slate-900 whitespace-nowrap">
                    {formatCurrency(subtotal || 0, currentCompany)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Value Added Tax ({(taxRate * 100).toFixed(1)}%):</span>
                  <span className="font-mono font-semibold text-slate-900 whitespace-nowrap">
                    {formatCurrency(taxAmount || 0, currentCompany)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-950 pt-1.5 border-t border-slate-300 font-bold">
                  <span>Total Billed Amount:</span>
                  <span className="font-mono text-sm whitespace-nowrap">
                    {formatCurrency(totalAmount || 0, currentCompany)}
                  </span>
                </div>

                {paidAmount > 0 && (
                  <div className="flex justify-between items-center text-emerald-700 font-semibold">
                    <span>Payments Received:</span>
                    <span className="font-mono whitespace-nowrap">
                      -{formatCurrency(paidAmount, currentCompany)}
                    </span>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-[#0F2744] text-white flex justify-between items-center font-bold shadow-xs">
                  <span className="text-xs uppercase tracking-wide">Balance Due:</span>
                  <span className="font-mono text-base font-black whitespace-nowrap">
                    {formatCurrency(balance, currentCompany)}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Footer */}
            <div className="pt-3 border-t border-slate-300 text-center text-[9.5px] text-slate-500 space-y-0.5">
              <p>
                Thank you for your business. For billing inquiries, contact <strong className="text-slate-700">{currentCompany.email || 'billing@company.com'}</strong>
              </p>
              <p className="font-mono text-slate-400">
                Ref: {invoice.invoiceNumber} • Certified Corporate Statement • Page 1 of 1
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500">
            Downloaded PDF retains the exact formatting, alignment, and corporate branding seen in preview mode.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
